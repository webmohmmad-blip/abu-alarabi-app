import { Router, type IRouter } from "express";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { videosTable, subjectsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

// ─── Public: list videos ──────────────────────────────────────────────────────
router.get("/videos", async (req, res): Promise<void> => {
  const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
  const grade = req.query.grade as string | undefined;
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(50, parseInt((req.query.limit as string) || "20"));
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      video: videosTable,
      subjectName: subjectsTable.name,
      subjectColor: subjectsTable.color,
    })
    .from(videosTable)
    .leftJoin(subjectsTable, eq(videosTable.subjectId, subjectsTable.id))
    .where(
      and(
        isNull(videosTable.deletedAt),
        eq(videosTable.isPublished, 1),
        subjectId ? eq(videosTable.subjectId, subjectId) : undefined,
        grade ? eq(videosTable.grade, grade) : undefined
      )
    )
    .orderBy(videosTable.order, desc(videosTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    items: rows.map(({ video, subjectName, subjectColor }) => ({
      id: video.id,
      title: video.title,
      description: video.description,
      subjectId: video.subjectId,
      subjectName: subjectName ?? "",
      subjectColor: subjectColor ?? "#5A2D82",
      grade: video.grade,
      provider: video.provider,
      videoUrl: video.videoUrl,
      embedUrl: buildEmbedUrl(video.provider, video.videoUrl),
      durationMinutes: video.durationMinutes,
      coverUrl: video.coverUrl ?? buildThumbnail(video.provider, video.videoUrl),
      views: video.views,
      order: video.order,
      createdAt: video.createdAt,
    })),
    total: rows.length,
  });
});

// ─── Public: get single video ─────────────────────────────────────────────────
router.get("/videos/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db
    .select({
      video: videosTable,
      subjectName: subjectsTable.name,
      subjectColor: subjectsTable.color,
    })
    .from(videosTable)
    .leftJoin(subjectsTable, eq(videosTable.subjectId, subjectsTable.id))
    .where(and(eq(videosTable.id, id), isNull(videosTable.deletedAt)));

  if (!row) {
    res.status(404).json({ error: "الفيديو غير موجود" });
    return;
  }

  // Increment views
  await db.update(videosTable).set({ views: row.video.views + 1 }).where(eq(videosTable.id, id));

  const { video, subjectName, subjectColor } = row;
  res.json({
    id: video.id,
    title: video.title,
    description: video.description,
    subjectId: video.subjectId,
    subjectName: subjectName ?? "",
    subjectColor: subjectColor ?? "#5A2D82",
    grade: video.grade,
    provider: video.provider,
    videoUrl: video.videoUrl,
    embedUrl: buildEmbedUrl(video.provider, video.videoUrl),
    durationMinutes: video.durationMinutes,
    coverUrl: video.coverUrl ?? buildThumbnail(video.provider, video.videoUrl),
    views: video.views + 1,
    order: video.order,
    createdAt: video.createdAt,
  });
});

// ─── Admin: create video ──────────────────────────────────────────────────────
router.post("/admin/videos", requireAuth, requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const { title, description, subjectId, grade, provider, videoUrl, durationMinutes, coverUrl, order } = req.body;

  if (!title || !subjectId || !grade || !videoUrl) {
    res.status(400).json({ error: "يرجى تعبئة الحقول المطلوبة: العنوان، المادة، الصف، ورابط الفيديو" });
    return;
  }

  const [video] = await db
    .insert(videosTable)
    .values({
      title,
      description: description || null,
      subjectId: parseInt(subjectId),
      grade,
      provider: provider || "youtube",
      videoUrl,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      coverUrl: coverUrl || null,
      order: order ? parseInt(order) : 0,
      isPublished: 1,
    })
    .returning();

  res.status(201).json({ id: video.id, message: "تم إضافة الفيديو بنجاح" });
});

// ─── Admin: update video ──────────────────────────────────────────────────────
router.patch("/admin/videos/:id", requireAuth, requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { title, description, subjectId, grade, provider, videoUrl, durationMinutes, coverUrl, order, isPublished } = req.body;

  await db
    .update(videosTable)
    .set({
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(subjectId && { subjectId: parseInt(subjectId) }),
      ...(grade && { grade }),
      ...(provider && { provider }),
      ...(videoUrl && { videoUrl }),
      ...(durationMinutes !== undefined && { durationMinutes: durationMinutes ? parseInt(durationMinutes) : null }),
      ...(coverUrl !== undefined && { coverUrl }),
      ...(order !== undefined && { order: parseInt(order) }),
      ...(isPublished !== undefined && { isPublished: isPublished ? 1 : 0 }),
    })
    .where(and(eq(videosTable.id, id), isNull(videosTable.deletedAt)));

  res.json({ message: "تم تحديث الفيديو" });
});

// ─── Admin: delete video (soft) ───────────────────────────────────────────────
router.delete("/admin/videos/:id", requireAuth, requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.update(videosTable).set({ deletedAt: new Date() }).where(eq(videosTable.id, id));
  res.json({ message: "تم حذف الفيديو" });
});

// ─── Admin: list all videos (including drafts) ────────────────────────────────
router.get("/admin/videos", requireAuth, requireRole(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const rows = await db
    .select({ video: videosTable, subjectName: subjectsTable.name })
    .from(videosTable)
    .leftJoin(subjectsTable, eq(videosTable.subjectId, subjectsTable.id))
    .where(isNull(videosTable.deletedAt))
    .orderBy(desc(videosTable.createdAt));

  res.json(rows.map(({ video, subjectName }) => ({
    id: video.id,
    title: video.title,
    subjectId: video.subjectId,
    subjectName: subjectName ?? "",
    grade: video.grade,
    provider: video.provider,
    videoUrl: video.videoUrl,
    embedUrl: buildEmbedUrl(video.provider, video.videoUrl),
    durationMinutes: video.durationMinutes,
    coverUrl: video.coverUrl ?? buildThumbnail(video.provider, video.videoUrl),
    views: video.views,
    isPublished: video.isPublished === 1,
    createdAt: video.createdAt,
  })));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEmbedUrl(provider: string, url: string): string {
  try {
    if (provider === "youtube") {
      const id = extractYouTubeId(url);
      return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&color=white` : url;
    }
    if (provider === "vimeo") {
      const m = url.match(/vimeo\.com\/(\d+)/);
      return m ? `https://player.vimeo.com/video/${m[1]}?dnt=1` : url;
    }
    if (provider === "bunny") {
      // Bunny Stream: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
      return url; // Admin enters the embed URL directly for Bunny
    }
    if (provider === "cloudflare") {
      // Cloudflare Stream: https://iframe.cloudflarestream.com/{videoId}
      return url;
    }
    return url;
  } catch {
    return url;
  }
}

function buildThumbnail(provider: string, url: string): string | null {
  if (provider === "youtube") {
    const id = extractYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
  }
  return null;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default router;
