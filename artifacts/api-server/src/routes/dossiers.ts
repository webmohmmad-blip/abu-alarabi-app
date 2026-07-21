import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  dossiersTable,
  dossierFavoritesTable,
  dossierProgressTable,
  subjectsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const objectStorageService = new ObjectStorageService();

/** Convert stored fileUrl (/api/storage/objects/...) to objectPath (/objects/...) */
function fileUrlToObjectPath(fileUrl: string): string | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("/api/storage")) return fileUrl.slice("/api/storage".length);
  if (fileUrl.startsWith("/objects/")) return fileUrl;
  return null;
}

const router: IRouter = Router();

router.get("/dossiers", requireAuth, async (req, res): Promise<void> => {
  const { subjectId, search, page = "1", limit = "12" } = req.query as Record<
    string,
    string
  >;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 50);

  let rows = await db
    .select({
      dossier: dossiersTable,
      subjectName: subjectsTable.name,
    })
    .from(dossiersTable)
    .leftJoin(subjectsTable, eq(dossiersTable.subjectId, subjectsTable.id))
    .where(isNull((dossiersTable as any).deletedAt))
    .orderBy(desc(dossiersTable.createdAt));

  if (subjectId) {
    rows = rows.filter(
      (d) => d.dossier.subjectId === parseInt(subjectId, 10)
    );
  }
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((d) => d.dossier.title.toLowerCase().includes(q));
  }

  const total = rows.length;
  const items = rows
    .slice((pageNum - 1) * limitNum, pageNum * limitNum)
    .map(({ dossier, subjectName }) => ({
      id: dossier.id,
      title: dossier.title,
      description: dossier.description,
      subjectId: dossier.subjectId,
      subjectName: subjectName ?? "",
      grade: dossier.grade,
      pageCount: dossier.pageCount,
      fileSize: dossier.fileSize,
      downloads: dossier.downloads,
      views: dossier.views,
      rating: parseFloat(dossier.rating ?? "0"),
      coverUrl: dossier.coverUrl,
      fileUrl: dossier.fileUrl,
      status: (dossier as any).status ?? "published",
      isFavorite: false,
      readingProgress: 0,
      lastReadPage: 1,
      createdAt: dossier.createdAt,
    }));

  res.json({ items, total, page: pageNum, limit: limitNum });
});

router.get("/dossiers/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const id = parseInt(rawId, 10);

  const [row] = await db
    .select({
      dossier: dossiersTable,
      subjectName: subjectsTable.name,
    })
    .from(dossiersTable)
    .leftJoin(subjectsTable, eq(dossiersTable.subjectId, subjectsTable.id))
    .where(eq(dossiersTable.id, id));

  if (!row) {
    res.status(404).json({ error: "الدوسيه غير موجود" });
    return;
  }

  const [fav] = await db
    .select()
    .from(dossierFavoritesTable)
    .where(
      and(
        eq(dossierFavoritesTable.userId, aReq.userId),
        eq(dossierFavoritesTable.dossierId, id)
      )
    );

  const [progress] = await db
    .select()
    .from(dossierProgressTable)
    .where(
      and(
        eq(dossierProgressTable.userId, aReq.userId),
        eq(dossierProgressTable.dossierId, id)
      )
    );

  await db
    .update(dossiersTable)
    .set({ views: row.dossier.views + 1 })
    .where(eq(dossiersTable.id, id));

  res.json({
    id: row.dossier.id,
    title: row.dossier.title,
    description: row.dossier.description,
    subjectId: row.dossier.subjectId,
    subjectName: row.subjectName ?? "",
    grade: row.dossier.grade,
    pageCount: row.dossier.pageCount,
    fileSize: row.dossier.fileSize,
    downloads: row.dossier.downloads,
    views: row.dossier.views + 1,
    rating: parseFloat(row.dossier.rating ?? "0"),
    coverUrl: row.dossier.coverUrl,
    fileUrl: row.dossier.fileUrl,
    isFavorite: !!fav,
    readingProgress: progress?.readingProgress ?? 0,
    lastReadPage: progress?.lastReadPage ?? 1,
    createdAt: row.dossier.createdAt,
  });
});

router.post(
  "/dossiers/:id/favorite",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const dossierId = parseInt(rawId, 10);

    const [existing] = await db
      .select()
      .from(dossierFavoritesTable)
      .where(
        and(
          eq(dossierFavoritesTable.userId, aReq.userId),
          eq(dossierFavoritesTable.dossierId, dossierId)
        )
      );

    if (existing) {
      await db
        .delete(dossierFavoritesTable)
        .where(eq(dossierFavoritesTable.id, existing.id));
      res.json({ isFavorite: false });
    } else {
      await db
        .insert(dossierFavoritesTable)
        .values({ userId: aReq.userId, dossierId });
      res.json({ isFavorite: true });
    }
  }
);

router.patch(
  "/dossiers/:id/progress",
  requireAuth,
  async (req, res): Promise<void> => {
    const aReq = req as AuthRequest;
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const dossierId = parseInt(rawId, 10);
    const { currentPage } = req.body as { currentPage: number };

    const [dossier] = await db
      .select()
      .from(dossiersTable)
      .where(eq(dossiersTable.id, dossierId));

    if (!dossier) {
      res.status(404).json({ error: "الدوسيه غير موجود" });
      return;
    }

    const progress =
      dossier.pageCount > 0
        ? Math.round((currentPage / dossier.pageCount) * 100)
        : 0;

    const [existing] = await db
      .select()
      .from(dossierProgressTable)
      .where(
        and(
          eq(dossierProgressTable.userId, aReq.userId),
          eq(dossierProgressTable.dossierId, dossierId)
        )
      );

    if (existing) {
      await db
        .update(dossierProgressTable)
        .set({ lastReadPage: currentPage, readingProgress: progress })
        .where(eq(dossierProgressTable.id, existing.id));
    } else {
      await db.insert(dossierProgressTable).values({
        userId: aReq.userId,
        dossierId,
        lastReadPage: currentPage,
        readingProgress: progress,
      });
    }

    res.json({ success: true, readingProgress: progress });
  }
);

// ─── Shared streaming helper ──────────────────────────────────────────────────
async function streamDossierPdf(
  req: Request,
  res: Response,
  disposition: "inline" | "attachment",
): Promise<void> {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [row] = await db
    .select({ fileUrl: dossiersTable.fileUrl, title: dossiersTable.title, status: dossiersTable.status })
    .from(dossiersTable)
    .where(eq(dossiersTable.id, id));

  if (!row) {
    res.status(404).json({ ok: false, message: "الدوسية غير موجودة" });
    return;
  }

  if (!row.fileUrl) {
    res.status(404).json({ ok: false, message: "ملف الدوسية غير متوفر" });
    return;
  }

  const objectPath = fileUrlToObjectPath(row.fileUrl);
  if (!objectPath) {
    res.status(404).json({ ok: false, message: "ملف الدوسية غير متوفر" });
    return;
  }

  try {
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const [metadata] = await objectFile.getMetadata();
    const fileSize = metadata.size ? Number(metadata.size) : undefined;

    // Safe ASCII filename for Content-Disposition
    const safeTitle = (row.title ?? "dossier").replace(/[^\w\s-]/g, "").trim() || "dossier";
    const contentDisposition = `${disposition}; filename="${safeTitle}.pdf"`;

    const rangeHeader = req.headers.range;

    if (rangeHeader && fileSize !== undefined) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        res.status(416).set("Content-Range", `bytes */${fileSize}`).end();
        return;
      }
      const start = parseInt(match[1], 10);
      const end = match[2] !== "" ? parseInt(match[2], 10) : fileSize - 1;
      const safeEnd = Math.min(end, fileSize - 1);
      const chunkSize = safeEnd - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${safeEnd}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
        "Cache-Control": "private, max-age=3600",
      });
      objectFile.createReadStream({ start, end: safeEnd }).pipe(res);
    } else {
      const headers: Record<string, string | number> = {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      };
      if (fileSize !== undefined) headers["Content-Length"] = fileSize;

      res.writeHead(200, headers);
      objectFile.createReadStream().pipe(res);
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ ok: false, message: "ملف الدوسية غير متوفر" });
      return;
    }
    console.error("Error streaming dossier PDF", error);
    res.status(500).json({ ok: false, message: "خطأ في تحميل الملف" });
  }
}

/**
 * GET /dossiers/:id/view
 * Stream the PDF inline (for PDF.js / Study Room). No auth required.
 */
router.get("/dossiers/:id/view", async (req: Request, res: Response): Promise<void> => {
  await streamDossierPdf(req, res, "inline");
});

/**
 * GET /dossiers/:id/download
 * Stream the PDF as an attachment download. No auth required (published content).
 * Increments the downloads counter (best-effort, non-blocking).
 */
router.get("/dossiers/:id/download", async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  // Increment counter best-effort (do not await — streaming must start immediately)
  db.update(dossiersTable)
    .set({ downloads: sql`${dossiersTable.downloads} + 1` })
    .where(eq(dossiersTable.id, id))
    .catch(() => {});

  await streamDossierPdf(req, res, "attachment");
});

export default router;
