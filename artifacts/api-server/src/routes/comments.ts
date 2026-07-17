import { Router } from "express";
import { db } from "@workspace/db";
import {
  commentsTable,
  commentVotesTable,
  commentReportsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { eq, and, desc, asc, count, isNull, or } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

// ─── LIST COMMENTS ────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const {
    contentType,
    contentId,
    sort = "newest",
    page = "1",
    limit = "20",
  } = req.query as Record<string, string>;

  if (!contentType || !contentId) {
    res.status(400).json({ error: "contentType and contentId are required" });
    return;
  }

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [
    eq(commentsTable.contentType, contentType),
    eq(commentsTable.contentId, parseInt(contentId)),
    isNull(commentsTable.parentId), // Only top-level
    isNull(commentsTable.deletedAt),
    eq(commentsTable.isHidden, false),
  ];

  let orderBy: any;
  switch (sort) {
    case "oldest":
      orderBy = [asc(commentsTable.createdAt)];
      break;
    case "helpful":
      orderBy = [desc(commentsTable.helpfulCount)];
      break;
    default:
      orderBy = [desc(commentsTable.isAccepted), desc(commentsTable.isPinned), desc(commentsTable.createdAt)];
  }

  const [topLevelComments, totalResult] = await Promise.all([
    db
      .select()
      .from(commentsTable)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: count() }).from(commentsTable).where(and(...conditions)),
  ]);

  // Fetch replies for each top-level comment
  const enriched = await Promise.all(
    topLevelComments.map(async (c) => {
      const [author, replies] = await Promise.all([
        db.select({ fullName: usersTable.fullName, role: usersTable.role, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, c.authorId)).limit(1),
        db.select().from(commentsTable).where(and(eq(commentsTable.parentId, c.id), isNull(commentsTable.deletedAt), eq(commentsTable.isHidden, false))).orderBy(asc(commentsTable.createdAt)).limit(20),
      ]);

      const enrichedReplies = await Promise.all(
        replies.map(async (r) => {
          const rAuthor = await db.select({ fullName: usersTable.fullName, role: usersTable.role, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, r.authorId)).limit(1);
          return {
            ...r,
            authorName: rAuthor[0]?.fullName ?? "مجهول",
            authorRole: rAuthor[0]?.role ?? "student",
            authorAvatarUrl: rAuthor[0]?.avatarUrl ?? null,
            isTeacherReply: ["teacher", "admin", "super_admin"].includes(rAuthor[0]?.role ?? ""),
            replies: [],
            updatedAt: r.updatedAt ?? r.createdAt,
          };
        })
      );

      return {
        ...c,
        authorName: author[0]?.fullName ?? "مجهول",
        authorRole: author[0]?.role ?? "student",
        authorAvatarUrl: author[0]?.avatarUrl ?? null,
        isTeacherReply: ["teacher", "admin", "super_admin"].includes(author[0]?.role ?? ""),
        replies: enrichedReplies,
        updatedAt: c.updatedAt ?? c.createdAt,
      };
    })
  );

  res.json({
    items: enriched,
    total: Number(totalResult[0]?.count ?? 0),
    page: pageNum,
    limit: limitNum,
  });
});

// ─── CREATE COMMENT ───────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { text, contentType, contentId, commentType = "question" } = req.body;

  if (!text || !contentType || !contentId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Basic content filter — block phone numbers and social links
  const blocked = /(\+?9627|\bواتس\b|\bتيليجرام\b|@\w+|instagram|snapchat|telegram|whatsapp)/i;
  if (blocked.test(text)) {
    res.status(400).json({ error: "تم إخفاء جزء من التعليق لأنه يخالف سياسة المنصة" });
    return;
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({
      authorId: (req as any).userId,
      contentType,
      contentId: parseInt(contentId),
      commentType,
      text,
    })
    .returning();

  const author = await db.select({ fullName: usersTable.fullName, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, (req as any).userId)).limit(1);

  res.status(201).json({
    ...comment,
    authorName: author[0]?.fullName ?? "مجهول",
    authorRole: author[0]?.role ?? "student",
    authorAvatarUrl: null,
    isTeacherReply: ["teacher", "admin"].includes(author[0]?.role ?? ""),
    replies: [],
    updatedAt: comment.createdAt,
  });
});

// ─── UPDATE COMMENT ───────────────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { text } = req.body;
  const userId = (req as any).userId;

  const existing = await db.select().from(commentsTable).where(eq(commentsTable.id, id)).limit(1);
  if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }
  if (existing[0].authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db.update(commentsTable).set({ text, updatedAt: new Date() }).where(eq(commentsTable.id, id)).returning();
  const author = await db.select({ fullName: usersTable.fullName, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  res.json({
    ...updated,
    authorName: author[0]?.fullName ?? "مجهول",
    authorRole: author[0]?.role ?? "student",
    authorAvatarUrl: null,
    isTeacherReply: false,
    replies: [],
    updatedAt: updated.updatedAt ?? updated.createdAt,
  });
});

// ─── DELETE COMMENT ───────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = (req as any).userId;

  const existing = await db.select({ authorId: commentsTable.authorId }).from(commentsTable).where(eq(commentsTable.id, id)).limit(1);
  if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }
  if (existing[0].authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.update(commentsTable).set({ deletedAt: new Date() } as any).where(eq(commentsTable.id, id));
  res.status(204).send();
});

// ─── MARK HELPFUL ─────────────────────────────────────────────────────────────
router.post("/:id/helpful", async (req, res) => {
  const commentId = parseInt(req.params.id);
  const userId = (req as any).userId;

  const existing = await db.select({ id: commentVotesTable.id }).from(commentVotesTable).where(and(eq(commentVotesTable.commentId, commentId), eq(commentVotesTable.userId, userId))).limit(1);

  if (existing[0]) {
    await db.delete(commentVotesTable).where(and(eq(commentVotesTable.commentId, commentId), eq(commentVotesTable.userId, userId)));
    await db.update(commentsTable).set({ helpfulCount: db.$count(commentVotesTable, eq(commentVotesTable.commentId, commentId)) as any }).where(eq(commentsTable.id, commentId));
  } else {
    await db.insert(commentVotesTable).values({ commentId, userId });
    await db.update(commentsTable).set({ helpfulCount: db.$count(commentVotesTable, eq(commentVotesTable.commentId, commentId)) as any }).where(eq(commentsTable.id, commentId));
  }

  const count_result = await db.select({ cnt: count() }).from(commentVotesTable).where(eq(commentVotesTable.commentId, commentId));
  await db.update(commentsTable).set({ helpfulCount: Number(count_result[0]?.cnt ?? 0) }).where(eq(commentsTable.id, commentId));

  res.json({ success: true });
});

// ─── ACCEPT ANSWER ────────────────────────────────────────────────────────────
router.post("/:id/accept", async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = (req as any).userId;
  const userRole = (req as any).userRole;

  if (!["teacher", "admin", "super_admin"].includes(userRole)) {
    res.status(403).json({ error: "Only teachers can accept answers" });
    return;
  }

  // Unaccept all siblings first
  const comment = await db.select({ contentType: commentsTable.contentType, contentId: commentsTable.contentId }).from(commentsTable).where(eq(commentsTable.id, id)).limit(1);
  if (comment[0]) {
    await db.update(commentsTable).set({ isAccepted: false }).where(and(eq(commentsTable.contentType, comment[0].contentType), eq(commentsTable.contentId, comment[0].contentId)));
  }

  await db.update(commentsTable).set({ isAccepted: true }).where(eq(commentsTable.id, id));
  res.json({ success: true });
});

// ─── REPORT ───────────────────────────────────────────────────────────────────
router.post("/:id/report", async (req, res) => {
  const commentId = parseInt(req.params.id);
  const { reason, description } = req.body;
  const userId = (req as any).userId;

  await db.insert(commentReportsTable).values({ commentId, reporterId: userId, reason, description, status: "pending" });
  res.json({ success: true });
});

// ─── CREATE REPLY ─────────────────────────────────────────────────────────────
router.post("/:id/replies", async (req, res) => {
  const parentId = parseInt(req.params.id);
  const { text, commentType = "answer" } = req.body;

  if (!text) { res.status(400).json({ error: "Text required" }); return; }

  const parent = await db.select({ contentType: commentsTable.contentType, contentId: commentsTable.contentId }).from(commentsTable).where(eq(commentsTable.id, parentId)).limit(1);
  if (!parent[0]) { res.status(404).json({ error: "Parent comment not found" }); return; }

  const [reply] = await db.insert(commentsTable).values({
    authorId: (req as any).userId,
    contentType: parent[0].contentType,
    contentId: parent[0].contentId,
    parentId,
    commentType,
    text,
  }).returning();

  const author = await db.select({ fullName: usersTable.fullName, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, (req as any).userId)).limit(1);

  res.status(201).json({
    ...reply,
    authorName: author[0]?.fullName ?? "مجهول",
    authorRole: author[0]?.role ?? "student",
    authorAvatarUrl: null,
    isTeacherReply: ["teacher", "admin", "super_admin"].includes(author[0]?.role ?? ""),
    replies: [],
    updatedAt: reply.createdAt,
  });
});

export default router;
