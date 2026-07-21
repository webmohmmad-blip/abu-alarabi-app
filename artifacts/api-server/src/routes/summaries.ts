/**
 * Public/student routes for summaries.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { summariesTable, subjectsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { eq, isNull, desc, and } from "drizzle-orm";

const router = Router();

router.get("/summaries", requireAuth, async (req, res): Promise<void> => {
  const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
  const grade = req.query.grade as string | undefined;

  const rows = await db
    .select({
      summary: summariesTable,
      subjectName: subjectsTable.name,
      subjectColor: subjectsTable.color,
    })
    .from(summariesTable)
    .leftJoin(subjectsTable, eq(summariesTable.subjectId, subjectsTable.id))
    .where(
      and(
        isNull(summariesTable.deletedAt),
        eq(summariesTable.status, "published"),
        subjectId ? eq(summariesTable.subjectId, subjectId) : undefined,
        grade ? eq(summariesTable.grade, grade) : undefined
      )
    )
    .orderBy(desc(summariesTable.createdAt));

  res.json(rows.map(({ summary, subjectName, subjectColor }) => ({
    id: summary.id,
    title: summary.title,
    description: summary.description,
    subjectId: summary.subjectId,
    subjectName: subjectName ?? "",
    subjectColor: subjectColor ?? "#5A2D82",
    grade: summary.grade,
    type: summary.type,
    content: summary.content,
    fileUrl: summary.fileUrl,
    views: summary.views,
    createdAt: summary.createdAt,
  })));
});

router.get("/summaries/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [row] = await db
    .select({
      summary: summariesTable,
      subjectName: subjectsTable.name,
      subjectColor: subjectsTable.color,
    })
    .from(summariesTable)
    .leftJoin(subjectsTable, eq(summariesTable.subjectId, subjectsTable.id))
    .where(and(eq(summariesTable.id, id), isNull(summariesTable.deletedAt)));

  if (!row) { res.status(404).json({ error: "الملخص غير موجود" }); return; }
  await db.update(summariesTable).set({ views: row.summary.views + 1 }).where(eq(summariesTable.id, id));

  res.json({
    ...row.summary,
    subjectName: row.subjectName ?? "",
    subjectColor: row.subjectColor ?? "#5A2D82",
    views: row.summary.views + 1,
  });
});

export default router;
