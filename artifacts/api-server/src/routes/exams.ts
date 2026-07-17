import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  examsTable,
  questionsTable,
  questionChoicesTable,
  examAttemptsTable,
  attemptAnswersTable,
  weeklyQuizzesTable,
  subjectsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/exams", async (req, res): Promise<void> => {
  const { subjectId, type } = req.query as Record<string, string>;

  let rows = await db
    .select({
      exam: examsTable,
      subjectName: subjectsTable.name,
    })
    .from(examsTable)
    .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id));

  if (subjectId) {
    rows = rows.filter((r) => r.exam.subjectId === parseInt(subjectId, 10));
  }
  if (type) {
    rows = rows.filter((r) => r.exam.type === type);
  }

  res.json(
    rows.map(({ exam, subjectName }) => ({
      id: exam.id,
      title: exam.title,
      subjectId: exam.subjectId,
      subjectName: subjectName ?? "",
      questionCount: 0,
      durationMinutes: exam.durationMinutes,
      type: exam.type,
      difficulty: exam.difficulty,
      totalParticipants: 0,
      averageScore: null,
      isAvailable: exam.isAvailable,
      userAttempts: 0,
      maxAttempts: exam.maxAttempts,
    }))
  );
});

router.get("/exams/results", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const attempts = await db
    .select({
      attempt: examAttemptsTable,
      examTitle: examsTable.title,
      subjectName: subjectsTable.name,
    })
    .from(examAttemptsTable)
    .leftJoin(examsTable, eq(examAttemptsTable.examId, examsTable.id))
    .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
    .where(eq(examAttemptsTable.userId, aReq.userId));

  const results = attempts
    .filter((a) => a.attempt.submittedAt !== null)
    .map(({ attempt, examTitle, subjectName }) => ({
      id: attempt.id,
      examId: attempt.examId,
      examTitle: examTitle ?? "",
      subjectName: subjectName ?? "",
      score: parseFloat(attempt.score ?? "0"),
      totalScore: parseFloat(attempt.totalScore ?? "100"),
      percentage: parseFloat(attempt.percentage ?? "0"),
      passed: attempt.passed ?? false,
      timeTakenMinutes: attempt.timeTakenMinutes ?? 0,
      correctCount: attempt.correctCount ?? 0,
      wrongCount: attempt.wrongCount ?? 0,
      unansweredCount: attempt.unansweredCount ?? 0,
      rank: attempt.rank ?? null,
      completedAt: attempt.submittedAt?.toISOString() ?? new Date().toISOString(),
    }));

  res.json(results);
});

router.get("/exams/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const id = parseInt(rawId, 10);

  const [row] = await db
    .select({
      exam: examsTable,
      subjectName: subjectsTable.name,
    })
    .from(examsTable)
    .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
    .where(eq(examsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "الامتحان غير موجود" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, id));

  res.json({
    id: row.exam.id,
    title: row.exam.title,
    subjectId: row.exam.subjectId,
    subjectName: row.subjectName ?? "",
    questionCount: questions.length,
    durationMinutes: row.exam.durationMinutes,
    type: row.exam.type,
    instructions: row.exam.instructions ?? "اقرأ الأسئلة بعناية قبل الإجابة",
    passingScore: parseFloat(row.exam.passingScore ?? "50"),
    totalScore: parseFloat(row.exam.totalScore ?? "100"),
    canGoBack: row.exam.canGoBack,
    canSkip: row.exam.canSkip,
    showResultImmediately: row.exam.showResultImmediately,
    randomizeQuestions: row.exam.randomizeQuestions,
    randomizeChoices: row.exam.randomizeChoices,
    deductOnWrong: row.exam.deductOnWrong,
    userAttempts: 0,
    maxAttempts: row.exam.maxAttempts,
  });
});

router.post("/exams/:id/start", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const examId = parseInt(rawId, 10);

  const [exam] = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.id, examId));

  if (!exam) {
    res.status(404).json({ error: "الامتحان غير موجود" });
    return;
  }

  const [attempt] = await db
    .insert(examAttemptsTable)
    .values({ examId, userId: aReq.userId })
    .returning();

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, examId));

  const questionsWithChoices = await Promise.all(
    questions.map(async (q) => {
      const choices = await db
        .select()
        .from(questionChoicesTable)
        .where(eq(questionChoicesTable.questionId, q.id));

      return {
        id: q.id,
        text: q.text,
        type: q.type,
        order: q.order,
        score: parseFloat(q.score),
        imageUrl: q.imageUrl,
        choices: choices.map((c) => ({
          id: c.choiceKey,
          text: c.text,
          imageUrl: c.imageUrl,
        })),
      };
    })
  );

  res.status(201).json({
    id: attempt.id,
    examId: attempt.examId,
    startedAt: attempt.startedAt,
    durationMinutes: exam.durationMinutes,
    questions: questionsWithChoices,
    savedAnswers: {},
  });
});

router.post(
  "/exams/attempts/:attemptId/answer",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.attemptId)
      ? req.params.attemptId[0]
      : req.params.attemptId;
    const attemptId = parseInt(rawId, 10);
    const { questionId, answer } = req.body as { questionId: number; answer: string };

    const [question] = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.id, questionId));

    const isCorrect = question?.correctAnswer === answer;

    const [existing] = await db
      .select()
      .from(attemptAnswersTable)
      .where(
        and(
          eq(attemptAnswersTable.attemptId, attemptId),
          eq(attemptAnswersTable.questionId, questionId)
        )
      );

    if (existing) {
      await db
        .update(attemptAnswersTable)
        .set({ answer, isCorrect })
        .where(eq(attemptAnswersTable.id, existing.id));
    } else {
      await db
        .insert(attemptAnswersTable)
        .values({ attemptId, questionId, answer, isCorrect });
    }

    res.json({ saved: true });
  }
);

router.post(
  "/exams/attempts/:attemptId/submit",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.attemptId)
      ? req.params.attemptId[0]
      : req.params.attemptId;
    const attemptId = parseInt(rawId, 10);

    const [attempt] = await db
      .select()
      .from(examAttemptsTable)
      .where(eq(examAttemptsTable.id, attemptId));

    if (!attempt) {
      res.status(404).json({ error: "المحاولة غير موجودة" });
      return;
    }

    const [exam] = await db
      .select()
      .from(examsTable)
      .where(eq(examsTable.id, attempt.examId));

    const answers = await db
      .select()
      .from(attemptAnswersTable)
      .where(eq(attemptAnswersTable.attemptId, attemptId));

    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.examId, attempt.examId));

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const wrongCount = answers.filter(
      (a) => a.answer !== null && !a.isCorrect
    ).length;
    const unansweredCount = questions.length - answers.length;

    const totalScore = parseFloat(exam?.totalScore ?? "100");
    const score =
      questions.length > 0
        ? (correctCount / questions.length) * totalScore
        : 0;
    const percentage = totalScore > 0 ? (score / totalScore) * 100 : 0;
    const passed = percentage >= parseFloat(exam?.passingScore ?? "50");

    const now = new Date();
    const timeTakenMinutes = Math.round(
      (now.getTime() - attempt.startedAt.getTime()) / 60000
    );

    const [updated] = await db
      .update(examAttemptsTable)
      .set({
        submittedAt: now,
        score: score.toFixed(2),
        totalScore: totalScore.toFixed(2),
        percentage: percentage.toFixed(2),
        passed,
        timeTakenMinutes,
        correctCount,
        wrongCount,
        unansweredCount,
      })
      .where(eq(examAttemptsTable.id, attemptId))
      .returning();

    res.json({
      id: updated.id,
      examId: updated.examId,
      examTitle: exam?.title ?? "",
      subjectName: "",
      score,
      totalScore,
      percentage,
      passed,
      timeTakenMinutes,
      correctCount,
      wrongCount,
      unansweredCount,
      rank: null,
      completedAt: now.toISOString(),
    });
  }
);

// ─── WEEKLY QUIZ ────────────────────────────────────────
router.get("/quiz/current", async (_req, res): Promise<void> => {
  const now = new Date();

  const quizzes = await db
    .select({
      quiz: weeklyQuizzesTable,
      subjectName: subjectsTable.name,
    })
    .from(weeklyQuizzesTable)
    .leftJoin(subjectsTable, eq(weeklyQuizzesTable.subjectId, subjectsTable.id));

  const active = quizzes.find(
    (q) =>
      q.quiz.isActive &&
      new Date(q.quiz.startsAt) <= now &&
      new Date(q.quiz.endsAt) >= now
  );

  const target = active ?? quizzes[0];

  if (!target) {
    res.status(404).json({ error: "لا يوجد كويز حالياً" });
    return;
  }

  res.json({
    id: target.quiz.id,
    title: target.quiz.title,
    description: target.quiz.description,
    subjectName: target.subjectName ?? "",
    startsAt: target.quiz.startsAt,
    endsAt: target.quiz.endsAt,
    questionCount: 10,
    durationMinutes: 15,
    participants: 847,
    prizes: target.quiz.prizes,
    hasParticipated: false,
    userRank: null,
  });
});

router.post(
  "/quiz/:id/start",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const quizId = parseInt(rawId, 10);

    const [quiz] = await db
      .select()
      .from(weeklyQuizzesTable)
      .where(eq(weeklyQuizzesTable.id, quizId));

    if (!quiz || !quiz.examId) {
      res.status(404).json({ error: "الكويز غير موجود" });
      return;
    }

    const [attempt] = await db
      .insert(examAttemptsTable)
      .values({ examId: quiz.examId, userId: aReq.userId })
      .returning();

    res.status(201).json({
      id: attempt.id,
      examId: attempt.examId,
      startedAt: attempt.startedAt,
      durationMinutes: 15,
      questions: [],
      savedAnswers: {},
    });
  }
);

router.get("/quiz/leaderboard", async (_req, res): Promise<void> => {
  res.json([
    {
      rank: 1,
      displayName: "أ. سارة محمد",
      avatarUrl: null,
      score: 100,
      timeTakenSeconds: 423,
      governorate: "عمّان",
      badgeIcon: "Trophy",
      isCurrentUser: false,
    },
    {
      rank: 2,
      displayName: "أ. خالد العمري",
      avatarUrl: null,
      score: 95,
      timeTakenSeconds: 487,
      governorate: "الزرقاء",
      badgeIcon: "Medal",
      isCurrentUser: false,
    },
    {
      rank: 3,
      displayName: "أ. نور الرشيد",
      avatarUrl: null,
      score: 90,
      timeTakenSeconds: 512,
      governorate: "إربد",
      badgeIcon: "Award",
      isCurrentUser: false,
    },
    {
      rank: 4,
      displayName: "أ. فيصل الخطيب",
      avatarUrl: null,
      score: 88,
      timeTakenSeconds: 598,
      governorate: "عمّان",
      badgeIcon: null,
      isCurrentUser: false,
    },
    {
      rank: 5,
      displayName: "أ. ريم السالم",
      avatarUrl: null,
      score: 85,
      timeTakenSeconds: 634,
      governorate: "العقبة",
      badgeIcon: null,
      isCurrentUser: false,
    },
  ]);
});

export default router;
