import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  studyPlansTable,
  studyTasksTable,
  studentProfilesTable,
  subjectsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/studyplan", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const [plan] = await db
    .select()
    .from(studyPlansTable)
    .where(eq(studyPlansTable.userId, aReq.userId));

  if (!plan) {
    res.status(404).json({ error: "لا توجد خطة دراسية" });
    return;
  }

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

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, aReq.userId));

  res.json({
    id: plan.id,
    goal: plan.goal,
    availableHoursPerDay: parseFloat(plan.availableHoursPerDay ?? "2"),
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
    weeklyProgress: 0,
    streakDays: profile?.streakDays ?? 0,
    upcomingExams: [],
    overdueTasks: 0,
    recommendation: plan.recommendation ?? "واصل التعلم بثبات",
  });
});

router.get("/studyplan/tasks", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { date, status, subjectId } = req.query as Record<string, string>;

  let tasks = await db
    .select({
      task: studyTasksTable,
      subjectName: subjectsTable.name,
      subjectColor: subjectsTable.color,
    })
    .from(studyTasksTable)
    .leftJoin(subjectsTable, eq(studyTasksTable.subjectId, subjectsTable.id))
    .where(eq(studyTasksTable.userId, aReq.userId));

  if (status) {
    tasks = tasks.filter((t) => t.task.status === status);
  }
  if (subjectId) {
    tasks = tasks.filter(
      (t) => t.task.subjectId === parseInt(subjectId, 10)
    );
  }
  if (date) {
    const d = new Date(date);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    tasks = tasks.filter((t) => {
      const s = new Date(t.task.scheduledAt);
      return s >= start && s <= end;
    });
  }

  res.json(
    tasks.map(({ task, subjectName, subjectColor }) => ({
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
    }))
  );
});

router.post(
  "/studyplan/tasks/:id/complete",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const taskId = parseInt(rawId, 10);
    const { actualMinutes, comprehensionLevel, notes } = req.body as {
      actualMinutes: number;
      comprehensionLevel: string;
      notes?: string;
    };

    const [task] = await db
      .update(studyTasksTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        actualMinutes,
        comprehensionLevel,
        notes: notes ?? null,
      })
      .where(
        and(
          eq(studyTasksTable.id, taskId),
          eq(studyTasksTable.userId, aReq.userId)
        )
      )
      .returning();

    if (!task) {
      res.status(404).json({ error: "المهمة غير موجودة" });
      return;
    }

    const [subject] = await db
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, task.subjectId));

    res.json({
      id: task.id,
      title: task.title,
      subjectName: subject?.name ?? "",
      subjectColor: subject?.color ?? "#5A2D82",
      type: task.type,
      status: task.status,
      durationMinutes: task.durationMinutes,
      scheduledAt: task.scheduledAt,
      priority: task.priority,
      linkedContentId: task.linkedContentId,
      linkedContentType: task.linkedContentType,
    });
  }
);

router.post(
  "/studyplan/rebuild",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const [plan] = await db
      .select()
      .from(studyPlansTable)
      .where(eq(studyPlansTable.userId, aReq.userId));

    if (!plan) {
      res.status(404).json({ error: "لا توجد خطة دراسية" });
      return;
    }

    await db
      .update(studyPlansTable)
      .set({
        recommendation: "تمت إعادة بناء خطتك الدراسية بناءً على تقدمك",
      })
      .where(eq(studyPlansTable.id, plan.id));

    res.json({
      id: plan.id,
      goal: plan.goal,
      availableHoursPerDay: parseFloat(plan.availableHoursPerDay ?? "2"),
      todayTasks: [],
      weeklyProgress: 0,
      streakDays: 0,
      upcomingExams: [],
      overdueTasks: 0,
      recommendation: "تمت إعادة بناء خطتك الدراسية بناءً على تقدمك",
    });
  }
);

export default router;
