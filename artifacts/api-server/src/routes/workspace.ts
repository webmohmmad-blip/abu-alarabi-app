/**
 * Workspace routes — annotations, bookmarks, reading progress
 * All tied to a specific user + dossier
 */
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  dossierAnnotationsTable,
  dossierBookmarksTable,
  dossierReadingProgressTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

// ─── ANNOTATIONS ────────────────────────────────────────────────────────────

// GET /workspace/annotations/:dossierId/:page
router.get("/workspace/annotations/:dossierId/:page", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);
  const pageNumber = parseInt(req.params.page, 10);

  const [row] = await db
    .select()
    .from(dossierAnnotationsTable)
    .where(
      and(
        eq(dossierAnnotationsTable.userId, aReq.userId),
        eq(dossierAnnotationsTable.dossierId, dossierId),
        eq(dossierAnnotationsTable.pageNumber, pageNumber)
      )
    );

  res.json({ strokes: row ? JSON.parse(row.strokesJson) : [] });
});

// PUT /workspace/annotations/:dossierId/:page
router.put("/workspace/annotations/:dossierId/:page", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);
  const pageNumber = parseInt(req.params.page, 10);
  const { strokes } = req.body as { strokes: unknown[] };

  const strokesJson = JSON.stringify(strokes ?? []);

  // Upsert
  const [existing] = await db
    .select({ id: dossierAnnotationsTable.id })
    .from(dossierAnnotationsTable)
    .where(
      and(
        eq(dossierAnnotationsTable.userId, aReq.userId),
        eq(dossierAnnotationsTable.dossierId, dossierId),
        eq(dossierAnnotationsTable.pageNumber, pageNumber)
      )
    );

  if (existing) {
    await db
      .update(dossierAnnotationsTable)
      .set({ strokesJson })
      .where(eq(dossierAnnotationsTable.id, existing.id));
  } else {
    await db.insert(dossierAnnotationsTable).values({
      userId: aReq.userId,
      dossierId,
      pageNumber,
      strokesJson,
    });
  }

  res.json({ ok: true });
});

// ─── BOOKMARKS ───────────────────────────────────────────────────────────────

// GET /workspace/bookmarks/:dossierId
router.get("/workspace/bookmarks/:dossierId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);

  const bookmarks = await db
    .select()
    .from(dossierBookmarksTable)
    .where(
      and(
        eq(dossierBookmarksTable.userId, aReq.userId),
        eq(dossierBookmarksTable.dossierId, dossierId)
      )
    );

  res.json(bookmarks.map(b => ({ id: b.id, pageNumber: b.pageNumber, title: b.title, createdAt: b.createdAt })));
});

// POST /workspace/bookmarks/:dossierId
router.post("/workspace/bookmarks/:dossierId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);
  const { pageNumber, title } = req.body as { pageNumber: number; title?: string };

  const [bookmark] = await db
    .insert(dossierBookmarksTable)
    .values({ userId: aReq.userId, dossierId, pageNumber, title: title ?? `صفحة ${pageNumber}` })
    .returning();

  res.status(201).json({ id: bookmark.id, pageNumber: bookmark.pageNumber, title: bookmark.title, createdAt: bookmark.createdAt });
});

// DELETE /workspace/bookmarks/:id
router.delete("/workspace/bookmarks/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const id = parseInt(req.params.id, 10);

  await db
    .delete(dossierBookmarksTable)
    .where(and(eq(dossierBookmarksTable.id, id), eq(dossierBookmarksTable.userId, aReq.userId)));

  res.json({ ok: true });
});

// ─── READING PROGRESS ────────────────────────────────────────────────────────

// GET /workspace/progress/:dossierId
router.get("/workspace/progress/:dossierId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);

  const [row] = await db
    .select()
    .from(dossierReadingProgressTable)
    .where(
      and(
        eq(dossierReadingProgressTable.userId, aReq.userId),
        eq(dossierReadingProgressTable.dossierId, dossierId)
      )
    );

  res.json({ lastPage: row?.lastPage ?? 1 });
});

// PUT /workspace/progress/:dossierId
router.put("/workspace/progress/:dossierId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);
  const { lastPage } = req.body as { lastPage: number };

  const [existing] = await db
    .select({ id: dossierReadingProgressTable.id })
    .from(dossierReadingProgressTable)
    .where(
      and(
        eq(dossierReadingProgressTable.userId, aReq.userId),
        eq(dossierReadingProgressTable.dossierId, dossierId)
      )
    );

  if (existing) {
    await db
      .update(dossierReadingProgressTable)
      .set({ lastPage })
      .where(eq(dossierReadingProgressTable.id, existing.id));
  } else {
    await db.insert(dossierReadingProgressTable).values({
      userId: aReq.userId,
      dossierId,
      lastPage,
    });
  }

  res.json({ ok: true });
});

export default router;
