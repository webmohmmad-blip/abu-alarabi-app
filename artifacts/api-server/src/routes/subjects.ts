import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { subjectsTable, unitsTable, dossiersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable);
  res.json(
    subjects.map((s) => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      field: s.field,
      iconUrl: s.iconUrl,
      color: s.color,
      totalUnits: 0,
      totalLessons: 0,
      studentProgress: null,
    }))
  );
});

router.get("/subjects/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const id = parseInt(rawId, 10);

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, id));

  if (!subject) {
    res.status(404).json({ error: "المادة غير موجودة" });
    return;
  }

  const units = await db
    .select()
    .from(unitsTable)
    .where(eq(unitsTable.subjectId, id));

  // Count dossiers per unit
  const dossiers = await db
    .select()
    .from(dossiersTable)
    .where(eq(dossiersTable.subjectId, id));

  res.json({
    id: subject.id,
    name: subject.name,
    grade: subject.grade,
    field: subject.field,
    units: units.map((u) => ({
      id: u.id,
      title: u.title,
      order: u.order,
      totalLessons: 0,
      totalDossiers: dossiers.length,
      progress: null,
    })),
    studentProgress: null,
  });
});

export default router;
