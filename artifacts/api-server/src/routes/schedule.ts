import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  weeklyScheduleSlotsTable,
  userRestDaysTable,
  dailyCustomTasksTable,
  subjectsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

// ── GET /api/schedule — full weekly schedule ───────────────────────────────
router.get("/schedule", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;

  const [slots, restRow] = await Promise.all([
    db
      .select({
        id: weeklyScheduleSlotsTable.id,
        dayOfWeek: weeklyScheduleSlotsTable.dayOfWeek,
        startTime: weeklyScheduleSlotsTable.startTime,
        endTime: weeklyScheduleSlotsTable.endTime,
        subjectId: weeklyScheduleSlotsTable.subjectId,
        subjectName: subjectsTable.name,
        subjectColor: subjectsTable.color,
      })
      .from(weeklyScheduleSlotsTable)
      .leftJoin(subjectsTable, eq(weeklyScheduleSlotsTable.subjectId, subjectsTable.id))
      .where(eq(weeklyScheduleSlotsTable.userId, aReq.userId)),
    db
      .select()
      .from(userRestDaysTable)
      .where(eq(userRestDaysTable.userId, aReq.userId)),
  ]);

  res.json({
    slots: slots.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      subjectId: s.subjectId,
      subjectName: s.subjectName ?? "",
      subjectColor: s.subjectColor ?? "#5A2D82",
    })),
    restDays: restRow[0]?.restDays?.map(Number) ?? [],
  });
});

// ── POST /api/schedule/slots — add a slot ─────────────────────────────────
router.post("/schedule/slots", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { subjectId, dayOfWeek, startTime, endTime } = req.body as {
    subjectId: number; dayOfWeek: number; startTime: string; endTime: string;
  };
  if (subjectId == null || dayOfWeek == null || !startTime || !endTime) {
    res.status(400).json({ error: "بيانات ناقصة" }); return;
  }
  const [slot] = await db
    .insert(weeklyScheduleSlotsTable)
    .values({ userId: aReq.userId, subjectId, dayOfWeek, startTime, endTime })
    .returning();
  const [subj] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId));
  res.json({ id: slot.id, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime,
    subjectId: slot.subjectId, subjectName: subj?.name ?? "", subjectColor: subj?.color ?? "#5A2D82" });
});

// ── DELETE /api/schedule/slots/:id ────────────────────────────────────────
router.delete("/schedule/slots/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  await db
    .delete(weeklyScheduleSlotsTable)
    .where(and(eq(weeklyScheduleSlotsTable.id, parseInt(req.params.id, 10)), eq(weeklyScheduleSlotsTable.userId, aReq.userId)));
  res.json({ ok: true });
});

// ── PUT /api/schedule/rest-days ───────────────────────────────────────────
router.put("/schedule/rest-days", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { restDays } = req.body as { restDays: number[] };
  await db
    .insert(userRestDaysTable)
    .values({ userId: aReq.userId, restDays: restDays.map(String) })
    .onConflictDoUpdate({ target: userRestDaysTable.userId, set: { restDays: restDays.map(String) } });
  res.json({ restDays });
});

// ── GET /api/schedule/today — today's schedule + custom tasks ─────────────
router.get("/schedule/today", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const now = new Date();
  const dow = now.getDay(); // 0=Sun…6=Sat
  const today = now.toISOString().slice(0, 10); // "2024-01-15"

  const [slots, restRow, customTasks] = await Promise.all([
    db
      .select({
        id: weeklyScheduleSlotsTable.id,
        startTime: weeklyScheduleSlotsTable.startTime,
        endTime: weeklyScheduleSlotsTable.endTime,
        subjectId: weeklyScheduleSlotsTable.subjectId,
        subjectName: subjectsTable.name,
        subjectColor: subjectsTable.color,
      })
      .from(weeklyScheduleSlotsTable)
      .leftJoin(subjectsTable, eq(weeklyScheduleSlotsTable.subjectId, subjectsTable.id))
      .where(and(eq(weeklyScheduleSlotsTable.userId, aReq.userId), eq(weeklyScheduleSlotsTable.dayOfWeek, dow))),
    db.select().from(userRestDaysTable).where(eq(userRestDaysTable.userId, aReq.userId)),
    db
      .select()
      .from(dailyCustomTasksTable)
      .where(and(eq(dailyCustomTasksTable.userId, aReq.userId), eq(dailyCustomTasksTable.date, today))),
  ]);

  const restDays = restRow[0]?.restDays?.map(Number) ?? [];
  const isRestDay = restDays.includes(dow);

  res.json({
    date: today,
    dayOfWeek: dow,
    isRestDay,
    slots: isRestDay ? [] : slots.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      subjectId: s.subjectId,
      subjectName: s.subjectName ?? "",
      subjectColor: s.subjectColor ?? "#5A2D82",
    })),
    customTasks: customTasks.map((t) => ({
      id: t.id,
      title: t.title,
      isCompleted: t.isCompleted,
      createdAt: t.createdAt,
    })),
  });
});

// ── POST /api/schedule/daily-tasks — add custom task ─────────────────────
router.post("/schedule/daily-tasks", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { title, date } = req.body as { title: string; date?: string };
  const taskDate = date ?? new Date().toISOString().slice(0, 10);
  const [task] = await db
    .insert(dailyCustomTasksTable)
    .values({ userId: aReq.userId, title, date: taskDate })
    .returning();
  res.json({ id: task.id, title: task.title, isCompleted: task.isCompleted, createdAt: task.createdAt });
});

// ── PATCH /api/schedule/daily-tasks/:id/toggle ────────────────────────────
router.patch("/schedule/daily-tasks/:id/toggle", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const id = parseInt(req.params.id, 10);
  const [current] = await db.select().from(dailyCustomTasksTable).where(and(eq(dailyCustomTasksTable.id, id), eq(dailyCustomTasksTable.userId, aReq.userId)));
  if (!current) { res.status(404).json({ error: "غير موجودة" }); return; }
  const [updated] = await db
    .update(dailyCustomTasksTable)
    .set({ isCompleted: !current.isCompleted, completedAt: !current.isCompleted ? new Date() : null })
    .where(eq(dailyCustomTasksTable.id, id))
    .returning();
  res.json({ id: updated.id, title: updated.title, isCompleted: updated.isCompleted });
});

// ── DELETE /api/schedule/daily-tasks/:id ─────────────────────────────────
router.delete("/schedule/daily-tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  await db.delete(dailyCustomTasksTable).where(and(eq(dailyCustomTasksTable.id, parseInt(req.params.id, 10)), eq(dailyCustomTasksTable.userId, aReq.userId)));
  res.json({ ok: true });
});

export default router;
