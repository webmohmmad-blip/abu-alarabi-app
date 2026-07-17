import { Router } from "express";
import { db } from "@workspace/db";
import {
  flashcardsTable,
  flashcardDecksTable,
  flashcardUserStateTable,
  flashcardReviewsTable,
  subjectsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { eq, and, desc, count, isNull, lte, sql } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

// ─── DECKS ────────────────────────────────────────────────────────────────────
router.get("/flashcard-decks", async (req, res) => {
  const userId = (req as any).userId;
  const { subjectId } = req.query as any;

  const conditions = [eq(flashcardDecksTable.createdBy, userId), isNull(flashcardDecksTable.deletedAt)];
  if (subjectId) conditions.push(eq(flashcardDecksTable.subjectId, parseInt(subjectId)));

  const decks = await db.select().from(flashcardDecksTable).where(and(...conditions)).orderBy(desc(flashcardDecksTable.createdAt));

  // Count cards and due cards per deck
  const enriched = await Promise.all(
    decks.map(async (d) => {
      const subject = await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, d.subjectId)).limit(1);
      const cardCount = await db.select({ count: count() }).from(flashcardsTable).where(and(eq(flashcardsTable.deckId, d.id), isNull(flashcardsTable.deletedAt)));
      const dueCount = await db
        .select({ count: count() })
        .from(flashcardUserStateTable)
        .where(and(
          eq(flashcardUserStateTable.userId, userId),
          sql`${flashcardUserStateTable.nextReviewAt} <= NOW()`,
          sql`EXISTS (SELECT 1 FROM ${flashcardsTable} WHERE ${flashcardsTable.id} = ${flashcardUserStateTable.flashcardId} AND ${flashcardsTable.deckId} = ${d.id})`
        ));

      return {
        id: d.id,
        title: d.title,
        description: d.description,
        subjectId: d.subjectId,
        subjectName: subject[0]?.name ?? "",
        cardCount: Number(cardCount[0]?.count ?? 0),
        dueCount: Number(dueCount[0]?.count ?? 0),
        masteredCount: 0,
        createdAt: d.createdAt,
      };
    })
  );

  res.json(enriched);
});

router.post("/flashcard-decks", async (req, res) => {
  const userId = (req as any).userId;
  const { title, description, subjectId } = req.body;

  if (!title || !subjectId) { res.status(400).json({ error: "title and subjectId required" }); return; }

  const [deck] = await db.insert(flashcardDecksTable).values({ title, description, subjectId, createdBy: userId }).returning();
  const subject = await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, subjectId)).limit(1);

  res.status(201).json({ ...deck, subjectName: subject[0]?.name ?? "", cardCount: 0, dueCount: 0, masteredCount: 0 });
});

// ─── FLASHCARDS ───────────────────────────────────────────────────────────────
router.get("/flashcards", async (req, res) => {
  const userId = (req as any).userId;
  const { subjectId, deckId, dueOnly } = req.query as any;

  const conditions = [eq(flashcardsTable.createdBy, userId), isNull(flashcardsTable.deletedAt)];
  if (subjectId) conditions.push(eq(flashcardsTable.subjectId, parseInt(subjectId)));
  if (deckId) conditions.push(eq(flashcardsTable.deckId, parseInt(deckId)));

  const cards = await db.select().from(flashcardsTable).where(and(...conditions)).orderBy(desc(flashcardsTable.createdAt));

  // Get user state for each card
  const enriched = await Promise.all(
    cards.map(async (c) => {
      const subject = await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, c.subjectId)).limit(1);
      const state = await db.select().from(flashcardUserStateTable).where(and(eq(flashcardUserStateTable.flashcardId, c.id), eq(flashcardUserStateTable.userId, userId))).limit(1);
      const deck = c.deckId ? await db.select({ title: flashcardDecksTable.title }).from(flashcardDecksTable).where(eq(flashcardDecksTable.id, c.deckId)).limit(1) : [];

      const s = state[0];
      if (dueOnly === "true" && s?.nextReviewAt && s.nextReviewAt > new Date()) return null;

      return {
        id: c.id,
        front: c.front,
        back: c.back,
        deckId: c.deckId,
        deckName: deck[0]?.title ?? null,
        subjectId: c.subjectId,
        subjectName: subject[0]?.name ?? "",
        cardType: c.cardType,
        difficulty: c.difficulty,
        masteryLevel: parseFloat(s?.masteryLevel ?? "0"),
        reviewCount: s?.reviewCount ?? 0,
        nextReviewAt: s?.nextReviewAt?.toISOString() ?? null,
        tags: c.tags ?? [],
        sourceNoteId: c.sourceNoteId,
        createdAt: c.createdAt,
      };
    })
  );

  res.json(enriched.filter(Boolean));
});

router.post("/flashcards", async (req, res) => {
  const userId = (req as any).userId;
  const { front, back, subjectId, deckId, cardType, difficulty, tags, sourceNoteId } = req.body;

  if (!front || !back || !subjectId) { res.status(400).json({ error: "front, back, subjectId required" }); return; }

  const [card] = await db.insert(flashcardsTable).values({ front, back, subjectId, deckId, cardType, difficulty, tags, sourceNoteId, createdBy: userId }).returning();
  const subject = await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, subjectId)).limit(1);

  res.status(201).json({
    ...card,
    subjectName: subject[0]?.name ?? "",
    deckName: null,
    masteryLevel: 0,
    reviewCount: 0,
    nextReviewAt: null,
    tags: card.tags ?? [],
  });
});

// ─── REVIEW ───────────────────────────────────────────────────────────────────
router.post("/flashcards/:id/review", async (req, res) => {
  const cardId = parseInt(req.params.id);
  const userId = (req as any).userId;
  const { rating, responseTimeSeconds } = req.body;

  if (!["forgot", "hard", "good", "easy"].includes(rating)) {
    res.status(400).json({ error: "Invalid rating" });
    return;
  }

  // SM-2-like algorithm
  const ratingMap: Record<string, number> = { forgot: 0, hard: 1, good: 3, easy: 5 };
  const q = ratingMap[rating];

  const currentState = await db.select().from(flashcardUserStateTable).where(and(eq(flashcardUserStateTable.flashcardId, cardId), eq(flashcardUserStateTable.userId, userId))).limit(1);

  let interval = 1, easeFactor = 2.5, masteryLevel = 0;
  if (currentState[0]) {
    const s = currentState[0];
    easeFactor = parseFloat(s.easeFactor as any) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);
    if (q < 3) {
      interval = 1;
    } else {
      interval = s.reviewCount === 0 ? 1 : s.reviewCount === 1 ? 6 : Math.round(s.interval * easeFactor);
    }
    masteryLevel = Math.min(1, Math.max(0, (q / 5)));
  }

  const nextReviewAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

  // Upsert user state
  const existing = currentState[0];
  if (existing) {
    await db.update(flashcardUserStateTable).set({
      masteryLevel: masteryLevel.toFixed(2),
      reviewCount: (existing.reviewCount ?? 0) + 1,
      lastRating: rating,
      lastReviewedAt: new Date(),
      nextReviewAt,
      interval,
      easeFactor: easeFactor.toFixed(2),
    }).where(and(eq(flashcardUserStateTable.flashcardId, cardId), eq(flashcardUserStateTable.userId, userId)));
  } else {
    await db.insert(flashcardUserStateTable).values({
      flashcardId: cardId,
      userId,
      masteryLevel: masteryLevel.toFixed(2),
      reviewCount: 1,
      lastRating: rating,
      lastReviewedAt: new Date(),
      nextReviewAt,
      interval,
      easeFactor: easeFactor.toFixed(2),
    });
  }

  // Log the review
  await db.insert(flashcardReviewsTable).values({ flashcardId: cardId, userId, rating, masteryLevel: masteryLevel.toFixed(2), nextReviewAt, responseTimeSeconds });

  const card = await db.select().from(flashcardsTable).where(eq(flashcardsTable.id, cardId)).limit(1);
  const subject = card[0]?.subjectId ? await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, card[0].subjectId)).limit(1) : [];

  res.json({
    id: cardId,
    front: card[0]?.front,
    back: card[0]?.back,
    deckId: card[0]?.deckId,
    deckName: null,
    subjectId: card[0]?.subjectId,
    subjectName: subject[0]?.name ?? "",
    cardType: card[0]?.cardType,
    difficulty: card[0]?.difficulty,
    masteryLevel,
    reviewCount: (existing?.reviewCount ?? 0) + 1,
    nextReviewAt: nextReviewAt.toISOString(),
    tags: card[0]?.tags ?? [],
    sourceNoteId: card[0]?.sourceNoteId,
    createdAt: card[0]?.createdAt,
  });
});

export default router;
