import { Router, type IRouter, type Request, type Response } from "express";
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { worksheetsTable, subjectsTable } from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../lib/auth";

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

// ─── List worksheets (students) ───────────────────────────────────────────────
router.get("/worksheets", requireAuth, async (req, res): Promise<void> => {
  const { subjectId, search, page = "1", limit = "12" } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 50);

  let rows = await db
    .select({ ws: worksheetsTable, subjectName: subjectsTable.name })
    .from(worksheetsTable)
    .leftJoin(subjectsTable, eq(worksheetsTable.subjectId, subjectsTable.id))
    .where(isNull((worksheetsTable as any).deletedAt));

  if (subjectId) rows = rows.filter((r) => r.ws.subjectId === parseInt(subjectId, 10));
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((r) => r.ws.title.toLowerCase().includes(q));
  }

  const total = rows.length;
  const items = rows
    .slice((pageNum - 1) * limitNum, pageNum * limitNum)
    .map(({ ws, subjectName }) => ({
      id: ws.id,
      title: ws.title,
      description: (ws as any).description ?? null,
      subjectId: ws.subjectId,
      subjectName: subjectName ?? "",
      grade: ws.grade,
      estimatedMinutes: ws.estimatedMinutes,
      fileUrl: ws.fileUrl,
      coverUrl: (ws as any).coverUrl ?? null,
      downloads: ws.downloads,
      status: ws.status,
      createdAt: ws.createdAt,
    }));

  res.json({ items, total, page: pageNum, limit: limitNum });
});

// ─── Get single worksheet ────────────────────────────────────────────────────
router.get("/worksheets/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [row] = await db
    .select({ ws: worksheetsTable, subjectName: subjectsTable.name })
    .from(worksheetsTable)
    .leftJoin(subjectsTable, eq(worksheetsTable.subjectId, subjectsTable.id))
    .where(eq(worksheetsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "ورقة العمل غير موجودة" });
    return;
  }

  res.json({
    id: row.ws.id,
    title: row.ws.title,
    description: (row.ws as any).description ?? null,
    subjectId: row.ws.subjectId,
    subjectName: row.subjectName ?? "",
    grade: row.ws.grade,
    estimatedMinutes: row.ws.estimatedMinutes,
    fileUrl: row.ws.fileUrl,
    coverUrl: (row.ws as any).coverUrl ?? null,
    downloads: row.ws.downloads,
    status: row.ws.status,
    publishedAt: row.ws.publishedAt,
    createdAt: row.ws.createdAt,
  });
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
