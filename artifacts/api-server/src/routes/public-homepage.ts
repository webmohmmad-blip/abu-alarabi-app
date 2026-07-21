/**
 * GET /api/public/homepage
 *
 * Single combined endpoint that returns everything the homepage needs
 * above the fold, in one network round-trip:
 *   - hero content (from system_settings)
 *   - active advertisements
 *   - 3 featured published dossiers
 *
 * No auth required. Cached 60 s (stale-while-revalidate 5 min).
 */
import { Router } from "express";
import { and, asc, desc, isNull, eq, lte, gt, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { systemSettingsTable, homepageAdsTable, dossiersTable } from "@workspace/db";

const router = Router();

// ── Hero helpers ──────────────────────────────────────────────────────────────

const HERO_KEY = "hero_content";

const HERO_DEFAULTS = {
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

async function getHero() {
  try {
    const [row] = await db
      .select({ value: systemSettingsTable.value })
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.key, HERO_KEY));
    if (!row?.value) return { ...HERO_DEFAULTS };
    return { ...HERO_DEFAULTS, ...JSON.parse(row.value) };
  } catch {
    return { ...HERO_DEFAULTS };
  }
}

// ── Ad helpers ────────────────────────────────────────────────────────────────

function adImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/storage${key}`;
}

function activeFilter() {
  const now = new Date();
  return and(
    eq(homepageAdsTable.isActive, true),
    or(isNull(homepageAdsTable.startAt), lte(homepageAdsTable.startAt, now)),
    or(isNull(homepageAdsTable.endAt), gt(homepageAdsTable.endAt, now)),
  );
}

function serializeAd(ad: typeof homepageAdsTable.$inferSelect) {
  return {
    id: ad.id,
    title: ad.title,
    description: ad.description,
    imageUrl: adImageUrl(ad.imageKey),
    mobileImageUrl: adImageUrl(ad.mobileImageKey),
    linkUrl: ad.linkUrl,
    openInNewTab: ad.openInNewTab,
  };
}

// ── Dossier helpers ───────────────────────────────────────────────────────────

function dossierImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/storage${key}`;
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.get("/public/homepage", async (_req, res): Promise<void> => {
  try {
    const [hero, rawAds, rawDossiers] = await Promise.all([
      getHero(),
      db
        .select()
        .from(homepageAdsTable)
        .where(activeFilter())
        .orderBy(asc(homepageAdsTable.position), desc(homepageAdsTable.createdAt))
        .limit(10),
      db
        .select()
        .from(dossiersTable)
        .where(
          and(
            isNull(dossiersTable.deletedAt),
            eq(dossiersTable.status, "published"),
          ),
        )
        .orderBy(desc(dossiersTable.updatedAt))
        .limit(3),
    ]);

    const ads = rawAds.map(serializeAd);

    const featuredDossiers = rawDossiers.map((d) => ({
      id: d.id,
      title: d.title,
      coverUrl: (d as any).coverUrl ?? null,
      subjectName: null as string | null,   // requires join — omit for performance
      pageCount: d.pageCount ?? 0,
      rating: Number((d as any).rating ?? 0).toFixed(1),
    }));

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ ok: true, hero, ads, featuredDossiers });
  } catch (err) {
    console.error("[public-homepage] error", err);
    // Return defaults so the page can still render
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: false, hero: HERO_DEFAULTS, ads: [], featuredDossiers: [] });
  }
});

export default router;
