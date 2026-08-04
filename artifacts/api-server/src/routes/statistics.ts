import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  studentProfilesTable,
  examAttemptsTable,
  studentSubjectsTable,
  subjectsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/statistics", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, aReq.userId));

  const totalStudyMinutes = profile?.totalStudyMinutes ?? 0;

  const attempts = await db
    .select()
    .from(examAttemptsTable)
    .where(eq(examAttemptsTable.userId, aReq.userId));

  const completedAttempts = attempts.filter((a) => a.submittedAt !== null);
  const averageScore =
    completedAttempts.length > 0
      ? completedAttempts.reduce(
          (acc, a) => acc + parseFloat(a.percentage ?? "0"),
          0
        ) / completedAttempts.length
      : 0;

  res.json({
    totalStudyMinutes,
    totalSessions: 0,
    totalExams: completedAttempts.length,
    averageScore,
    streakDays: profile?.streakDays ?? 0,
    completionRate: 0,
    weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
    monthlyProgress: 0,
    bestSubject: null,
    weakestSubject: null,
    totalDossiersRead: 0,
    totalWorksheetsCompleted: 0,
  });
});

router.get(
  "/statistics/subjects",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;

    const studentSubjects = await db
      .select({
        ss: studentSubjectsTable,
        subject: subjectsTable,
      })
      .from(studentSubjectsTable)
      .leftJoin(
        subjectsTable,
        eq(studentSubjectsTable.subjectId, subjectsTable.id)
      )
      .where(eq(studentSubjectsTable.userId, aReq.userId));

    res.json(
      studentSubjects.map(({ ss, subject }) => ({
        subjectId: ss.subjectId,
        subjectName: subject?.name ?? "",
        studyMinutes: 0,
        examAverage: 0,
        progress: 0,
        level: ss.level,
        subjectColor: subject?.color ?? "#5A2D82",
      }))
    );
  }
);

export default router;
