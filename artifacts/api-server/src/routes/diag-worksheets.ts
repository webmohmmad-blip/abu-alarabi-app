import { db, worksheetsTable, subjectsTable } from "@workspace/db";
import { eq, isNull, and, desc, sql } from "drizzle-orm";

async function diag() {
  console.log("Testing db connection for worksheets...");
  try {
    const rawCols = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'worksheets' ORDER BY ordinal_position;`);
    console.log("Worksheets DB Columns:", rawCols.rows);
  } catch (err) {
    console.error("Error fetching information_schema:", err);
  }

  try {
    const res = await db.select({ id: worksheetsTable.id, title: worksheetsTable.title }).from(worksheetsTable).limit(5);
    console.log("Sample worksheets (id, title):", res);
  } catch (err) {
    console.error("Error fetching simple worksheets:", err);
  }

  try {
    const res = await db.select({ ws: worksheetsTable }).from(worksheetsTable).limit(5);
    console.log("Sample worksheets (full select):", res);
  } catch (err) {
    console.error("Error fetching full worksheetsTable select:", err);
  }

  process.exit(0);
}

diag().catch(console.error);
