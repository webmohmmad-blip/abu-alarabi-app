import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/notifications",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, aReq.userId));

    res.json(
      notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
        actionUrl: n.actionUrl,
      }))
    );
  }
);

router.post(
  "/notifications/:id/read",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const notifId = parseInt(rawId, 10);

    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, notifId),
          eq(notificationsTable.userId, aReq.userId)
        )
      );

    res.json({ success: true });
  }
);

export default router;
