/**
 * Sitemap and robots.txt routes.
 *
 * IMPORTANT — route registration:
 *   These are mounted DIRECTLY on the Express app (not under /api) in app.ts
 *   so they are reachable at /sitemap.xml and /robots.txt.
 *   They are ALSO exposed at /api/sitemap.xml via the /api router for
 *   backwards compatibility and for robots.txt reference.
 *
 * Production domain: https://malsahori.com
 *   Controlled by the SITE_URL env-var; defaults to malsahori.com.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { dossiersTable, worksheetsTable, examsTable } from "@workspace/db";
import { isNull, eq, and, isNotNull } from "drizzle-orm";

const router = Router();

export const SITE_URL = (process.env.SITE_URL ?? "https://malsahori.com").replace(/\/$/, "");

// ── XML helpers ───────────────────────────────────────────────────────────────

function escXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function buildSitemap(entries: SitemapEntry[]): string {
  // Deduplicate by loc
  const seen = new Set<string>();
  const unique = entries.filter(e => {
    if (seen.has(e.loc)) return false;
    seen.add(e.loc);
    return true;
  });

  const urls = unique
    .map((e) => {
      const lines = [`    <loc>${escXml(e.loc)}</loc>`];
      if (e.lastmod) lines.push(`    <lastmod>${escXml(e.lastmod)}</lastmod>`);
      if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority) lines.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function toISO(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  try {
    return new Date(date).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// ── Sitemap generator ─────────────────────────────────────────────────────────

async function generateSitemap(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  // Static public pages
  const staticEntries: SitemapEntry[] = [
    { loc: `${SITE_URL}/`,           changefreq: "daily",   priority: "1.0", lastmod: today },
    { loc: `${SITE_URL}/dossiers`,   changefreq: "daily",   priority: "0.9", lastmod: today },
    { loc: `${SITE_URL}/worksheets`, changefreq: "weekly",  priority: "0.8", lastmod: today },
    { loc: `${SITE_URL}/exams`,      changefreq: "weekly",  priority: "0.8", lastmod: today },
    { loc: `${SITE_URL}/quiz`,       changefreq: "weekly",  priority: "0.7", lastmod: today },
    { loc: `${SITE_URL}/summaries`,  changefreq: "weekly",  priority: "0.7", lastmod: today },
    { loc: `${SITE_URL}/videos`,     changefreq: "weekly",  priority: "0.6", lastmod: today },
  ];

  // Published dossiers
  const dossiers = await db
    .select({ id: dossiersTable.id, title: dossiersTable.title, updatedAt: dossiersTable.updatedAt })
    .from(dossiersTable)
    .where(
      and(
        isNull(dossiersTable.deletedAt),
        eq((dossiersTable as any).status, "published")
      )
    );

  const dossierEntries: SitemapEntry[] = dossiers.map((d) => ({
    loc: `${SITE_URL}/dossiers/${d.id}`,
    changefreq: "monthly" as const,
    priority: "0.7",
    lastmod: toISO(d.updatedAt),
  }));

  // Published worksheets
  const worksheets = await db
    .select({ id: worksheetsTable.id, updatedAt: worksheetsTable.updatedAt })
    .from(worksheetsTable)
    .where(
      and(
        isNull(worksheetsTable.deletedAt),
        eq((worksheetsTable as any).status, "published")
      )
    );

  const worksheetEntries: SitemapEntry[] = worksheets.map((w) => ({
    loc: `${SITE_URL}/worksheets/${w.id}`,
    changefreq: "monthly" as const,
    priority: "0.6",
    lastmod: toISO(w.updatedAt),
  }));

  // Published exams (full type, not weekly quizzes)
  const exams = await db
    .select({ id: examsTable.id, publishedAt: examsTable.publishedAt })
    .from(examsTable)
    .where(
      and(
        isNotNull(examsTable.publishedAt),
        eq(examsTable.type, "full")
      )
    );

  const examEntries: SitemapEntry[] = exams.map((e) => ({
    loc: `${SITE_URL}/exams/${e.id}`,
    changefreq: "yearly" as const,
    priority: "0.6",
    lastmod: toISO(e.publishedAt),
  }));

  return buildSitemap([...staticEntries, ...dossierEntries, ...worksheetEntries, ...examEntries]);
}

// ── Robots.txt content ────────────────────────────────────────────────────────

function generateRobots(): string {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "# Private — admin panel",
    "Disallow: /admin",
    "Disallow: /admin/",
    "",
    "# Private — authenticated student pages",
    "Disallow: /dashboard",
    "Disallow: /dashboard/",
    "Disallow: /profile",
    "Disallow: /settings",
    "Disallow: /study-room",
    "Disallow: /notes",
    "Disallow: /study-plan",
    "Disallow: /sessions-history",
    "Disallow: /onboarding",
    "",
    "# Auth pages",
    "Disallow: /login",
    "Disallow: /register",
    "",
    "# API — not meant for crawlers",
    "Disallow: /api/",
    "",
    "# Sitemaps",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Sitemap: ${SITE_URL}/api/sitemap.xml`,
  ].join("\n");
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /sitemap.xml  (mounted at app root AND under /api router)
 * Returns a dynamic XML sitemap of all publicly indexable pages.
 */
router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  try {
    const xml = await generateSitemap();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    // Ensure no HTML leaks through
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(xml);
  } catch (err) {
    console.error("[sitemap] generation failed:", err);
    // Return a minimal valid sitemap rather than crashing
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.status(200).send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escXml(SITE_URL)}/</loc></url>\n</urlset>`
    );
  }
});

/**
 * GET /robots.txt  (mounted at app root AND under /api router)
 * Returns plain-text crawler directives.
 */
router.get("/robots.txt", (_req, res): void => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(generateRobots());
});

export default router;
