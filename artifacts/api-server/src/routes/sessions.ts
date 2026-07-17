import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  studySessionsTable,
  subjectsTable,
  studentProfilesTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/sessions", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { date, subjectId } = req.query as Record<string, string>;

  let sessions = await db
    .select({
      session: studySessionsTable,
      subjectName: subjectsTable.name,
    })
    .from(studySessionsTable)
    .leftJoin(
      subjectsTable,
      eq(studySessionsTable.subjectId, subjectsTable.id)
    )
    .where(eq(studySessionsTable.userId, aReq.userId));

  if (subjectId) {
    sessions = sessions.filter(
      (s) => s.session.subjectId === parseInt(subjectId, 10)
    );
  }
  if (date) {
    const d = new Date(date);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    sessions = sessions.filter((s) => {
      const t = new Date(s.session.startedAt);
      return t >= start && t <= end;
    });
  }

  res.json(
    sessions.map(({ session, subjectName }) => ({
      id: session.id,
      subjectId: session.subjectId,
      subjectName: subjectName ?? "",
      type: session.type,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      plannedMinutes: session.plannedMinutes,
      actualMinutes: session.actualMinutes,
      focusScore: session.focusScore ? parseFloat(session.focusScore) : null,
      pauseCount: session.pauseCount,
      taskId: session.taskId,
      noteCount: 0,
    }))
  );
});

router.post("/sessions", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { subjectId, type, plannedMinutes, taskId, goal } = req.body as {
    subjectId: number;
    type: string;
    plannedMinutes: number;
    taskId?: number;
    goal?: string;
  };

  const [session] = await db
    .insert(studySessionsTable)
    .values({
      userId: aReq.userId,
      subjectId,
      type: (type as "pomodoro" | "balanced" | "deep_focus" | "quick_review" | "custom" | "exam") ?? "pomodoro",
      status: "active",
      plannedMinutes,
      pauseCount: 0,
      taskId: taskId ?? null,
      goal: goal ?? null,
    })
    .returning();

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, subjectId));

  res.status(201).json({
    id: session.id,
    subjectId: session.subjectId,
    subjectName: subject?.name ?? "",
    type: session.type,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    plannedMinutes: session.plannedMinutes,
    actualMinutes: session.actualMinutes,
    focusScore: null,
    pauseCount: session.pauseCount,
    taskId: session.taskId,
    noteCount: 0,
  });
});

router.patch(
  "/sessions/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const sessionId = parseInt(rawId, 10);

    const { status, comprehensionLevel, focusLevel, actualMinutes } =
      req.body as {
        status?: "paused" | "completed" | "abandoned";
        comprehensionLevel?: string;
        focusLevel?: string;
        actualMinutes?: number;
      };

    type UpdateData = Partial<{
      status: "active" | "paused" | "completed" | "abandoned";
      comprehensionLevel: string | null;
      focusLevel: string | null;
      actualMinutes: number | null;
      endedAt: Date | null;
      pauseCount: number;
    }>;

    const updateData: UpdateData = {};
    if (status) updateData.status = status;
    if (comprehensionLevel !== undefined) updateData.comprehensionLevel = comprehensionLevel;
    if (focusLevel !== undefined) updateData.focusLevel = focusLevel;
    if (actualMinutes !== undefined) updateData.actualMinutes = actualMinutes;
    if (status === "completed" || status === "abandoned") {
      updateData.endedAt = new Date();
    }

    if (status === "paused") {
      const [existing] = await db
        .select()
        .from(studySessionsTable)
        .where(eq(studySessionsTable.id, sessionId));
      updateData.pauseCount = (existing?.pauseCount ?? 0) + 1;
    }

    const [session] = await db
      .update(studySessionsTable)
      .set(updateData)
      .where(
        and(
          eq(studySessionsTable.id, sessionId),
          eq(studySessionsTable.userId, aReq.userId)
        )
      )
      .returning();

    if (!session) {
      res.status(404).json({ error: "الجلسة غير موجودة" });
      return;
    }

    const [subject] = await db
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, session.subjectId));

    res.json({
      id: session.id,
      subjectId: session.subjectId,
      subjectName: subject?.name ?? "",
      type: session.type,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      plannedMinutes: session.plannedMinutes,
      actualMinutes: session.actualMinutes,
      focusScore: session.focusScore ? parseFloat(session.focusScore) : null,
      pauseCount: session.pauseCount,
      taskId: session.taskId,
      noteCount: 0,
    });
  }
);

export default router;
