/**
 * Admin routes for summaries (ملخصات) management.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { summariesTable, subjectsTable } from "@workspace/db";
import { eq, isNull, desc, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();
router.use(requireAuth);
router.use(requireRole(["admin", "super_admin"]));

// ─── Admin: list all summaries ────────────────────────────────────────────────
router.get("/summaries", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      summary: summariesTable,
      subjectName: subjectsTable.name,
    })
    .from(summariesTable)
    .leftJoin(subjectsTable, eq(summariesTable.subjectId, subjectsTable.id))
    .where(isNull(summariesTable.deletedAt))
    .orderBy(desc(summariesTable.createdAt));

  res.json(rows.map(({ summary, subjectName }) => ({
    id: summary.id,
    title: summary.title,
    description: summary.description,
    subjectId: summary.subjectId,
    subjectName: subjectName ?? "",
    grade: summary.grade,
    type: summary.type,
    content: summary.content,
    fileUrl: summary.fileUrl,
    status: summary.status,
    views: summary.views,
    createdAt: summary.createdAt,
  })));
});

// ─── Admin: create summary ────────────────────────────────────────────────────
router.post("/summaries", async (req, res): Promise<void> => {
  const { title, description, subjectId, grade, type, content, fileUrl, status } = req.body;

  if (!title || !subjectId || !grade || !type) {
    res.status(400).json({ error: "العنوان، المادة، الصف، والنوع مطلوبة" });
    return;
  }

  const [summary] = await db
    .insert(summariesTable)
    .values({
      title,
      description: description || null,
      subjectId: parseInt(subjectId),
      grade,
      type: type as any,
      content: content || null,
      fileUrl: fileUrl || null,
      status: status || "draft",
    })
    .returning();

  res.status(201).json({ id: summary.id });
});

// ─── Admin: update summary ────────────────────────────────────────────────────
router.patch("/summaries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { title, description, subjectId, grade, type, content, fileUrl, status } = req.body;

  await db
    .update(summariesTable)
    .set({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(subjectId !== undefined && { subjectId: parseInt(subjectId) }),
      ...(grade !== undefined && { grade }),
      ...(type !== undefined && { type }),
      ...(content !== undefined && { content }),
      ...(fileUrl !== undefined && { fileUrl }),
      ...(status !== undefined && { status }),
    })
    .where(and(eq(summariesTable.id, id), isNull(summariesTable.deletedAt)));

  res.json({ updated: true });
});

// ─── Admin: delete summary ────────────────────────────────────────────────────
router.delete("/summaries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.update(summariesTable).set({ deletedAt: new Date() }).where(eq(summariesTable.id, id));
  res.status(204).send();
});

export default router;
