/**
 * Workspace routes — annotations, bookmarks, reading progress
 * Supports both dossiers and worksheets via separate route groups.
 */
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  dossierAnnotationsTable,
  dossierBookmarksTable,
  dossierReadingProgressTable,
  worksheetAnnotationsTable,
  worksheetBookmarksTable,
  worksheetProgressTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

// ─── DOSSIER ANNOTATIONS ─────────────────────────────────────────────────────

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

router.put("/workspace/annotations/:dossierId/:page", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);
  const pageNumber = parseInt(req.params.page, 10);
  const { strokes } = req.body as { strokes: unknown[] };
  const strokesJson = JSON.stringify(strokes ?? []);

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
    await db.update(dossierAnnotationsTable).set({ strokesJson }).where(eq(dossierAnnotationsTable.id, existing.id));
  } else {
    await db.insert(dossierAnnotationsTable).values({ userId: aReq.userId, dossierId, pageNumber, strokesJson });
  }

  res.json({ ok: true });
});

// ─── DOSSIER BOOKMARKS ───────────────────────────────────────────────────────

router.get("/workspace/bookmarks/:dossierId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);

  const bookmarks = await db
    .select()
    .from(dossierBookmarksTable)
    .where(and(eq(dossierBookmarksTable.userId, aReq.userId), eq(dossierBookmarksTable.dossierId, dossierId)));

  res.json(bookmarks.map(b => ({ id: b.id, pageNumber: b.pageNumber, title: b.title, createdAt: b.createdAt })));
});

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

router.delete("/workspace/bookmarks/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const id = parseInt(req.params.id, 10);
  await db.delete(dossierBookmarksTable).where(and(eq(dossierBookmarksTable.id, id), eq(dossierBookmarksTable.userId, aReq.userId)));
  res.json({ ok: true });
});

// ─── DOSSIER READING PROGRESS ────────────────────────────────────────────────

router.get("/workspace/progress/:dossierId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);

  const [row] = await db
    .select()
    .from(dossierReadingProgressTable)
    .where(and(eq(dossierReadingProgressTable.userId, aReq.userId), eq(dossierReadingProgressTable.dossierId, dossierId)));

  res.json({ lastPage: row?.lastPage ?? 1 });
});

router.put("/workspace/progress/:dossierId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const dossierId = parseInt(req.params.dossierId, 10);
  const { lastPage } = req.body as { lastPage: number };

  const [existing] = await db
    .select({ id: dossierReadingProgressTable.id })
    .from(dossierReadingProgressTable)
    .where(and(eq(dossierReadingProgressTable.userId, aReq.userId), eq(dossierReadingProgressTable.dossierId, dossierId)));

  if (existing) {
    await db.update(dossierReadingProgressTable).set({ lastPage }).where(eq(dossierReadingProgressTable.id, existing.id));
  } else {
    await db.insert(dossierReadingProgressTable).values({ userId: aReq.userId, dossierId, lastPage });
  }

  res.json({ ok: true });
});

// ─── WORKSHEET ANNOTATIONS ───────────────────────────────────────────────────

router.get("/workspace/worksheet-annotations/:worksheetId/:page", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const worksheetId = parseInt(req.params.worksheetId, 10);
  const pageNumber = parseInt(req.params.page, 10);

  const [row] = await db
    .select()
    .from(worksheetAnnotationsTable)
    .where(
      and(
        eq(worksheetAnnotationsTable.userId, aReq.userId),
        eq(worksheetAnnotationsTable.worksheetId, worksheetId),
        eq(worksheetAnnotationsTable.pageNumber, pageNumber)
      )
    );

  res.json({ strokes: row ? JSON.parse(row.strokesJson) : [] });
});

router.put("/workspace/worksheet-annotations/:worksheetId/:page", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const worksheetId = parseInt(req.params.worksheetId, 10);
  const pageNumber = parseInt(req.params.page, 10);
  const { strokes } = req.body as { strokes: unknown[] };
  const strokesJson = JSON.stringify(strokes ?? []);

  const [existing] = await db
    .select({ id: worksheetAnnotationsTable.id })
    .from(worksheetAnnotationsTable)
    .where(
      and(
        eq(worksheetAnnotationsTable.userId, aReq.userId),
        eq(worksheetAnnotationsTable.worksheetId, worksheetId),
        eq(worksheetAnnotationsTable.pageNumber, pageNumber)
      )
    );

  if (existing) {
    await db.update(worksheetAnnotationsTable).set({ strokesJson }).where(eq(worksheetAnnotationsTable.id, existing.id));
  } else {
    await db.insert(worksheetAnnotationsTable).values({ userId: aReq.userId, worksheetId, pageNumber, strokesJson });
  }

  res.json({ ok: true });
});

// ─── WORKSHEET BOOKMARKS ─────────────────────────────────────────────────────

router.get("/workspace/worksheet-bookmarks/:worksheetId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const worksheetId = parseInt(req.params.worksheetId, 10);

  const bookmarks = await db
    .select()
    .from(worksheetBookmarksTable)
    .where(and(eq(worksheetBookmarksTable.userId, aReq.userId), eq(worksheetBookmarksTable.worksheetId, worksheetId)));

  res.json(bookmarks.map(b => ({ id: b.id, pageNumber: b.pageNumber, title: b.title, createdAt: b.createdAt })));
});

router.post("/workspace/worksheet-bookmarks/:worksheetId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const worksheetId = parseInt(req.params.worksheetId, 10);
  const { pageNumber, title } = req.body as { pageNumber: number; title?: string };

  const [bookmark] = await db
    .insert(worksheetBookmarksTable)
    .values({ userId: aReq.userId, worksheetId, pageNumber, title: title ?? `صفحة ${pageNumber}` })
    .returning();

  res.status(201).json({ id: bookmark.id, pageNumber: bookmark.pageNumber, title: bookmark.title, createdAt: bookmark.createdAt });
});

router.delete("/workspace/worksheet-bookmarks/:id", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const id = parseInt(req.params.id, 10);
  await db.delete(worksheetBookmarksTable).where(and(eq(worksheetBookmarksTable.id, id), eq(worksheetBookmarksTable.userId, aReq.userId)));
  res.json({ ok: true });
});

// ─── WORKSHEET READING PROGRESS ──────────────────────────────────────────────

router.get("/workspace/worksheet-progress/:worksheetId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const worksheetId = parseInt(req.params.worksheetId, 10);

  const [row] = await db
    .select()
    .from(worksheetProgressTable)
    .where(and(eq(worksheetProgressTable.userId, aReq.userId), eq(worksheetProgressTable.worksheetId, worksheetId)));

  res.json({ lastPage: row?.lastPage ?? 1 });
});

router.put("/workspace/worksheet-progress/:worksheetId", requireAuth, async (req, res): Promise<void> => {
  const aReq = req as AuthRequest;
  const worksheetId = parseInt(req.params.worksheetId, 10);
  const { lastPage } = req.body as { lastPage: number };

  const [existing] = await db
    .select({ id: worksheetProgressTable.id })
    .from(worksheetProgressTable)
    .where(and(eq(worksheetProgressTable.userId, aReq.userId), eq(worksheetProgressTable.worksheetId, worksheetId)));

  if (existing) {
    await db.update(worksheetProgressTable).set({ lastPage }).where(eq(worksheetProgressTable.id, existing.id));
  } else {
    await db.insert(worksheetProgressTable).values({ userId: aReq.userId, worksheetId, lastPage });
  }

  res.json({ ok: true });
});

export default router;
