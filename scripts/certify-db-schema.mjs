import fs from "fs";
import path from "path";
import pg from "../lib/db/node_modules/pg/lib/index.js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[key] = val;
    }
  }
}

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in environment");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const REQUIRED_TABLES = {
  users: [
    "id", "full_name", "phone", "email", "password_hash", "role",
    "avatar_url", "onboarding_completed", "status", "is_active",
    "group_id", "created_at", "updated_at", "deleted_at"
  ],
  student_profiles: [
    "id", "user_id", "grade", "field", "school", "tawjihi_year",
    "is_repeating", "goal", "study_style", "available_hours_per_day",
    "study_days", "streak_days", "last_active_date", "total_study_minutes",
    "total_sessions", "total_exams", "created_at", "updated_at"
  ],
  subjects: [
    "id", "name", "grade", "field", "icon_url", "color", "created_at"
  ],
  dossiers: [
    "id", "title", "description", "subject_id", "grade", "page_count",
    "file_size", "cover_url", "file_url", "downloads", "views",
    "rating", "rating_count", "status", "is_published", "published_at",
    "created_at", "updated_at", "deleted_at"
  ],
  dossier_favorites: [
    "id", "user_id", "dossier_id", "created_at"
  ],
  dossier_progress: [
    "id", "user_id", "dossier_id", "last_read_page", "reading_progress", "updated_at"
  ],
  worksheets: [
    "id", "title", "description", "subject_id", "grade", "page_count",
    "file_size", "cover_url", "file_url", "downloads", "views",
    "rating", "rating_count", "status", "is_published", "published_at",
    "created_at", "updated_at", "deleted_at"
  ],
  exams: [
    "id", "title", "subject_id", "type", "difficulty", "duration_minutes",
    "instructions", "passing_score", "total_score", "can_go_back",
    "can_skip", "show_result_immediately", "randomize_questions",
    "randomize_choices", "deduct_on_wrong", "max_attempts", "is_available",
    "status", "question_count", "published_at", "scheduled_at",
    "expires_at", "created_at", "deleted_at"
  ],
  questions: [
    "id", "exam_id", "text", "type", "order", "score", "image_url",
    "correct_answer", "explanation", "created_at"
  ],
  question_choices: [
    "id", "question_id", "choice_key", "text", "image_url", "order"
  ],
  exam_attempts: [
    "id", "exam_id", "user_id", "started_at", "submitted_at", "score",
    "total_score", "percentage", "passed", "time_taken_minutes",
    "correct_count", "wrong_count", "unanswered_count", "rank"
  ],
  attempt_answers: [
    "id", "attempt_id", "question_id", "answer", "is_correct", "saved_at"
  ],
  study_plans: [
    "id", "user_id", "goal", "available_hours_per_day", "recommendation",
    "created_at", "updated_at"
  ],
  study_tasks: [
    "id", "plan_id", "user_id", "subject_id", "title", "type", "status",
    "priority", "duration_minutes", "scheduled_at", "completed_at",
    "actual_minutes", "comprehension_level", "linked_content_id",
    "linked_content_type", "notes", "created_at", "updated_at"
  ],
  study_sessions: [
    "id", "user_id", "subject_id", "type", "status", "started_at",
    "ended_at", "planned_minutes", "actual_minutes", "focus_score",
    "pause_count", "task_id", "goal", "comprehension_level",
    "focus_level", "created_at", "updated_at"
  ],
  notes: [
    "id", "user_id", "subject_id", "dossier_id", "session_id",
    "title", "content", "tags", "is_pinned", "created_at", "updated_at"
  ],
  personal_schedule_subjects: [
    "id", "user_id", "name", "color", "created_at", "updated_at"
  ],
  weekly_schedule_slots: [
    "id", "user_id", "subject_id", "personal_subject_id", "day_of_week",
    "start_time", "end_time", "created_at"
  ],
  user_rest_days: [
    "id", "user_id", "rest_days", "updated_at"
  ],
  daily_custom_tasks: [
    "id", "user_id", "title", "date", "is_completed", "completed_at", "created_at"
  ],
  roles: [
    "id", "name", "description", "is_system", "created_at", "updated_at", "deleted_at"
  ],
  permissions: [
    "id", "name", "group", "description", "created_at"
  ],
  homepage_ads: [
    "id", "title", "description", "image_key", "mobile_image_key",
    "tablet_image_key", "link_url", "open_in_new_tab", "cta_text",
    "display_style", "is_active", "position", "start_at", "end_at",
    "created_by", "created_at", "updated_at"
  ],
  comments: [
    "id", "user_id", "target_type", "target_id", "content", "parent_id",
    "upvotes", "downvotes", "is_hidden", "created_at", "updated_at"
  ]
};

async function certify() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  PRODUCTION DATABASE CERTIFICATION (PHASE 4)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let totalTables = 0;
  let missingTables = 0;
  let totalColumns = 0;
  let missingColumns = 0;
  let matchColumns = 0;

  for (const [table, expectedCols] of Object.entries(REQUIRED_TABLES)) {
    totalTables++;
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );

    if (res.rows.length === 0) {
      console.log(`❌ TABLE MISSING: public.${table}`);
      missingTables++;
      missingColumns += expectedCols.length;
      continue;
    }

    const actualCols = new Set(res.rows.map(r => r.column_name));
    const missingInTable = [];

    for (const col of expectedCols) {
      totalColumns++;
      if (actualCols.has(col)) {
        matchColumns++;
      } else {
        missingInTable.push(col);
        missingColumns++;
      }
    }

    if (missingInTable.length === 0) {
      console.log(`✅ MATCH: public.${table} (${expectedCols.length} columns verified)`);
    } else {
      console.log(`❌ COLUMN MISSING in public.${table}: ${missingInTable.join(", ")}`);
    }
  }

  console.log("\n── SUMMARY ──────────────────────────────────────────────────");
  console.log(`Tables Checked: ${totalTables} | Missing Tables: ${missingTables}`);
  console.log(`Columns Checked: ${totalColumns} | Match: ${matchColumns} | Missing Columns: ${missingColumns}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  await pool.end();
  if (missingTables > 0 || missingColumns > 0) {
    process.exit(1);
  }
}

certify().catch(err => {
  console.error("Fatal error during DB certification:", err);
  pool.end();
  process.exit(1);
});
