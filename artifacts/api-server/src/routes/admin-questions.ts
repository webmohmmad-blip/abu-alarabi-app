/**
 * Admin routes for exam question management.
 * All routes are mounted under /admin (auth + role already applied by admin router).
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  examsTable,
  questionsTable,
  questionChoicesTable,
} from "@workspace/db";
import { eq, sql, and, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();
router.use(requireAuth);
router.use(requireRole(["admin", "super_admin"]));

// ─── LIST questions for an exam ───────────────────────────────────────────────
router.get("/exams/:examId/questions", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId);

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, examId))
    .orderBy(questionsTable.order);

  const withChoices = await Promise.all(
    questions.map(async (q) => {
      const choices = await db
        .select()
        .from(questionChoicesTable)
        .where(eq(questionChoicesTable.questionId, q.id))
        .orderBy(questionChoicesTable.order);
      return { ...q, choices };
    })
  );

  res.json(withChoices);
});

// ─── CREATE question ──────────────────────────────────────────────────────────
router.post("/exams/:examId/questions", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId);
  const {
    text, type, score, imageUrl, correctAnswer, explanation, choices,
  } = req.body as {
    text: string;
    type: string;
    score?: number;
    imageUrl?: string;
    correctAnswer?: string;
    explanation?: string;
    choices?: { choiceKey: string; text: string; imageUrl?: string; order?: number }[];
  };

  if (!text || !type) {
    res.status(400).json({ error: "نص السؤال ونوعه مطلوبان" });
    return;
  }

  // Get next order
  const maxOrder = await db
    .select({ m: sql<number>`COALESCE(MAX(${questionsTable.order}), 0)` })
    .from(questionsTable)
    .where(eq(questionsTable.examId, examId));
  const nextOrder = (maxOrder[0]?.m ?? 0) + 1;

  const [question] = await db
    .insert(questionsTable)
    .values({
      examId,
      text,
      type: type as any,
      score: score?.toString() ?? "1",
      imageUrl: imageUrl ?? null,
      correctAnswer: correctAnswer ?? null,
      explanation: explanation ?? null,
      order: nextOrder,
    })
    .returning();

  // Insert choices for MCQ / true_false / matching / ordering
  if (choices && choices.length > 0) {
    await db.insert(questionChoicesTable).values(
      choices.map((c, i) => ({
        questionId: question.id,
        choiceKey: c.choiceKey,
        text: c.text,
        imageUrl: c.imageUrl ?? null,
        order: c.order ?? i,
      }))
    );
  }

  // Update totalScore on exam
  await refreshExamScore(examId);

  res.status(201).json({ id: question.id, order: question.order });
});

// ─── UPDATE question ──────────────────────────────────────────────────────────
router.patch("/questions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { text, type, score, imageUrl, correctAnswer, explanation, order, choices } = req.body;

  await db
    .update(questionsTable)
    .set({
      ...(text !== undefined && { text }),
      ...(type !== undefined && { type }),
      ...(score !== undefined && { score: score.toString() }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(correctAnswer !== undefined && { correctAnswer }),
      ...(explanation !== undefined && { explanation }),
      ...(order !== undefined && { order }),
    })
    .where(eq(questionsTable.id, id));

  // Replace choices if provided
  if (choices !== undefined) {
    await db.delete(questionChoicesTable).where(eq(questionChoicesTable.questionId, id));
    if (choices.length > 0) {
      await db.insert(questionChoicesTable).values(
        choices.map((c: any, i: number) => ({
          questionId: id,
          choiceKey: c.choiceKey,
          text: c.text,
          imageUrl: c.imageUrl ?? null,
          order: c.order ?? i,
        }))
      );
    }
  }

  // Refresh exam score
  const [q] = await db.select({ examId: questionsTable.examId }).from(questionsTable).where(eq(questionsTable.id, id));
  if (q) await refreshExamScore(q.examId);

  res.json({ updated: true });
});

// ─── DELETE question ──────────────────────────────────────────────────────────
router.delete("/questions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [q] = await db.select({ examId: questionsTable.examId }).from(questionsTable).where(eq(questionsTable.id, id));
  await db.delete(questionChoicesTable).where(eq(questionChoicesTable.questionId, id));
  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  if (q) await refreshExamScore(q.examId);
  res.status(204).send();
});

// ─── REORDER questions ────────────────────────────────────────────────────────
router.post("/exams/:examId/questions/reorder", async (req, res): Promise<void> => {
  const { ids } = req.body as { ids: number[] };
  await Promise.all(ids.map((id, i) => db.update(questionsTable).set({ order: i + 1 }).where(eq(questionsTable.id, id))));
  res.json({ reordered: true });
});

// ─── DUPLICATE exam ───────────────────────────────────────────────────────────
router.post("/exams/:id/duplicate", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);

  const [orig] = await db.select().from(examsTable).where(eq(examsTable.id, id));
  if (!orig) { res.status(404).json({ error: "الامتحان غير موجود" }); return; }

  const [newExam] = await db
    .insert(examsTable)
    .values({ ...orig, id: undefined as any, title: `نسخة من ${orig.title}`, isAvailable: false, createdAt: undefined as any } as any)
    .returning();

  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, id)).orderBy(questionsTable.order);
  for (const q of questions) {
    const [nq] = await db.insert(questionsTable).values({ ...q, id: undefined as any, examId: newExam.id, createdAt: undefined as any } as any).returning();
    const choices = await db.select().from(questionChoicesTable).where(eq(questionChoicesTable.questionId, q.id));
    if (choices.length) {
      await db.insert(questionChoicesTable).values(choices.map(c => ({ ...c, id: undefined as any, questionId: nq.id } as any)));
    }
  }

  res.status(201).json({ id: newExam.id });
});

// ─── Helper ───────────────────────────────────────────────────────────────────
async function refreshExamScore(examId: number) {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(${questionsTable.score}), 0)` })
    .from(questionsTable)
    .where(eq(questionsTable.examId, examId));
  const totalScore = parseFloat(result[0]?.total ?? "0");
  const qCount = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(questionsTable)
    .where(eq(questionsTable.examId, examId));
  await db
    .update(examsTable)
    .set({ totalScore: totalScore.toFixed(2), questionCount: Number(qCount[0]?.c ?? 0) } as any)
    .where(eq(examsTable.id, examId));
}

export default router;
