import { pool } from "@workspace/db";
import { logger } from "./logger";
import { ensureR2BucketCors, validateR2ConfigOnStartup } from "./objectStorage";

let _initialized = false;

export async function ensureProductionReady(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  logger.info("Running automatic production readiness checks & database schema migrations...");

  const migrations = [
    `DO $$ BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'assistant_teacher';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';
    EXCEPTION WHEN others THEN NULL; END $$`,

    `DO $$ BEGIN
      CREATE TYPE user_account_status AS ENUM ('active', 'suspended', 'frozen', 'pending', 'deleted');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_account_status NOT NULL DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS group_id integer`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

    `CREATE TABLE IF NOT EXISTS roles (
      id serial PRIMARY KEY,
      name varchar(100) NOT NULL UNIQUE,
      description text,
      is_system boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      deleted_at timestamp
    )`,

    `CREATE TABLE IF NOT EXISTS permissions (
      id serial PRIMARY KEY,
      name varchar(150) NOT NULL UNIQUE,
      "group" varchar(100) NOT NULL,
      description text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id integer REFERENCES roles(id) ON DELETE CASCADE,
      permission_id integer REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    )`,

    `CREATE TABLE IF NOT EXISTS homepage_ads (
      id serial PRIMARY KEY,
      title varchar(300) NOT NULL,
      description text,
      image_key text NOT NULL,
      mobile_image_key text,
      tablet_image_key text,
      link_url text,
      open_in_new_tab boolean NOT NULL DEFAULT false,
      cta_text text,
      display_style varchar(30) NOT NULL DEFAULT 'image_only',
      is_active boolean NOT NULL DEFAULT true,
      position integer NOT NULL DEFAULT 0,
      start_at timestamptz,
      end_at timestamptz,
      created_by integer REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_homepage_ads_active_position ON homepage_ads(is_active, position)`,
    `CREATE INDEX IF NOT EXISTS idx_exams_status_avail_subj_type ON exams(status, is_available, subject_id, type)`,
    `CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id)`,
    `CREATE INDEX IF NOT EXISTS idx_question_choices_question_id ON question_choices(question_id)`,
    `CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam ON exam_attempts(user_id, exam_id)`,
    `CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON attempt_answers(attempt_id)`,
    `CREATE INDEX IF NOT EXISTS idx_study_tasks_user_scheduled ON study_tasks(user_id, scheduled_at)`,
    `CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_dossier_progress_user_dossier ON dossier_reading_progress(user_id, dossier_id)`,
  ];

  let success = 0;
  let failed = 0;
  for (const sql of migrations) {
    try {
      await pool.query(sql);
      success++;
    } catch (err: any) {
      failed++;
    }
  }
  logger.info({ success, failed }, "Production database schema verification completed.");

  logger.info("Validating Cloudflare R2 environment variables...");
  try {
    validateR2ConfigOnStartup();
    logger.info("✅ Cloudflare R2 environment variables sanitized & validated successfully.");
  } catch (err: any) {
    logger.error({ err: err.message }, "❌ Cloudflare R2 environment variable validation failed!");
    throw err;
  }

  logger.info("Verifying Cloudflare R2 Bucket CORS policy...");
  await ensureR2BucketCors();
}
