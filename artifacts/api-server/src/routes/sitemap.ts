/**
 * GET /sitemap.xml
 * Dynamically generates a sitemap that includes all public pages
 * plus published dossiers, worksheets, and exams from the database.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { dossiersTable, worksheetsTable, examsTable } from "@workspace/db";
import { isNull, eq, and, isNotNull } from "drizzle-orm";

const router = Router();

const SITE_URL = process.env.SITE_URL ?? "https://abu-alarabi.replit.app";

function escXml(s: string): string {
  return s
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
  const urls = entries
    .map((e) => {
      const lines = [`    <loc>${escXml(e.loc)}</loc>`];
      if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority) lines.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;
}

router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // ── Static public pages ───────────────────────────────────────────────────
    const staticEntries: SitemapEntry[] = [
      { loc: `${SITE_URL}/`,           changefreq: "daily",   priority: "1.0", lastmod: today },
      { loc: `${SITE_URL}/dossiers`,   changefreq: "daily",   priority: "0.9", lastmod: today },
      { loc: `${SITE_URL}/worksheets`, changefreq: "weekly",  priority: "0.8", lastmod: today },
      { loc: `${SITE_URL}/exams`,      changefreq: "weekly",  priority: "0.8", lastmod: today },
      { loc: `${SITE_URL}/quiz`,       changefreq: "weekly",  priority: "0.7", lastmod: today },
      { loc: `${SITE_URL}/summaries`,  changefreq: "weekly",  priority: "0.7", lastmod: today },
      { loc: `${SITE_URL}/schedule`,   changefreq: "monthly", priority: "0.5", lastmod: today },
    ];

    // ── Published dossiers ────────────────────────────────────────────────────
    const dossiers = await db
      .select({ id: dossiersTable.id, title: dossiersTable.title, updatedAt: dossiersTable.updatedAt })
      .from(dossiersTable)
      .where(and(isNull(dossiersTable.deletedAt), eq((dossiersTable as any).status, "published")));

    const dossierEntries: SitemapEntry[] = dossiers.map((d) => ({
      loc: `${SITE_URL}/dossiers/${d.id}`,
      changefreq: "monthly" as const,
      priority: "0.7",
      lastmod: d.updatedAt ? new Date(d.updatedAt).toISOString().slice(0, 10) : today,
    }));

    // ── Published worksheets ─────────────────────────────────────────────────
    const worksheets = await db
      .select({ id: worksheetsTable.id, title: worksheetsTable.title, updatedAt: worksheetsTable.updatedAt })
      .from(worksheetsTable)
      .where(and(isNull(worksheetsTable.deletedAt), eq((worksheetsTable as any).status, "published")));

    const worksheetEntries: SitemapEntry[] = worksheets.map((w) => ({
      loc: `${SITE_URL}/worksheets/${w.id}`,
      changefreq: "monthly" as const,
      priority: "0.6",
      lastmod: w.updatedAt ? new Date(w.updatedAt).toISOString().slice(0, 10) : today,
    }));

    // ── Published exams (non-weekly) ─────────────────────────────────────────
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
      lastmod: e.publishedAt ? new Date(e.publishedAt).toISOString().slice(0, 10) : today,
    }));

    const all = [...staticEntries, ...dossierEntries, ...worksheetEntries, ...examEntries];

    const xml = buildSitemap(all);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.send(xml);
  } catch (err) {
    console.error("[sitemap]", err);
    res.status(500).send("<!-- sitemap generation failed -->");
  }
});

export default router;
