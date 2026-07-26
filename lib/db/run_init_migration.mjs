import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runInitMigration() {
  const sqlFile = path.join(__dirname, 'drizzle', '0000_init.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');
  
  // Split by the Drizzle statement breakpoint marker
  const statements = sql.split(/--> statement-breakpoint|-->statement-breakpoint/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} SQL statements to execute...`);
  
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    try {
      await pool.query(stmt);
      succeeded++;
      console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
    } catch (err) {
      failed++;
      console.log(`❌ [${i + 1}/${statements.length}] ${preview}...`);
      console.log(`   Error: ${err.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Init migration complete: ${succeeded} succeeded, ${failed} failed`);
  console.log(`========================================\n`);

  await pool.end();
}

runInitMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
