import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const secretVal = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (
  process.env.NODE_ENV === "production" &&
  (!secretVal || secretVal === "dev-secret-change-me")
) {
  console.error(
    "FATAL: SESSION_SECRET (or JWT_SECRET) environment variable is missing or insecure in production. Application cannot start."
  );
  process.exit(1);
}

const JWT_SECRET = secretVal ?? "dev-secret-change-me";

export interface JwtPayload {
  userId: number;
  role: string;
}

export interface AuthRequest extends Request {
  userId: number;
  userRole: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as AuthRequest).userRole;
    if (!roles.includes(userRole)) {
      res.status(403).json({ error: "غير مصرح لك بالوصول إلى هذه الصفحة" });
      return;
    }
    next();
  };
}

interface CachedUserAuth {
  id: number;
  role: string;
  cachedAt: number;
}

const userAuthCache = new Map<number, CachedUserAuth>();
const USER_CACHE_TTL_MS = 60_000; // 60 seconds

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "رمز الجلسة غير صالح أو منتهي" });
    return;
  }

  const now = Date.now();
  let cached = userAuthCache.get(payload.userId);

  if (!cached || now - cached.cachedAt > USER_CACHE_TTL_MS) {
    const [user] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId));

    if (!user) {
      userAuthCache.delete(payload.userId);
      res.status(401).json({ error: "المستخدم غير موجود" });
      return;
    }

    cached = { id: user.id, role: user.role, cachedAt: now };
    userAuthCache.set(user.id, cached);
  }

  (req as AuthRequest).userId = cached.id;
  (req as AuthRequest).userRole = cached.role;
  next();
}
