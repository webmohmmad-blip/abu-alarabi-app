import pg from 'pg';
const { Pool } = pg;
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

  // Remove isFree from worksheets
  `ALTER TABLE worksheets DROP COLUMN IF EXISTS is_free`,
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
    id serial PRIMARY KEY,
    role_id integer NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_name varchar(150) NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  )`,

  // Create user_permissions table
  `CREATE TABLE IF NOT EXISTS user_permissions (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_name varchar(150) NOT NULL,
    is_grant boolean NOT NULL DEFAULT true,
    expires_at timestamp,
    granted_by integer REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT now()
  )`,

  // Create groups table
  `CREATE TABLE IF NOT EXISTS groups (
    id serial PRIMARY KEY,
    name varchar(200) NOT NULL,
    description text,
    color varchar(20),
    teacher_id integer REFERENCES users(id),
    academic_year integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    deleted_at timestamp
  )`,

  // Create group_members table
  `CREATE TABLE IF NOT EXISTS group_members (
    id serial PRIMARY KEY,
    group_id integer NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at timestamp NOT NULL DEFAULT now()
  )`,

  // Create audit_logs table
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id serial PRIMARY KEY,
    actor_id integer REFERENCES users(id),
    actor_name varchar(200) NOT NULL,
    actor_role varchar(50),
    action varchar(100) NOT NULL,
    target_type varchar(100),
    target_id integer,
    description text NOT NULL,
    before_data jsonb,
    after_data jsonb,
    ip_address varchar(50),
    user_agent text,
    created_at timestamp NOT NULL DEFAULT now()
  )`,

  // Create system_settings table
  `CREATE TABLE IF NOT EXISTS system_settings (
    id serial PRIMARY KEY,
    key varchar(100) NOT NULL UNIQUE,
    value text,
    description text,
    updated_at timestamp NOT NULL DEFAULT now(),
    updated_by integer REFERENCES users(id)
  )`,

  // Create announcements table
  `CREATE TABLE IF NOT EXISTS announcements (
    id serial PRIMARY KEY,
    title varchar(300) NOT NULL,
    description text,
    type varchar(50) NOT NULL DEFAULT 'general',
    target_grade varchar(20),
    target_group_id integer REFERENCES groups(id),
    is_active boolean NOT NULL DEFAULT true,
    priority integer NOT NULL DEFAULT 0,
    starts_at timestamp,
    ends_at timestamp,
    created_by integer REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    deleted_at timestamp
  )`,

  // Create login_history table
  `CREATE TABLE IF NOT EXISTS login_history (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address varchar(50),
    user_agent text,
    browser varchar(100),
    os varchar(100),
    success boolean NOT NULL DEFAULT true,
    fail_reason varchar(200),
    logged_in_at timestamp NOT NULL DEFAULT now(),
    logged_out_at timestamp
  )`,

  // Create comments table
  `CREATE TABLE IF NOT EXISTS comments (
    id serial PRIMARY KEY,
    author_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type varchar(50) NOT NULL,
    content_id integer NOT NULL,
    parent_id integer REFERENCES comments(id) ON DELETE CASCADE,
    comment_type varchar(50) NOT NULL DEFAULT 'question',
    text text NOT NULL,
    is_hidden boolean NOT NULL DEFAULT false,
    is_pinned boolean NOT NULL DEFAULT false,
    is_accepted boolean NOT NULL DEFAULT false,
    helpful_count integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    deleted_at timestamp
  )`,

  // Create comment_votes table
  `CREATE TABLE IF NOT EXISTS comment_votes (
    id serial PRIMARY KEY,
    comment_id integer NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now()
  )`,

  // Create comment_reports table
  `CREATE TABLE IF NOT EXISTS comment_reports (
    id serial PRIMARY KEY,
    comment_id integer NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reporter_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason varchar(100) NOT NULL,
    description text,
    status varchar(50) NOT NULL DEFAULT 'pending',
    resolved_by integer REFERENCES users(id),
    resolved_at timestamp,
    action varchar(100),
    note text,
    created_at timestamp NOT NULL DEFAULT now()
  )`,

  // Create flashcard_decks table
  `CREATE TABLE IF NOT EXISTS flashcard_decks (
    id serial PRIMARY KEY,
    title varchar(300) NOT NULL,
    description text,
    subject_id integer NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_by integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    deleted_at timestamp
  )`,

  // Create flashcards table
  `CREATE TABLE IF NOT EXISTS flashcards (
    id serial PRIMARY KEY,
    deck_id integer REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    subject_id integer NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_by integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    front text NOT NULL,
    back text NOT NULL,
    card_type varchar(50) NOT NULL DEFAULT 'basic',
    difficulty varchar(50) NOT NULL DEFAULT 'medium',
    tags text[],
    source_note_id integer,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    deleted_at timestamp
  )`,

  // Create flashcard_user_state table
  `CREATE TABLE IF NOT EXISTS flashcard_user_state (
    id serial PRIMARY KEY,
    flashcard_id integer NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mastery_level numeric(4,2) NOT NULL DEFAULT 0,
    review_count integer NOT NULL DEFAULT 0,
    last_rating varchar(20),
    last_reviewed_at timestamp,
    next_review_at timestamp,
    interval integer NOT NULL DEFAULT 1,
    ease_factor numeric(5,2) NOT NULL DEFAULT 2.5,
    created_at timestamp NOT NULL DEFAULT now(),
    UNIQUE(flashcard_id, user_id)
  )`,

  // Create flashcard_reviews table
  `CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id serial PRIMARY KEY,
    flashcard_id integer NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating varchar(20) NOT NULL,
    mastery_level numeric(4,2),
    next_review_at timestamp,
    response_time_seconds integer,
    reviewed_at timestamp NOT NULL DEFAULT now()
  )`,

  // ── Study Room 2.0 & Schedule tables ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS dossier_annotations (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dossier_id integer NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    page_number integer NOT NULL DEFAULT 1,
    strokes_json text NOT NULL DEFAULT '[]',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS dossier_bookmarks (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dossier_id integer NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    page_number integer NOT NULL,
    title text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS dossier_reading_progress (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dossier_id integer NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    last_page integer NOT NULL DEFAULT 1,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,

  // Weekly schedule slots (recurring per user per day-of-week)
  `CREATE TABLE IF NOT EXISTS weekly_schedule_slots (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id integer NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week integer NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,

  // User rest days
  `CREATE TABLE IF NOT EXISTS user_rest_days (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    rest_days text[] NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,

  // Daily custom tasks
  `CREATE TABLE IF NOT EXISTS daily_custom_tasks (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title text NOT NULL,
    date date NOT NULL,
    is_completed boolean NOT NULL DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,


  // Phone-number format CHECK constraint (Jordanian mobile: 077/078/079 + 7 digits)
  "ALTER TABLE users ADD CONSTRAINT users_phone_format CHECK (phone ~ '^(077|078|079)[0-9]{7}$')",
];

let success = 0, failed = 0;
for (const sql of migrations) {
  try {
    await pool.query(sql);
    success++;
  } catch (e) {
    console.error('FAILED:', sql.substring(0, 80), '\n  Error:', e.message);
    failed++;
  }
}

console.log(`\nMigration complete: ${success} succeeded, ${failed} failed`);
await pool.end();
