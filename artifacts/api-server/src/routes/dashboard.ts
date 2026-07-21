import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, count, sql, isNull, ne } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  studyTasksTable,
  weeklyQuizzesTable,
  dossiersTable,
  worksheetsTable,
  examsTable,
  subjectsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, aReq.userId));

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, aReq.userId));

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const todayTasks = await db
    .select({
      task: studyTasksTable,
      subjectName: subjectsTable.name,
      subjectColor: subjectsTable.color,
    })
    .from(studyTasksTable)
    .leftJoin(subjectsTable, eq(studyTasksTable.subjectId, subjectsTable.id))
    .where(
      and(
        eq(studyTasksTable.userId, aReq.userId),
        gte(studyTasksTable.scheduledAt, startOfDay),
        lte(studyTasksTable.scheduledAt, endOfDay)
      )
    );

  const latestDossiers = await db
    .select({
      dossier: dossiersTable,
      subjectName: subjectsTable.name,
    })
    .from(dossiersTable)
    .leftJoin(subjectsTable, eq(dossiersTable.subjectId, subjectsTable.id))
    .orderBy(desc(dossiersTable.createdAt))
    .limit(4);

  const quizzes = await db
    .select({
      quiz: weeklyQuizzesTable,
      subjectName: subjectsTable.name,
    })
    .from(weeklyQuizzesTable)
    .leftJoin(subjectsTable, eq(weeklyQuizzesTable.subjectId, subjectsTable.id))
    .where(eq(weeklyQuizzesTable.isActive, true))
    .limit(1);

  const currentQuiz = quizzes[0];

  const hourOfDay = now.getHours();
  let greeting = "مرحباً";
  if (hourOfDay < 12) greeting = "صباح الخير";
  else if (hourOfDay < 17) greeting = "مساء الخير";

  const availableHours = parseFloat(profile?.availableHoursPerDay ?? "2");
  const todayGoalMinutes = Math.round(availableHours * 60);

  res.json({
    greeting: `${greeting}، ${user?.fullName ?? "طالب"}`,
    todayGoalMinutes,
    todayDoneMinutes: 0,
    todayTasks: todayTasks.map(({ task, subjectName, subjectColor }) => ({
      id: task.id,
      title: task.title,
      subjectName: subjectName ?? "",
      subjectColor: subjectColor ?? "#5A2D82",
      type: task.type,
      status: task.status,
      durationMinutes: task.durationMinutes,
      scheduledAt: task.scheduledAt,
      priority: task.priority,
      linkedContentId: task.linkedContentId,
      linkedContentType: task.linkedContentType,
    })),
    streakDays: profile?.streakDays ?? 0,
    nextTask: todayTasks[0]?.task.title ?? null,
    overdueTasks: 0,
    upcomingExam: null,
    weeklyProgress: 0,
    platformStats: {
      totalStudents: 12480,
      totalDossiers: 348,
      totalWorksheets: 1240,
      totalExams: 580,
      totalDownloads: 94200,
      totalStudyHours: 850000,
    },
    latestDossiers: latestDossiers.map(({ dossier, subjectName }) => ({
      id: dossier.id,
      title: dossier.title,
      description: dossier.description,
      subjectId: dossier.subjectId,
      subjectName: subjectName ?? "",
      grade: dossier.grade,
      pageCount: dossier.pageCount,
      fileSize: dossier.fileSize,
      downloads: dossier.downloads,
      views: dossier.views,
      rating: parseFloat(dossier.rating ?? "0"),
      coverUrl: dossier.coverUrl,
      fileUrl: dossier.fileUrl,
      isFavorite: false,
      readingProgress: 0,
      lastReadPage: 1,
      createdAt: dossier.createdAt,
    })),
    currentQuiz: currentQuiz
      ? {
          id: currentQuiz.quiz.id,
          title: currentQuiz.quiz.title,
          description: currentQuiz.quiz.description,
          subjectName: currentQuiz.subjectName ?? "",
          startsAt: currentQuiz.quiz.startsAt,
          endsAt: currentQuiz.quiz.endsAt,
          questionCount: 10,
          durationMinutes: 15,
          participants: 847,
          prizes: currentQuiz.quiz.prizes,
          hasParticipated: false,
          userRank: null,
        }
      : null,
  });
});

router.get("/dashboard/platform-stats", requireAuth, async (_req, res): Promise<void> => {
  const [
    [students],
    [dossiers],
    [worksheets],
    [exams],
    [dossierDl],
    [worksheetDl],
  ] = await Promise.all([
    db.select({ total: count() }).from(usersTable)
      .where(eq(usersTable.role as any, "student")),
    db.select({ total: count() }).from(dossiersTable)
      .where(and(eq(dossiersTable.status as any, "published"), isNull(dossiersTable.deletedAt as any))),
    db.select({ total: count() }).from(worksheetsTable)
      .where(and(eq(worksheetsTable.status as any, "published"), isNull(worksheetsTable.deletedAt as any))),
    db.select({ total: count() }).from(examsTable)
      .where(and(eq(examsTable.status, "published"), ne(examsTable.type, "weekly"), isNull(examsTable.deletedAt))),
    db.select({ total: sql<number>`COALESCE(SUM(downloads), 0)` })
      .from(dossiersTable).where(isNull(dossiersTable.deletedAt as any)),
    db.select({ total: sql<number>`COALESCE(SUM(downloads), 0)` })
      .from(worksheetsTable).where(isNull(worksheetsTable.deletedAt as any)),
  ]);
  res.json({
    totalStudents: Number(students?.total ?? 0),
    totalDossiers: Number(dossiers?.total ?? 0),
    totalWorksheets: Number(worksheets?.total ?? 0),
    totalExams: Number(exams?.total ?? 0),
    totalDownloads: Number(dossierDl?.total ?? 0) + Number(worksheetDl?.total ?? 0),
    totalStudyHours: 0,
  });
});

export default router;
