# Database Integrity Audit — أبو العربي Platform
Generated: 2026-07-21

---

## Schema Files
| File | Tables |
|------|--------|
| `lib/db/src/schema/users.ts` | users, student_profiles, achievements, user_achievements |
| `lib/db/src/schema/subjects.ts` | subjects, student_subjects, units |
| `lib/db/src/schema/content.ts` | dossiers, dossier_favorites, dossier_progress, worksheets, worksheet_annotations, worksheet_bookmarks, worksheet_progress, summaries, videos |
| `lib/db/src/schema/exams.ts` | exams, questions, question_choices, exam_attempts, attempt_answers, weekly_quizzes (legacy) |
| `lib/db/src/schema/study.ts` | study_plans, study_tasks, study_sessions, notes, notifications, dossier_annotations, dossier_bookmarks, personal_schedule_subjects, weekly_schedule_slots, user_rest_days, daily_custom_tasks, dossier_reading_progress |
| `lib/db/src/schema/admin.ts` | roles, permissions, role_permissions, user_permissions, groups, group_members, audit_logs, system_settings, announcements, login_history |
| `lib/db/src/schema/comments.ts` | comments, comment_votes, comment_reports |
| `lib/db/src/schema/flashcards.ts` | flashcard_decks, flashcards, flashcard_reviews, flashcard_user_state |

---

## Key Table Analysis

### users
- `id` SERIAL PRIMARY KEY
- `phone` TEXT UNIQUE NOT NULL — Jordanian format enforced at API layer
- `password_hash` TEXT NOT NULL — exists in schema but unused (phone-only auth)
- `role` ENUM: student, teacher, admin, super_admin
- `onboarding_completed` BOOLEAN DEFAULT false — set to `true` immediately on register
- `deleted_at` TIMESTAMP — soft delete enabled
- **INTEGRITY**: No orphan concern; all FKs reference this table with CASCADE or RESTRICT

### exams
- `type` ENUM: "full", "unit", "lesson", "weekly", "diagnostic", "ministerial"
- `status` ENUM: "draft", "published", "archived", "hidden", "scheduled"
- **CRITICAL NOTE**: Weekly quizzes are stored here with `type="weekly"`, NOT in the `weekly_quizzes` table
- `weekly_quizzes` table is legacy/unused — all student-facing quiz logic uses `exams` with `type="weekly"`

### exam_attempts
- `score`, `total_score`, `percentage` — NUMERIC(5,2), populated on submit
- `passed`, `time_taken_minutes`, `correct_count`, `wrong_count`, `unanswered_count` — populated on submit
- `submitted_at` — NULL means in-progress
- FK → exams (CASCADE), FK → users (CASCADE)

### content tables (dossiers, worksheets)
- `status` ENUM: "draft", "published", "archived", "hidden", "scheduled"
- PDF stored in object storage; `file_url` references `/api/storage/objects/uploads/<uuid>`
- `deleted_at` — soft delete on both tables

---

## Enum Consistency
| Enum Name | Values | Location |
|-----------|--------|----------|
| userRoleEnum | student, teacher, admin, super_admin | users.ts |
| contentStatusEnum | draft, published, archived, hidden, scheduled | content.ts |
| examTypeEnum | full, unit, lesson, weekly, diagnostic, ministerial | exams.ts |
| videoProviderEnum | youtube, vimeo, bunny, cloudflare, other | content.ts |

---

## Orphan / Referential Integrity
- All foreign keys use `onDelete: "cascade"` or `onDelete: "restrict"` appropriately
- Soft delete (`deleted_at`) is used on users, dossiers, worksheets, exams — hard delete not used for content
- `attempt_answers` cascade from `exam_attempts` which cascade from `exams` — no orphan risk

---

## Legacy / Unused Tables
| Table | Status | Action |
|-------|--------|--------|
| `weekly_quizzes` | Legacy — zero rows expected | Leave in schema for migration safety; not queried by app |
| `flashcard_decks`, `flashcards`, etc. | Exists in schema, API routes removed | Schema kept; no data concern |
| `videos` | Exists in schema, API routes removed | Schema kept; feature removed from platform |

---

## Missing Constraints (non-blocking)
- `exam_attempts.submitted_at` not enforced as unique per user+exam — a student could theoretically start multiple attempts. This is a business-rule gap but not a data integrity failure.
- No index on `exams.type` — query for weekly quizzes does full scan. Low volume OK; add index if quiz load grows.
