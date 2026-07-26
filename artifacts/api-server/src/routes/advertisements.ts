/**
 * Advertisement routes
 *
 * Public:  GET  /api/advertisements/active
 * Admin:   GET  /api/admin/advertisements
 *          POST /api/admin/advertisements
 *          PATCH /api/admin/advertisements/reorder
 *          PATCH /api/admin/advertisements/:id
 *          PATCH /api/admin/advertisements/:id/status
 *          DELETE /api/admin/advertisements/:id
 */
import { Router, type IRouter } from "express";
import { and, asc, desc, gt, isNull, lte, or, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { homepageAdsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a stored object key to a public-facing URL the frontend can fetch */
function imageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  // Keys are stored as /objects/uploads/<uuid> — exposed via /api/storage
  return `/api/storage${key}`;
}

function serializeAd(ad: typeof homepageAdsTable.$inferSelect) {
  return {
    id: ad.id,
    title: ad.title,
    description: ad.description,
    imageUrl: imageUrl(ad.imageKey),
    mobileImageUrl: imageUrl(ad.mobileImageKey),
    tabletImageUrl: imageUrl(ad.tabletImageKey),
    linkUrl: ad.linkUrl,
    openInNewTab: ad.openInNewTab,
    ctaText: ad.ctaText,
    displayStyle: ad.displayStyle,
    isActive: ad.isActive,
    position: ad.position,
    startAt: ad.startAt,
    endAt: ad.endAt,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
  };
}

function serializeAdAdmin(ad: typeof homepageAdsTable.$inferSelect) {
  return {
    ...serializeAd(ad),
    // Admin also sees storage keys for re-upload UI
    imageKey: ad.imageKey,
    mobileImageKey: ad.mobileImageKey,
    tabletImageKey: ad.tabletImageKey,
  };
}

const now = () => new Date();

const activeFilter = () =>
  and(
    eq(homepageAdsTable.isActive, true),
    or(isNull(homepageAdsTable.startAt), lte(homepageAdsTable.startAt, now())),
    or(isNull(homepageAdsTable.endAt), gt(homepageAdsTable.endAt, now())),
  );

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * GET /api/advertisements/active
 * Returns currently active advertisements for the homepage.
 * No auth required.
 */
router.get("/advertisements/active", async (_req, res): Promise<void> => {
  try {
    const ads = await db
      .select()
      .from(homepageAdsTable)
      .where(activeFilter())
      .orderBy(asc(homepageAdsTable.position), desc(homepageAdsTable.createdAt))
      .catch((err) => {
        console.error("[advertisements] active fetch fallback", err);
        return [];
      });

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ ok: true, items: (ads || []).map(serializeAd) });
  } catch (err) {
    console.error("[advertisements] active fetch error", err);
    res.json({ ok: true, items: [] });
  }
});


// ── Admin ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/advertisements
 * Returns all advertisements (any status) for admin management.
 */
router.get(
  "/admin/advertisements",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  async (_req, res): Promise<void> => {
    const ads = await db
      .select()
      .from(homepageAdsTable)
      .orderBy(asc(homepageAdsTable.position), desc(homepageAdsTable.createdAt));

    res.json({ ok: true, items: ads.map(serializeAdAdmin) });
  },
);

/**
 * POST /api/admin/advertisements
 * Create a new advertisement.
 */
router.post(
  "/admin/advertisements",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  async (req: AuthRequest, res): Promise<void> => {
    const {
      title, description, imageKey, mobileImageKey, tabletImageKey,
      linkUrl, openInNewTab, ctaText, displayStyle,
      isActive, position, startAt, endAt,
    } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ ok: false, error: "يرجى إدخال عنوان الإعلان" });
      return;
    }
    if (!imageKey) {
      res.status(400).json({ ok: false, error: "صورة الإعلان مطلوبة" });
      return;
    }
    if (linkUrl && !/^(https?:\/\/|\/)/.test(linkUrl)) {
      res.status(400).json({ ok: false, error: "الرابط غير صالح" });
      return;
    }
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      res.status(400).json({
        ok: false,
        error: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
      });
      return;
    }

    const [ad] = await db
      .insert(homepageAdsTable)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        imageKey,
        mobileImageKey: mobileImageKey || null,
        tabletImageKey: tabletImageKey || null,
        linkUrl: linkUrl?.trim() || null,
        openInNewTab: !!openInNewTab,
        ctaText: ctaText?.trim() || null,
        displayStyle: displayStyle || "image_only",
        isActive: isActive !== false,
        position: Number(position) || 0,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        createdBy: req.userId,
      })
      .returning();

    res.status(201).json({ ok: true, item: serializeAdAdmin(ad) });
  },
);

/**
 * PATCH /api/admin/advertisements/reorder
 * Reorder advertisements. Body: { items: [{id, position}] }
 */
router.patch(
  "/admin/advertisements/reorder",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  async (_req, res): Promise<void> => {
    const { items } = _req.body as { items: { id: number; position: number }[] };
    if (!Array.isArray(items)) {
      res.status(400).json({ ok: false, error: "بيانات غير صالحة" });
      return;
    }
    await Promise.all(
      items.map(({ id, position }) =>
        db
          .update(homepageAdsTable)
          .set({ position })
          .where(eq(homepageAdsTable.id, id)),
      ),
    );
    res.json({ ok: true });
  },
);

/**
 * PATCH /api/admin/advertisements/:id/status
 * Toggle active/inactive.
 */
router.patch(
  "/admin/advertisements/:id/status",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id));
    const { isActive } = req.body;
    if (isNaN(id)) {
      res.status(400).json({ ok: false, error: "معرّف غير صالح" });
      return;
    }
    const [ad] = await db
      .update(homepageAdsTable)
      .set({ isActive: !!isActive })
      .where(eq(homepageAdsTable.id, id))
      .returning();
    if (!ad) {
      res.status(404).json({ ok: false, error: "الإعلان غير موجود" });
      return;
    }
    res.json({ ok: true, item: serializeAdAdmin(ad) });
  },
);

/**
 * PATCH /api/admin/advertisements/:id
 * Update an advertisement.
 */
router.patch(
  "/admin/advertisements/:id",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ ok: false, error: "معرّف غير صالح" });
      return;
    }

    const {
      title, description, imageKey, mobileImageKey, tabletImageKey,
      linkUrl, openInNewTab, ctaText, displayStyle,
      isActive, position, startAt, endAt,
    } = req.body;

    if (title !== undefined && !title?.trim()) {
      res.status(400).json({ ok: false, error: "يرجى إدخال عنوان الإعلان" });
      return;
    }
    if (linkUrl !== undefined && linkUrl && !/^(https?:\/\/|\/)/.test(linkUrl)) {
      res.status(400).json({ ok: false, error: "الرابط غير صالح" });
      return;
    }
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      res.status(400).json({
        ok: false,
        error: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
      });
      return;
    }

    const updates: Partial<typeof homepageAdsTable.$inferInsert> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (imageKey !== undefined) updates.imageKey = imageKey;
    if (mobileImageKey !== undefined) updates.mobileImageKey = mobileImageKey || null;
    if (tabletImageKey !== undefined) updates.tabletImageKey = tabletImageKey || null;
    if (linkUrl !== undefined) updates.linkUrl = linkUrl?.trim() || null;
    if (openInNewTab !== undefined) updates.openInNewTab = !!openInNewTab;
    if (ctaText !== undefined) updates.ctaText = ctaText?.trim() || null;
    if (displayStyle !== undefined) updates.displayStyle = displayStyle;
    if (isActive !== undefined) updates.isActive = !!isActive;
    if (position !== undefined) updates.position = Number(position);
    if (startAt !== undefined) updates.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== undefined) updates.endAt = endAt ? new Date(endAt) : null;

    const [ad] = await db
      .update(homepageAdsTable)
      .set(updates)
      .where(eq(homepageAdsTable.id, id))
      .returning();

    if (!ad) {
      res.status(404).json({ ok: false, error: "الإعلان غير موجود" });
      return;
    }
    res.json({ ok: true, item: serializeAdAdmin(ad) });
  },
);

/**
 * DELETE /api/admin/advertisements/:id
 */
router.delete(
  "/admin/advertisements/:id",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ ok: false, error: "معرّف غير صالح" });
      return;
    }
    const [deleted] = await db
      .delete(homepageAdsTable)
      .where(eq(homepageAdsTable.id, id))
      .returning({ id: homepageAdsTable.id });

    if (!deleted) {
      res.status(404).json({ ok: false, error: "الإعلان غير موجود" });
      return;
    }
    res.json({ ok: true });
  },
);

export default router;
