import { Router, type IRouter } from "express";
import { eq, and, isNull, isNotNull, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  examsTable,
  questionsTable,
  questionChoicesTable,
  examAttemptsTable,
  attemptAnswersTable,
  weeklyQuizzesTable,
  subjectsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/exams", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { subjectId, type, includeAll } = req.query as Record<string, string>;
  const isAdmin = ["admin", "super_admin"].includes(aReq.userRole ?? "");
  const shouldIncludeAll = isAdmin && includeAll === "true";

  let rows = await db
    .select({
      exam: examsTable,
      subjectName: subjectsTable.name,
    })
    .from(examsTable)
    .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
    .where(
      shouldIncludeAll
        ? isNull(examsTable.deletedAt)
        : and(
            isNull(examsTable.deletedAt),
            eq(examsTable.status, "published"),
            eq(examsTable.isAvailable, true)
          )
    );

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
      questionCount: (exam as any).questionCount ?? 0,
      durationMinutes: exam.durationMinutes,
      type: exam.type,
      difficulty: exam.difficulty,
      totalScore: exam.totalScore,
      passingScore: exam.passingScore,
      instructions: exam.instructions,
      status: (exam as any).status ?? "draft",
      totalParticipants: 0,
      averageScore: null,
      isAvailable: exam.isAvailable,
      userAttempts: 0,
      maxAttempts: exam.maxAttempts,
      createdAt: exam.createdAt,
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

router.get("/exams/:id", requireAuth, async (req, res): Promise<void> => {
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

  const aReq = req as AuthRequest;
  const isAdmin = ["admin", "super_admin"].includes(aReq.userRole ?? "");
  if (!row || (!isAdmin && (row.exam.status !== "published" || !row.exam.isAvailable))) {
    res.status(404).json({ error: "الامتحان غير موجود أو غير متاح حالياً" });
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

  const isAdmin = ["admin", "super_admin"].includes(aReq.userRole ?? "");
  if (!exam || (!isAdmin && (exam.status !== "published" || !exam.isAvailable))) {
    res.status(404).json({ error: "الامتحان غير موجود أو غير متاح حالياً" });
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

  const questionIds = questions.map((q) => q.id);
  const allChoices =
    questionIds.length > 0
      ? await db
          .select()
          .from(questionChoicesTable)
          .where(inArray(questionChoicesTable.questionId, questionIds))
      : [];

  const choicesByQuestion: Record<number, typeof allChoices> = {};
  for (const c of allChoices) {
    if (!choicesByQuestion[c.questionId]) {
      choicesByQuestion[c.questionId] = [];
    }
    choicesByQuestion[c.questionId].push(c);
  }

  const questionsWithChoices = questions.map((q) => {
    const choices = choicesByQuestion[q.id] ?? [];
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
  });

  res.status(201).json({
    id: attempt.id,
    examId: attempt.examId,
    startedAt: attempt.startedAt,
    durationMinutes: exam.durationMinutes,
    questions: questionsWithChoices,
    savedAnswers: {},
  });
});

// ─── Get attempt (for exam resume / take page) ───────────────────────────────
router.get(
  "/exams/attempts/:attemptId",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const rawId = Array.isArray(req.params.attemptId)
      ? req.params.attemptId[0]
      : req.params.attemptId;
    const attemptId = parseInt(rawId, 10);

    const [attempt] = await db
      .select()
      .from(examAttemptsTable)
      .where(and(eq(examAttemptsTable.id, attemptId), eq(examAttemptsTable.userId, aReq.userId)));

    if (!attempt) {
      res.status(404).json({ error: "المحاولة غير موجودة" });
      return;
    }

    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, attempt.examId));

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, attempt.examId));

    const questionIds = questions.map((q) => q.id);
    const allChoices =
      questionIds.length > 0
        ? await db
            .select()
            .from(questionChoicesTable)
            .where(inArray(questionChoicesTable.questionId, questionIds))
        : [];

    const choicesByQuestion: Record<number, typeof allChoices> = {};
    for (const c of allChoices) {
      if (!choicesByQuestion[c.questionId]) {
        choicesByQuestion[c.questionId] = [];
      }
      choicesByQuestion[c.questionId].push(c);
    }

    const questionsWithChoices = questions.map((q) => {
      const choices = choicesByQuestion[q.id] ?? [];
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        order: q.order,
        score: parseFloat(q.score),
        imageUrl: q.imageUrl,
        choices: choices.map((c) => ({ id: c.choiceKey, text: c.text, imageUrl: c.imageUrl })),
      };
    });

    const savedAnswersArr = await db
      .select()
      .from(attemptAnswersTable)
      .where(eq(attemptAnswersTable.attemptId, attemptId));

    const savedAnswers: Record<number, string> = {};
    for (const a of savedAnswersArr) {
      if (a.answer) savedAnswers[a.questionId] = a.answer;
    }

    res.json({
      id: attempt.id,
      examId: attempt.examId,
      title: exam?.title ?? "",
      startedAt: attempt.startedAt,
      durationMinutes: exam?.durationMinutes ?? 60,
      questions: questionsWithChoices,
      savedAnswers,
    });
  }
);

router.post(
  "/exams/attempts/:attemptId/answer",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.attemptId)
      ? req.params.attemptId[0]
      : req.params.attemptId;
    const attemptId = parseInt(rawId, 10);
    const aReq = req as AuthRequest;

    const [attempt] = await db
      .select()
      .from(examAttemptsTable)
      .where(
        and(
          eq(examAttemptsTable.id, attemptId),
          eq(examAttemptsTable.userId, aReq.userId)
        )
      );

    if (!attempt) {
      res.status(404).json({ error: "المحاولة غير موجودة أو غير مصرح بها" });
      return;
    }

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
    const aReq = req as AuthRequest;

    const [attempt] = await db
      .select()
      .from(examAttemptsTable)
      .where(
        and(
          eq(examAttemptsTable.id, attemptId),
          eq(examAttemptsTable.userId, aReq.userId)
        )
      );

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
      .where(
        and(
          eq(examAttemptsTable.id, attemptId),
          eq(examAttemptsTable.userId, aReq.userId)
        )
      )
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

// ─── ATTEMPT RESULT (GET) ─────────────────────────────────────────────────────
// Used by the exam-result page to load the stored result without re-submitting.
router.get(
  "/exams/attempts/:attemptId/result",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const rawAttemptId = Array.isArray(req.params.attemptId)
      ? req.params.attemptId[0]
      : req.params.attemptId;
    const attemptId = parseInt(rawAttemptId, 10);
    if (isNaN(attemptId)) { res.status(400).json({ error: "معرف غير صالح" }); return; }

    const [attempt] = await db
      .select()
      .from(examAttemptsTable)
      .where(
        and(
          eq(examAttemptsTable.id, attemptId),
          eq(examAttemptsTable.userId, aReq.userId)
        )
      );

    if (!attempt) { res.status(404).json({ error: "النتيجة غير موجودة" }); return; }

    const [exam] = await db
      .select({ title: examsTable.title, subjectId: examsTable.subjectId })
      .from(examsTable)
      .where(eq(examsTable.id, attempt.examId));

    const [subject] = exam?.subjectId
      ? await db
          .select({ name: subjectsTable.name })
          .from(subjectsTable)
          .where(eq(subjectsTable.id, exam.subjectId))
      : [undefined];

    res.json({
      id: attempt.id,
      examId: attempt.examId,
      examTitle: exam?.title ?? "",
      subjectName: subject?.name ?? "",
      score: parseFloat(attempt.score ?? "0"),
      totalScore: parseFloat(attempt.totalScore ?? "100"),
      percentage: parseFloat(attempt.percentage ?? "0"),
      passed: attempt.passed ?? false,
      timeTakenMinutes: attempt.timeTakenMinutes ?? 0,
      correctCount: attempt.correctCount ?? 0,
      wrongCount: attempt.wrongCount ?? 0,
      unansweredCount: attempt.unansweredCount ?? 0,
      rank: attempt.rank ?? null,
      completedAt: attempt.submittedAt?.toISOString() ?? null,
    });
  }
);

// ─── WEEKLY QUIZ ────────────────────────────────────────
// NOTE: Weekly quizzes are stored in examsTable with type="weekly".
// The old weeklyQuizzesTable is a separate legacy table — do not use it here.
router.get("/quiz/current", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const now = new Date();

  // Find published, available weekly quizzes from examsTable
  const rows = await db
    .select({
      exam: examsTable,
      subjectName: subjectsTable.name,
    })
    .from(examsTable)
    .leftJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
    .where(
      and(
        eq(examsTable.type, "weekly"),
        eq((examsTable as any).status, "published"),
        eq(examsTable.isAvailable, true),
        isNull(examsTable.deletedAt),
      )
    );

  if (!rows.length) {
    res.status(200).json(null);
    return;
  }

  // Prefer non-expired quiz; fall back to the most-recently-created one
  const active =
    rows.find((r) => {
      const expires = r.exam.expiresAt;
      return !expires || new Date(expires) >= now;
    }) ?? rows[0];

  const examId = active.exam.id;

  // Run question count, participant count, and user-attempt check in parallel
  const [questionRows, participantRows, userAttemptRows] = await Promise.all([
    db
      .select({ id: questionsTable.id })
      .from(questionsTable)
      .where(eq(questionsTable.examId, examId)),

    db
      .select({ count: sql<string>`count(distinct ${examAttemptsTable.userId})` })
      .from(examAttemptsTable)
      .where(
        and(
          eq(examAttemptsTable.examId, examId),
          isNotNull(examAttemptsTable.submittedAt),
        )
      ),

    db
      .select({ id: examAttemptsTable.id, rank: examAttemptsTable.rank })
      .from(examAttemptsTable)
      .where(
        and(
          eq(examAttemptsTable.examId, examId),
          eq(examAttemptsTable.userId, aReq.userId),
          isNotNull(examAttemptsTable.submittedAt),
        )
      )
      .orderBy(desc(examAttemptsTable.score))
      .limit(1),
  ]);

  const questionCount = questionRows.length || (active.exam as any).questionCount || 0;
  const participants = parseInt(participantRows[0]?.count ?? "0", 10);
  const hasParticipated = userAttemptRows.length > 0;
  const userRank = userAttemptRows[0]?.rank ?? null;

  res.json({
    id: examId,
    title: active.exam.title,
    description: active.exam.instructions ?? null,
    subjectName: active.subjectName ?? "",
    startsAt: active.exam.publishedAt?.toISOString() ?? active.exam.createdAt.toISOString(),
    endsAt: active.exam.expiresAt?.toISOString() ?? null,
    questionCount,
    durationMinutes: active.exam.durationMinutes,
    totalScore: parseFloat((active.exam as any).totalScore ?? "100"),
    participants,
    prizes: [],
    hasParticipated,
    userRank,
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

    // ID is the examsTable PK (type="weekly") — not the legacy weeklyQuizzesTable
    const [quiz] = await db
      .select()
      .from(examsTable)
      .where(
        and(
          eq(examsTable.id, quizId),
          eq(examsTable.type, "weekly"),
          isNull(examsTable.deletedAt),
        )
      );

    if (!quiz) {
      res.status(404).json({ error: "الكويز غير موجود" });
      return;
    }

    // Check expiry
    if (quiz.expiresAt && new Date(quiz.expiresAt) < new Date()) {
      res.status(410).json({ error: "انتهت مدة هذا الكويز" });
      return;
    }

    // Prevent duplicate submission if maxAttempts = 1
    if (quiz.maxAttempts === 1) {
      const [existing] = await db
        .select({ id: examAttemptsTable.id })
        .from(examAttemptsTable)
        .where(
          and(
            eq(examAttemptsTable.examId, quiz.id),
            eq(examAttemptsTable.userId, aReq.userId),
            isNotNull(examAttemptsTable.submittedAt),
          )
        )
        .limit(1);

      if (existing) {
        res.status(409).json({ error: "لقد شاركت في هذا الكويز من قبل" });
        return;
      }
    }

    const [attempt] = await db
      .insert(examAttemptsTable)
      .values({ examId: quiz.id, userId: aReq.userId })
      .returning();

    res.status(201).json({
      id: attempt.id,
      examId: attempt.examId,
      startedAt: attempt.startedAt,
      durationMinutes: quiz.durationMinutes,
      questions: [],
      savedAnswers: {},
    });
  }
);

router.get("/quiz/leaderboard", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const now = new Date();

  // Find the current active weekly quiz (same logic as /quiz/current)
  const quizRows = await db
    .select({ exam: examsTable })
    .from(examsTable)
    .where(
      and(
        eq(examsTable.type, "weekly"),
        eq((examsTable as any).status, "published"),
        eq(examsTable.isAvailable, true),
        isNull(examsTable.deletedAt),
      )
    );

  if (!quizRows.length) {
    res.json([]);
    return;
  }

  const active =
    quizRows.find((r) => {
      const expires = r.exam.expiresAt;
      return !expires || new Date(expires) >= now;
    }) ?? quizRows[0];

  // Fetch all submitted attempts for this quiz with user info
  const attempts = await db
    .select({
      userId: examAttemptsTable.userId,
      score: examAttemptsTable.score,
      timeTakenMinutes: examAttemptsTable.timeTakenMinutes,
      submittedAt: examAttemptsTable.submittedAt,
      fullName: usersTable.fullName,
    })
    .from(examAttemptsTable)
    .innerJoin(usersTable, eq(examAttemptsTable.userId, usersTable.id))
    .where(
      and(
        eq(examAttemptsTable.examId, active.exam.id),
        isNotNull(examAttemptsTable.submittedAt),
      )
    )
    .orderBy(
      desc(examAttemptsTable.score),
      asc(examAttemptsTable.timeTakenMinutes),
      asc(examAttemptsTable.submittedAt),
    );

  // Keep only each user's best attempt (already sorted best-first)
  const bestByUser = new Map<number, typeof attempts[0]>();
  for (const a of attempts) {
    if (!bestByUser.has(a.userId)) {
      bestByUser.set(a.userId, a);
    }
  }

  const ranked = [...bestByUser.values()].map((a, idx) => ({
    rank: idx + 1,
    displayName: a.fullName ?? "طالب",
    avatarUrl: null,
    score: parseFloat(a.score ?? "0"),
    timeTakenSeconds: (a.timeTakenMinutes ?? 0) * 60,
    governorate: null,
    badgeIcon:
      idx === 0 ? "Trophy" : idx === 1 ? "Medal" : idx === 2 ? "Award" : null,
    isCurrentUser: a.userId === aReq.userId,
  }));

  res.json(ranked);
});

export default router;
