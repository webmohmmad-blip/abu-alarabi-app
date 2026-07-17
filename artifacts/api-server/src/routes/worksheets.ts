import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { worksheetsTable, subjectsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/worksheets", async (req, res): Promise<void> => {
  const { subjectId, search, page = "1", limit = "12" } = req.query as Record<
    string,
    string
  >;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 50);

  let rows = await db
    .select({
      ws: worksheetsTable,
      subjectName: subjectsTable.name,
    })
    .from(worksheetsTable)
    .leftJoin(subjectsTable, eq(worksheetsTable.subjectId, subjectsTable.id));

  if (subjectId) {
    rows = rows.filter(
      (r) => r.ws.subjectId === parseInt(subjectId, 10)
    );
  }
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
      subjectId: ws.subjectId,
      subjectName: subjectName ?? "",
      grade: ws.grade,
      difficulty: ws.difficulty,
      questionCount: ws.questionCount,
      estimatedMinutes: ws.estimatedMinutes,
      downloads: ws.downloads,
      solvers: ws.solvers,
      fileUrl: ws.fileUrl,
      isFree: ws.isFree,
      createdAt: ws.createdAt,
    }));

  res.json({ items, total, page: pageNum, limit: limitNum });
});

router.get("/worksheets/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const id = parseInt(rawId, 10);

  const [row] = await db
    .select({
      ws: worksheetsTable,
      subjectName: subjectsTable.name,
    })
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
    subjectId: row.ws.subjectId,
    subjectName: row.subjectName ?? "",
    grade: row.ws.grade,
    difficulty: row.ws.difficulty,
    questionCount: row.ws.questionCount,
    estimatedMinutes: row.ws.estimatedMinutes,
    downloads: row.ws.downloads,
    solvers: row.ws.solvers,
    fileUrl: row.ws.fileUrl,
    isFree: row.ws.isFree,
    createdAt: row.ws.createdAt,
  });
});

export default router;
