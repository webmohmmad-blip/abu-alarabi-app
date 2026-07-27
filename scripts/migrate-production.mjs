import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL environment variable is not set!");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrations = [
  // Add new role enum values
  `DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'assistant_teacher';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';
  EXCEPTION WHEN others THEN NULL; END $$`,

  // Add user_account_status enum
  `DO $$ BEGIN
    CREATE TYPE user_account_status AS ENUM ('active', 'suspended', 'frozen', 'pending', 'deleted');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // Add columns to users table
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_account_status NOT NULL DEFAULT 'active'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS group_id integer`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // Remove isFree from dossiers
  `ALTER TABLE dossiers DROP COLUMN IF EXISTS is_free`,
  `ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // Add content_status and difficulty enums if missing
  `DO $$ BEGIN
    CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived', 'hidden', 'scheduled');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // Remove isFree from worksheets & ensure all columns exist
  `ALTER TABLE worksheets DROP COLUMN IF EXISTS is_free`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS description text`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS cover_url text`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS downloads integer NOT NULL DEFAULT 0`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS solvers integer NOT NULL DEFAULT 0`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS question_count integer NOT NULL DEFAULT 0`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS estimated_minutes integer NOT NULL DEFAULT 30`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS status content_status NOT NULL DEFAULT 'published'`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS published_at timestamptz`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS scheduled_at timestamptz`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS expires_at timestamptz`,
  `ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // Remove isFree from exams
  `ALTER TABLE exams DROP COLUMN IF EXISTS is_free`,
  `ALTER TABLE exams ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  // Create roles table
  `CREATE TABLE IF NOT EXISTS roles (
    id serial PRIMARY KEY,
    name varchar(100) NOT NULL UNIQUE,
    description text,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    deleted_at timestamp
  )`,

  // Create permissions table
  `CREATE TABLE IF NOT EXISTS permissions (
    id serial PRIMARY KEY,
    name varchar(150) NOT NULL UNIQUE,
    "group" varchar(100) NOT NULL,
    description text,
    created_at timestamp NOT NULL DEFAULT now()
  )`,

  // Create role_permissions table
  `CREATE TABLE IF NOT EXISTS role_permissions (
    role_id integer REFERENCES roles(id) ON DELETE CASCADE,
    permission_id integer REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
  )`,

  // Create homepage_ads table (migration 0001_add_homepage_ads)
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
  "CREATE INDEX IF NOT EXISTS idx_homepage_ads_active_position ON homepage_ads(is_active, position)",
];

console.log("==================================================");
console.log("RUNNING PRODUCTION DATABASE MIGRATION");
console.log("==================================================");

let success = 0, failed = 0;
for (const sql of migrations) {
  const preview = sql.replace(/\n/g, ' ').substring(0, 80);
  try {
    await pool.query(sql);
    success++;
    console.log(`✅ SUCCESS: ${preview}...`);
  } catch (e) {
    console.error(`❌ FAILED:  ${preview}...`);
    console.error(`   Error: ${e.message}`);
    failed++;
  }
}

console.log(`\n==================================================`);
console.log(`Migration completed: ${success} succeeded, ${failed} failed`);
console.log(`==================================================`);

await pool.end();
if (failed > 0) process.exit(1);
