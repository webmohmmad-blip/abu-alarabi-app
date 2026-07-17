import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  studentSubjectsTable,
  studyPlansTable,
} from "@workspace/db";
import {
  hashPassword,
  comparePassword,
  signToken,
  requireAuth,
  type AuthRequest,
} from "../lib/auth";
import {
  RegisterBody,
  LoginBody,
  CompleteOnboardingBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { fullName, phone, password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    res.status(400).json({ error: "كلمتا المرور غير متطابقتين" });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  if (existing) {
    res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({ fullName, phone, passwordHash, role: "student" })
    .returning();

  await db.insert(studentProfilesTable).values({ userId: user.id });

  const token = signToken({ userId: user.id, role: user.role });

  res.status(201).json({
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    },
    token,
    onboardingRequired: true,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { phone, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  if (!user) {
    res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    },
    token,
    onboardingRequired: !user.onboardingCompleted,
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, aReq.userId));

  if (!user) {
    res.status(401).json({ error: "المستخدم غير موجود" });
    return;
  }

  res.json({
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
  });
});

router.post(
  "/auth/onboarding",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const parsed = CompleteOnboardingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const {
      grade,
      field,
      school,
      tawjihiYear,
      isRepeating,
      subjectIds,
      subjectLevels,
      availableHoursPerDay,
      studyDays,
      goal,
      studyStyle,
    } = parsed.data;

    const [profile] = await db
      .select()
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.userId, aReq.userId));

    if (profile) {
      await db
        .update(studentProfilesTable)
        .set({
          grade,
          field,
          school: school ?? null,
          tawjihiYear: tawjihiYear ?? null,
          isRepeating: isRepeating ?? false,
          availableHoursPerDay: availableHoursPerDay?.toString() ?? null,
          studyDays: studyDays ?? null,
          goal: goal ?? null,
          studyStyle: studyStyle ?? null,
        })
        .where(eq(studentProfilesTable.userId, aReq.userId));
    } else {
      await db.insert(studentProfilesTable).values({
        userId: aReq.userId,
        grade,
        field,
        school: school ?? null,
        tawjihiYear: tawjihiYear ?? null,
        isRepeating: isRepeating ?? false,
        availableHoursPerDay: availableHoursPerDay?.toString() ?? null,
        studyDays: studyDays ?? null,
        goal: goal ?? null,
        studyStyle: studyStyle ?? null,
      });
    }

    if (subjectIds && subjectIds.length > 0) {
      await db
        .delete(studentSubjectsTable)
        .where(eq(studentSubjectsTable.userId, aReq.userId));

      await db.insert(studentSubjectsTable).values(
        subjectIds.map((sid) => ({
          userId: aReq.userId,
          subjectId: sid,
          level: (subjectLevels?.[sid.toString()] ?? "average"),
        }))
      );
    }

    await db
      .insert(studyPlansTable)
      .values({
        userId: aReq.userId,
        goal: goal ?? "النجاح",
        availableHoursPerDay: availableHoursPerDay?.toString() ?? null,
        recommendation: "ابدأ بمراجعة الوحدات الأولى وتنظيم وقتك بشكل يومي",
      })
      .onConflictDoNothing();

    const [user] = await db
      .update(usersTable)
      .set({ onboardingCompleted: true })
      .where(eq(usersTable.id, aReq.userId))
      .returning();

    res.json({
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    });
  }
);

export default router;
