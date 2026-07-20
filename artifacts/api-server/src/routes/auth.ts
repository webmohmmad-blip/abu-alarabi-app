import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
} from "@workspace/db";
import {
  signToken,
  requireAuth,
  type AuthRequest,
} from "../lib/auth";
import {
  RegisterBody,
  LoginBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function userResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    onboardingCompleted: true,
    createdAt: user.createdAt,
  };
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
// Accepts: { fullName, phone }
// • New phone     → create student account + return JWT
// • Existing phone → auto-login (return JWT) regardless of role
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { fullName, phone } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  if (existing) {
    const token = signToken({ userId: existing.id, role: existing.role });
    res.json({ user: userResponse(existing), token });
    return;
  }

  // New user — phone-only account
  const { hashPassword } = await import("../lib/auth");
  const passwordHash = await hashPassword(crypto.randomUUID());
  const [user] = await db
    .insert(usersTable)
    .values({
      fullName,
      phone,
      passwordHash,
      role: "student",
      onboardingCompleted: true,
    })
    .returning();

  await db.insert(studentProfilesTable).values({ userId: user.id });

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({ user: userResponse(user), token });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// Accepts: { phone }
// All roles authenticate by phone number only — no password required.
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { phone } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  if (!user) {
    res.status(401).json({ error: "رقم الهاتف غير مسجل" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({ user: userResponse(user), token });
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true });
});

// ─── ME ───────────────────────────────────────────────────────────────────────
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

  res.json(userResponse(user));
});

export default router;
