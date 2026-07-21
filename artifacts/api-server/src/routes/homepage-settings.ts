import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { systemSettingsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth";

const router = Router();

const HERO_KEY = "hero_content";

export interface HeroContent {
  badgeText: string;
  badgeEnabled: boolean;
  titleLine1: string;
  titleLine2: string;
  description: string;
  descriptionEnabled: boolean;
  primaryButtonText: string;
  primaryButtonLink: string;
  primaryButtonEnabled: boolean;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  secondaryButtonEnabled: boolean;
}

export const HERO_DEFAULTS: HeroContent = {
  badgeText: "المنصة المتخصصة في اللغة العربية",
  badgeEnabled: true,
  titleLine1: "أتقن العربية.",
  titleLine2: "افهمها. تفوق.",
  description:
    "مع الأستاذ محمد الساحوري — أبو العربي — طريقك لإتقان اللغة العربية والتفوق في التوجيهي أصبح أوضح وأسهل من أي وقت مضى.",
  descriptionEnabled: true,
  primaryButtonText: "أنشئ جدولك الدراسي",
  primaryButtonLink: "/schedule",
  primaryButtonEnabled: true,
  secondaryButtonText: "تصفح الدوسيات",
  secondaryButtonLink: "/dossiers",
  secondaryButtonEnabled: true,
};

async function getHeroContent(): Promise<HeroContent> {
  const [row] = await db
    .select({ value: systemSettingsTable.value })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, HERO_KEY));

  if (!row?.value) return { ...HERO_DEFAULTS };

  try {
    return { ...HERO_DEFAULTS, ...JSON.parse(row.value) };
  } catch {
    return { ...HERO_DEFAULTS };
  }
}

function isValidLink(link: unknown): boolean {
  if (typeof link !== "string" || !link.trim()) return false;
  const v = link.trim();
  if (v.startsWith("/")) return true;
  if (/^https?:\/\/.+/.test(v)) return true;
  return false;
}

// ── Public: GET /api/homepage-settings ───────────────────────────────────────
router.get("/homepage-settings", async (_req, res): Promise<void> => {
  try {
    const content = await getHeroContent();
    res.json(content);
  } catch {
    res.json({ ...HERO_DEFAULTS });
  }
});

// ── Admin: GET /api/admin/homepage-settings ───────────────────────────────────
router.get(
  "/admin/homepage-settings",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  async (_req, res): Promise<void> => {
    try {
      const content = await getHeroContent();
      res.json(content);
    } catch {
      res.status(500).json({ error: "تعذر تحميل إعدادات الصفحة الرئيسية" });
    }
  }
);

// ── Admin: PATCH /api/admin/homepage-settings ─────────────────────────────────
router.patch(
  "/admin/homepage-settings",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const body = req.body as Partial<HeroContent>;

    // Validation
    if (body.titleLine1 !== undefined && body.titleLine1.length > 120) {
      res.status(400).json({ error: "العنوان طويل جدًا" });
      return;
    }
    if (body.titleLine2 !== undefined && body.titleLine2.length > 120) {
      res.status(400).json({ error: "العنوان طويل جدًا" });
      return;
    }
    if (body.primaryButtonEnabled && !body.primaryButtonText?.trim()) {
      res.status(400).json({ error: "عنوان الزر مطلوب" });
      return;
    }
    if (body.secondaryButtonEnabled && !body.secondaryButtonText?.trim()) {
      res.status(400).json({ error: "عنوان الزر مطلوب" });
      return;
    }
    if (body.primaryButtonLink !== undefined && !isValidLink(body.primaryButtonLink)) {
      res.status(400).json({ error: "الرابط غير صالح" });
      return;
    }
    if (body.secondaryButtonLink !== undefined && !isValidLink(body.secondaryButtonLink)) {
      res.status(400).json({ error: "الرابط غير صالح" });
      return;
    }

    try {
      const current = await getHeroContent();
      const updated: HeroContent = { ...current, ...body };

      await db
        .insert(systemSettingsTable)
        .values({
          key: HERO_KEY,
          value: JSON.stringify(updated),
          description: "محتوى Hero الصفحة الرئيسية",
          updatedBy: aReq.userId,
        })
        .onConflictDoUpdate({
          target: systemSettingsTable.key,
          set: {
            value: JSON.stringify(updated),
            updatedBy: aReq.userId,
            updatedAt: new Date(),
          },
        });

      res.json(updated);
    } catch {
      res.status(500).json({ error: "تعذر حفظ إعدادات الصفحة الرئيسية" });
    }
  }
);

export default router;
