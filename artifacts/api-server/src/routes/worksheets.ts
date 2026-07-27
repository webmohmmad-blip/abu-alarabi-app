import { Router, type IRouter, type Request, type Response } from "express";
import { eq, isNull, sql, and, desc, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { worksheetsTable, subjectsTable } from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/** Convert stored fileUrl (/api/storage/objects/...) to objectPath (/objects/...) */
function fileUrlToObjectPath(fileUrl: string): string | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("/api/storage")) return fileUrl.slice("/api/storage".length);
  if (fileUrl.startsWith("/objects/")) return fileUrl;
  return null;
}

// ─── Shared streaming helper ──────────────────────────────────────────────────
async function streamWorksheetPdf(
  req: Request,
  res: Response,
  disposition: "inline" | "attachment",
): Promise<void> {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [row] = await db
    .select({ fileUrl: worksheetsTable.fileUrl, title: worksheetsTable.title })
    .from(worksheetsTable)
    .where(eq(worksheetsTable.id, id));

  if (!row) {
    res.status(404).json({ ok: false, message: "ورقة العمل غير موجودة" });
    return;
  }
  if (!row.fileUrl) {
    res.status(404).json({ ok: false, message: "ملف ورقة العمل غير متوفر" });
    return;
  }

  const objectPath = fileUrlToObjectPath(row.fileUrl);
  if (!objectPath) {
    res.status(404).json({ ok: false, message: "ملف ورقة العمل غير متوفر" });
    return;
  }

  try {
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const [metadata] = await objectFile.getMetadata();
    const fileSize = metadata.size ? Number(metadata.size) : undefined;

    const safeTitle = (row.title ?? "worksheet").replace(/[^\w\s-]/g, "").trim() || "worksheet";
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
      res.status(404).json({ ok: false, message: "ملف ورقة العمل غير متوفر" });
      return;
    }
    console.error("Error streaming worksheet PDF", error);
    res.status(500).json({ ok: false, message: "خطأ في تحميل الملف" });
  }
}

// ─── List worksheets ───────────────────────────────────────────────────────────
router.get("/worksheets", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { subjectId, search, page = "1", limit = "12" } = req.query as Record<string, string>;

    const parsedPage = parseInt(page, 10);
    const pageNum = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

    const parsedLimit = parseInt(limit, 10);
    const limitNum = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 12 : Math.min(parsedLimit, 50);

    const userRole = (req as AuthRequest).userRole;
    const isAdmin = userRole === "admin" || userRole === "super_admin";

    const conditions = [isNull(worksheetsTable.deletedAt as any)];

    // Non-admin users see published or default worksheets
    if (!isAdmin) {
      conditions.push(
        or(
          eq((worksheetsTable as any).status, "published"),
          isNull((worksheetsTable as any).status)
        ) as any
      );
    }

    if (subjectId) {
      const parsedSubjectId = parseInt(subjectId, 10);
      if (!Number.isNaN(parsedSubjectId)) {
        conditions.push(eq(worksheetsTable.subjectId, parsedSubjectId));
      }
    }

    if (search?.trim()) {
      conditions.push(sql`LOWER(${worksheetsTable.title}) LIKE ${`%${search.trim().toLowerCase()}%`}`);
    }

    const whereClause = and(...conditions);

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(worksheetsTable).where(whereClause),
      db
        .select({
          id: worksheetsTable.id,
          title: worksheetsTable.title,
          description: worksheetsTable.description,
          subjectId: worksheetsTable.subjectId,
          grade: worksheetsTable.grade,
          estimatedMinutes: worksheetsTable.estimatedMinutes,
          fileUrl: worksheetsTable.fileUrl,
          coverUrl: worksheetsTable.coverUrl,
          downloads: worksheetsTable.downloads,
          status: worksheetsTable.status,
          createdAt: worksheetsTable.createdAt,
          subjectName: subjectsTable.name,
        })
        .from(worksheetsTable)
        .leftJoin(subjectsTable, eq(worksheetsTable.subjectId, subjectsTable.id))
        .where(whereClause)
        .orderBy(desc(worksheetsTable.createdAt))
        .limit(limitNum)
        .offset((pageNum - 1) * limitNum),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items = rows.map((ws) => ({
      id: ws.id,
      title: ws.title,
      description: ws.description ?? null,
      subjectId: ws.subjectId,
      subjectName: ws.subjectName ?? "",
      grade: ws.grade,
      estimatedMinutes: ws.estimatedMinutes ?? 30,
      fileUrl: ws.fileUrl,
      coverUrl: ws.coverUrl ?? null,
      downloads: ws.downloads ?? 0,
      status: ws.status ?? "published",
      createdAt: ws.createdAt,
    }));

    res.json({ items, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error("Error in GET /api/worksheets:", error);
    res.status(500).json({ error: "تعذر جلب أوراق العمل" });
  }
});

// ─── Get single worksheet ────────────────────────────────────────────────────
router.get("/worksheets/:id", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ error: "معرف ورقة العمل غير صالح" });
      return;
    }

    const [row] = await db
      .select({
        id: worksheetsTable.id,
        title: worksheetsTable.title,
        description: worksheetsTable.description,
        subjectId: worksheetsTable.subjectId,
        grade: worksheetsTable.grade,
        estimatedMinutes: worksheetsTable.estimatedMinutes,
        fileUrl: worksheetsTable.fileUrl,
        coverUrl: worksheetsTable.coverUrl,
        downloads: worksheetsTable.downloads,
        status: worksheetsTable.status,
        publishedAt: worksheetsTable.publishedAt,
        createdAt: worksheetsTable.createdAt,
        subjectName: subjectsTable.name,
      })
      .from(worksheetsTable)
      .leftJoin(subjectsTable, eq(worksheetsTable.subjectId, subjectsTable.id))
      .where(and(eq(worksheetsTable.id, id), isNull(worksheetsTable.deletedAt as any)));

    if (!row) {
      res.status(404).json({ error: "ورقة العمل غير موجودة" });
      return;
    }

    const userRole = (req as AuthRequest).userRole;
    const isAdmin = userRole === "admin" || userRole === "super_admin";
    const statusVal = (row as any).status ?? "published";

    if (!isAdmin && statusVal !== "published") {
      res.status(404).json({ error: "ورقة العمل غير متاحة" });
      return;
    }

    res.json({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      subjectId: row.subjectId,
      subjectName: row.subjectName ?? "",
      grade: row.grade,
      estimatedMinutes: row.estimatedMinutes ?? 30,
      fileUrl: row.fileUrl,
      coverUrl: row.coverUrl ?? null,
      downloads: row.downloads ?? 0,
      status: statusVal,
      publishedAt: row.publishedAt ?? null,
      createdAt: row.createdAt,
    });
  } catch (error) {
    console.error("Error in GET /api/worksheets/:id:", error);
    res.status(500).json({ error: "تعذر جلب ورقة العمل" });
  }
});

// ─── View PDF inline (for PDF.js / Study Room) ───────────────────────────────
router.get("/worksheets/:id/view", async (req: Request, res: Response): Promise<void> => {
  await streamWorksheetPdf(req, res, "inline");
});

// ─── Download PDF as attachment ───────────────────────────────────────────────
router.get("/worksheets/:id/download", async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  // Increment downloads counter (best-effort, non-blocking)
  db.update(worksheetsTable)
    .set({ downloads: sql`${worksheetsTable.downloads} + 1` })
    .where(eq(worksheetsTable.id, id))
    .catch(() => {});

  await streamWorksheetPdf(req, res, "attachment");
});

export default router;
