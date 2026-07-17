import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  achievementsTable,
  userAchievementsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest, comparePassword, hashPassword } from "../lib/auth";

const router: IRouter = Router();

router.get("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, aReq.userId));

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, aReq.userId));

  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  res.json({
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    grade: profile?.grade ?? "",
    field: profile?.field ?? "",
    school: profile?.school,
    goal: profile?.goal ?? "",
    studyHoursPerDay: parseFloat(profile?.availableHoursPerDay ?? "2"),
    studyDays: profile?.studyDays ?? [],
    streakDays: profile?.streakDays ?? 0,
    totalStudyMinutes: profile?.totalStudyMinutes ?? 0,
    totalSessions: profile?.totalSessions ?? 0,
    totalExams: profile?.totalExams ?? 0,
    averageScore: 0,
    tawjihiYear: profile?.tawjihiYear ?? new Date().getFullYear(),
    joinedAt: user.createdAt,
  });
});

router.patch(
  "/users/profile",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const { fullName, avatarUrl, goal, studyHoursPerDay, studyDays, school } =
      req.body;

    if (fullName) {
      await db
        .update(usersTable)
        .set({ fullName })
        .where(eq(usersTable.id, aReq.userId));
    }

    if (avatarUrl) {
      await db
        .update(usersTable)
        .set({ avatarUrl })
        .where(eq(usersTable.id, aReq.userId));
    }

    await db
      .update(studentProfilesTable)
      .set({
        ...(goal && { goal }),
        ...(school && { school }),
        ...(studyHoursPerDay && {
          availableHoursPerDay: String(studyHoursPerDay),
        }),
        ...(studyDays && { studyDays }),
      })
      .where(eq(studentProfilesTable.userId, aReq.userId));

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, aReq.userId));

    const [profile] = await db
      .select()
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.userId, aReq.userId));

    res.json({
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      grade: profile?.grade ?? "",
      field: profile?.field ?? "",
      school: profile?.school,
      goal: profile?.goal ?? "",
      studyHoursPerDay: parseFloat(profile?.availableHoursPerDay ?? "2"),
      studyDays: profile?.studyDays ?? [],
      streakDays: profile?.streakDays ?? 0,
      totalStudyMinutes: profile?.totalStudyMinutes ?? 0,
      totalSessions: profile?.totalSessions ?? 0,
      totalExams: profile?.totalExams ?? 0,
      averageScore: 0,
      tawjihiYear: profile?.tawjihiYear ?? new Date().getFullYear(),
      joinedAt: user.createdAt,
    });
  }
);

// ─── Change password ─────────────────────────────────────────────────────────
router.post(
  "/users/change-password",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "يرجى إدخال كلمة المرور الحالية والجديدة" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
      .from(usersTable)
      .where(eq(usersTable.id, aReq.userId));

    if (!user) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash })
      .where(eq(usersTable.id, aReq.userId));

    res.json({ message: "تم تحديث كلمة المرور بنجاح" });
  }
);

// ─── Delete account (soft delete) ────────────────────────────────────────────
router.delete(
  "/users/account",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const { password } = req.body as { password: string };

    if (!password) {
      res.status(400).json({ error: "يرجى إدخال كلمة المرور للتأكيد" });
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
      .from(usersTable)
      .where(eq(usersTable.id, aReq.userId));

    if (!user) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      res.status(400).json({ error: "كلمة المرور غير صحيحة" });
      return;
    }

    // Soft delete
    await db
      .update(usersTable)
      .set({ status: "deleted" } as any)
      .where(eq(usersTable.id, aReq.userId));

    res.json({ message: "تم حذف الحساب بنجاح" });
  }
);

router.get(
  "/users/achievements",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const allAchievements = await db.select().from(achievementsTable);
    const userAchievements = await db
      .select()
      .from(userAchievementsTable)
      .where(eq(userAchievementsTable.userId, aReq.userId));

    const earnedMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua.earnedAt])
    );

    const result = allAchievements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      icon: a.icon,
      earnedAt: earnedMap.get(a.id)?.toISOString() ?? null,
      isEarned: earnedMap.has(a.id),
    }));

    res.json(result);
  }
);

export default router;
