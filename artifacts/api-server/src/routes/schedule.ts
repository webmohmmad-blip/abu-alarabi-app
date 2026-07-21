import { Router, type IRouter } from "express";
import { eq, and, ne, or, lt, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  weeklyScheduleSlotsTable,
  userRestDaysTable,
  dailyCustomTasksTable,
  subjectsTable,
  personalScheduleSubjectsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slotResponse(
  slot: typeof weeklyScheduleSlotsTable.$inferSelect,
  name: string,
  color: string,
) {
  return {
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    subjectId: slot.subjectId ?? null,
    personalSubjectId: slot.personalSubjectId ?? null,
    subjectName: name,
    subjectColor: color,
  };
}

/** True when two time ranges overlap */
function timesOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// ─── GET /api/schedule — full weekly schedule ─────────────────────────────
router.get("/schedule", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;

  const [slots, personalSubjects, restRow] = await Promise.all([
    db
      .select({
        id: weeklyScheduleSlotsTable.id,
        dayOfWeek: weeklyScheduleSlotsTable.dayOfWeek,
        startTime: weeklyScheduleSlotsTable.startTime,
        endTime: weeklyScheduleSlotsTable.endTime,
        subjectId: weeklyScheduleSlotsTable.subjectId,
        personalSubjectId: weeklyScheduleSlotsTable.personalSubjectId,
        subjectName: subjectsTable.name,
        subjectColor: subjectsTable.color,
        personalName: personalScheduleSubjectsTable.name,
        personalColor: personalScheduleSubjectsTable.color,
      })
      .from(weeklyScheduleSlotsTable)
      .leftJoin(subjectsTable, eq(weeklyScheduleSlotsTable.subjectId, subjectsTable.id))
      .leftJoin(
        personalScheduleSubjectsTable,
        eq(weeklyScheduleSlotsTable.personalSubjectId, personalScheduleSubjectsTable.id),
      )
      .where(eq(weeklyScheduleSlotsTable.userId, aReq.userId)),
    db
      .select()
      .from(personalScheduleSubjectsTable)
      .where(eq(personalScheduleSubjectsTable.userId, aReq.userId)),
    db.select().from(userRestDaysTable).where(eq(userRestDaysTable.userId, aReq.userId)),
  ]);

  res.json({
    slots: slots.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      subjectId: s.subjectId ?? null,
      personalSubjectId: s.personalSubjectId ?? null,
      subjectName: s.personalName ?? s.subjectName ?? "",
      subjectColor: s.personalColor ?? s.subjectColor ?? "#5A2D82",
    })),
    personalSubjects,
    restDays: restRow[0]?.restDays?.map(Number) ?? [],
  });
});

// ─── GET /api/schedule/personal-subjects ─────────────────────────────────
router.get("/schedule/personal-subjects", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const subjects = await db
    .select()
    .from(personalScheduleSubjectsTable)
    .where(eq(personalScheduleSubjectsTable.userId, aReq.userId));
  res.json(subjects);
});

// ─── POST /api/schedule/personal-subjects — create / upsert ──────────────
router.post("/schedule/personal-subjects", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { name, color } = req.body as { name: string; color: string };
  if (!name?.trim()) { res.status(400).json({ error: "اسم المادة مطلوب" }); return; }

  const [subject] = await db
    .insert(personalScheduleSubjectsTable)
    .values({ userId: aReq.userId, name: name.trim(), color: color || "#5A2D82" })
    .onConflictDoUpdate({
      target: [personalScheduleSubjectsTable.userId, personalScheduleSubjectsTable.name],
      set: { color: color || "#5A2D82", updatedAt: new Date() },
    })
    .returning();
  res.json(subject);
});

// ─── DELETE /api/schedule/personal-subjects/:id ───────────────────────────
router.delete("/schedule/personal-subjects/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const id = parseInt(req.params.id as string, 10);
  // Cascades to slots via FK
  await db
    .delete(personalScheduleSubjectsTable)
    .where(
      and(
        eq(personalScheduleSubjectsTable.id, id),
        eq(personalScheduleSubjectsTable.userId, aReq.userId),
      ),
    );
  res.json({ ok: true });
});

// ─── POST /api/schedule/slots — add slots (multi-day) ────────────────────
// Body: { days: number[], startTime, endTime, personalSubjectId?, subjectId? }
// Returns: { created: Slot[], conflicts: { dayOfWeek, conflictWith }[] }
router.post("/schedule/slots", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const {
    days,
    startTime,
    endTime,
    personalSubjectId,
    subjectId,
  } = req.body as {
    days: number[];
    startTime: string;
    endTime: string;
    personalSubjectId?: number;
    subjectId?: number;
  };

  if (!Array.isArray(days) || days.length === 0) {
    res.status(400).json({ error: "اختر يوماً على الأقل" }); return;
  }
  if (!startTime || !endTime || startTime >= endTime) {
    res.status(400).json({ error: "وقت غير صالح" }); return;
  }
  if (!personalSubjectId && !subjectId) {
    res.status(400).json({ error: "اختر مادة" }); return;
  }

  // Fetch all existing slots for this user (for conflict detection)
  const existingSlots = await db
    .select({
      id: weeklyScheduleSlotsTable.id,
      dayOfWeek: weeklyScheduleSlotsTable.dayOfWeek,
      startTime: weeklyScheduleSlotsTable.startTime,
      endTime: weeklyScheduleSlotsTable.endTime,
      subjectName: subjectsTable.name,
      personalName: personalScheduleSubjectsTable.name,
    })
    .from(weeklyScheduleSlotsTable)
    .leftJoin(subjectsTable, eq(weeklyScheduleSlotsTable.subjectId, subjectsTable.id))
    .leftJoin(
      personalScheduleSubjectsTable,
      eq(weeklyScheduleSlotsTable.personalSubjectId, personalScheduleSubjectsTable.id),
    )
    .where(eq(weeklyScheduleSlotsTable.userId, aReq.userId));

  const created: ReturnType<typeof slotResponse>[] = [];
  const conflicts: { dayOfWeek: number; conflictWith: string }[] = [];

  // Resolve display name for created slots
  let resolvedName = "";
  let resolvedColor = "#5A2D82";

  if (personalSubjectId) {
    const [ps] = await db
      .select()
      .from(personalScheduleSubjectsTable)
      .where(eq(personalScheduleSubjectsTable.id, personalSubjectId));
    resolvedName = ps?.name ?? "";
    resolvedColor = ps?.color ?? "#5A2D82";
  } else if (subjectId) {
    const [s] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId));
    resolvedName = s?.name ?? "";
    resolvedColor = s?.color ?? "#5A2D82";
  }

  for (const day of days) {
    // Check conflicts on this day
    const daySlots = existingSlots.filter((s) => s.dayOfWeek === day);
    const conflict = daySlots.find((s) => timesOverlap(startTime, endTime, s.startTime, s.endTime));

    if (conflict) {
      conflicts.push({
        dayOfWeek: day,
        conflictWith: conflict.personalName ?? conflict.subjectName ?? "مادة أخرى",
      });
      continue;
    }

    const [slot] = await db
      .insert(weeklyScheduleSlotsTable)
      .values({
        userId: aReq.userId,
        subjectId: subjectId ?? null,
        personalSubjectId: personalSubjectId ?? null,
        dayOfWeek: day,
        startTime,
        endTime,
      })
      .returning();

    created.push(slotResponse(slot, resolvedName, resolvedColor));

    // Update existingSlots in-memory so subsequent days in this batch see the new slot
    existingSlots.push({
      id: slot.id,
      dayOfWeek: day,
      startTime,
      endTime,
      subjectName: null,
      personalName: resolvedName || null,
    });
  }

  res.json({ created, conflicts });
});

// ─── DELETE /api/schedule/slots/:id ──────────────────────────────────────
router.delete("/schedule/slots/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  await db
    .delete(weeklyScheduleSlotsTable)
    .where(
      and(
        eq(weeklyScheduleSlotsTable.id, parseInt(req.params.id as string, 10)),
        eq(weeklyScheduleSlotsTable.userId, aReq.userId),
      ),
    );
  res.json({ ok: true });
});

// ─── PUT /api/schedule/rest-days ─────────────────────────────────────────
router.put("/schedule/rest-days", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const { restDays } = req.body as { restDays: number[] };
  await db
    .insert(userRestDaysTable)
    .values({ userId: aReq.userId, restDays: restDays.map(String) })
    .onConflictDoUpdate({ target: userRestDaysTable.userId, set: { restDays: restDays.map(String) } });
  res.json({ restDays });
});

// ─── GET /api/schedule/today ──────────────────────────────────────────────
router.get("/schedule/today", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const now = new Date();
  const dow = now.getDay();
  const today = now.toISOString().slice(0, 10);

  const [slots, restRow, customTasks] = await Promise.all([
    db
      .select({
        id: weeklyScheduleSlotsTable.id,
        startTime: weeklyScheduleSlotsTable.startTime,
        endTime: weeklyScheduleSlotsTable.endTime,
        subjectId: weeklyScheduleSlotsTable.subjectId,
        personalSubjectId: weeklyScheduleSlotsTable.personalSubjectId,
        subjectName: subjectsTable.name,
        subjectColor: subjectsTable.color,
        personalName: personalScheduleSubjectsTable.name,
        personalColor: personalScheduleSubjectsTable.color,
      })
      .from(weeklyScheduleSlotsTable)
      .leftJoin(subjectsTable, eq(weeklyScheduleSlotsTable.subjectId, subjectsTable.id))
      .leftJoin(
        personalScheduleSubjectsTable,
        eq(weeklyScheduleSlotsTable.personalSubjectId, personalScheduleSubjectsTable.id),
      )
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
      subjectId: s.subjectId ?? null,
      personalSubjectId: s.personalSubjectId ?? null,
      subjectName: s.personalName ?? s.subjectName ?? "",
      subjectColor: s.personalColor ?? s.subjectColor ?? "#5A2D82",
    })),
    customTasks: customTasks.map((t) => ({
      id: t.id,
      title: t.title,
      isCompleted: t.isCompleted,
      createdAt: t.createdAt,
    })),
  });
});

// ─── POST /api/schedule/daily-tasks ──────────────────────────────────────
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

// ─── PATCH /api/schedule/daily-tasks/:id/toggle ───────────────────────────
router.patch("/schedule/daily-tasks/:id/toggle", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const id = parseInt(req.params.id as string, 10);
  const [current] = await db
    .select()
    .from(dailyCustomTasksTable)
    .where(and(eq(dailyCustomTasksTable.id, id), eq(dailyCustomTasksTable.userId, aReq.userId)));
  if (!current) { res.status(404).json({ error: "غير موجودة" }); return; }
  const [updated] = await db
    .update(dailyCustomTasksTable)
    .set({ isCompleted: !current.isCompleted, completedAt: !current.isCompleted ? new Date() : null })
    .where(eq(dailyCustomTasksTable.id, id))
    .returning();
  res.json({ id: updated.id, title: updated.title, isCompleted: updated.isCompleted });
});

// ─── DELETE /api/schedule/daily-tasks/:id ────────────────────────────────
router.delete("/schedule/daily-tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  await db
    .delete(dailyCustomTasksTable)
    .where(
      and(
        eq(dailyCustomTasksTable.id, parseInt(req.params.id as string, 10)),
        eq(dailyCustomTasksTable.userId, aReq.userId),
      ),
    );
  res.json({ ok: true });
});

export default router;
