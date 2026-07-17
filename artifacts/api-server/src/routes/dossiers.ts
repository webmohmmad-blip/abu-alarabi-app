import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  dossiersTable,
  dossierFavoritesTable,
  dossierProgressTable,
  subjectsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/dossiers", async (req, res): Promise<void> => {
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
      isFavorite: false,
      readingProgress: 0,
      lastReadPage: 1,
      isFree: dossier.isFree,
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
    isFree: row.dossier.isFree,
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

export default router;
