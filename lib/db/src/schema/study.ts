import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  pgEnum,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { subjectsTable } from "./subjects";
import { dossiersTable } from "./content";

export const taskTypeEnum = pgEnum("task_type", [
  "read_dossier",
  "watch_video",
  "solve_worksheet",
  "take_exam",
  "review",
  "flashcards",
  "free",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
  "overdue",
  "skipped",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const sessionTypeEnum = pgEnum("session_type", [
  "pomodoro",
  "balanced",
  "deep_focus",
  "quick_review",
  "custom",
  "exam",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "paused",
  "completed",
  "abandoned",
]);

// ─── STUDY PLANS ────────────────────────────────────────
export const studyPlansTable = pgTable("study_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  goal: text("goal").notNull(),
  availableHoursPerDay: numeric("available_hours_per_day", {
    precision: 4,
    scale: 1,
  }),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type StudyPlan = typeof studyPlansTable.$inferSelect;

// ─── STUDY TASKS ────────────────────────────────────────
export const studyTasksTable = pgTable("study_tasks", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => studyPlansTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: taskTypeEnum("type").notNull().default("read_dossier"),
  status: taskStatusEnum("status").notNull().default("pending"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  actualMinutes: integer("actual_minutes"),
  comprehensionLevel: text("comprehension_level"),
  linkedContentId: integer("linked_content_id"),
  linkedContentType: text("linked_content_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertStudyTaskSchema = createInsertSchema(studyTasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudyTask = z.infer<typeof insertStudyTaskSchema>;
export type StudyTask = typeof studyTasksTable.$inferSelect;

// ─── STUDY SESSIONS ─────────────────────────────────────
export const studySessionsTable = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  type: sessionTypeEnum("type").notNull().default("pomodoro"),
  status: sessionStatusEnum("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  plannedMinutes: integer("planned_minutes").notNull(),
  actualMinutes: integer("actual_minutes"),
  focusScore: numeric("focus_score", { precision: 4, scale: 1 }),
  pauseCount: integer("pause_count").notNull().default(0),
  taskId: integer("task_id"),
  goal: text("goal"),
  comprehensionLevel: text("comprehension_level"),
  focusLevel: text("focus_level"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertStudySessionSchema = createInsertSchema(
  studySessionsTable
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type StudySession = typeof studySessionsTable.$inferSelect;

// ─── NOTES ──────────────────────────────────────────────
export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  dossierId: integer("dossier_id").references(() => dossiersTable.id, {
    onDelete: "set null",
  }),
  sessionId: integer("session_id").references(() => studySessionsTable.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  tags: text("tags").array(),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertNoteSchema = createInsertSchema(notesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;

// ─── NOTIFICATIONS ──────────────────────────────────────
export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("session_reminder"),
  isRead: boolean("is_read").notNull().default(false),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;

// ─── DOSSIER ANNOTATIONS ────────────────────────────────
// Stores per-page drawing strokes for each user+dossier
export const dossierAnnotationsTable = pgTable("dossier_annotations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  dossierId: integer("dossier_id")
    .notNull()
    .references(() => dossiersTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull().default(1),
  strokesJson: text("strokes_json").notNull().default("[]"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export type DossierAnnotation = typeof dossierAnnotationsTable.$inferSelect;

// ─── DOSSIER BOOKMARKS ──────────────────────────────────
export const dossierBookmarksTable = pgTable("dossier_bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  dossierId: integer("dossier_id")
    .notNull()
    .references(() => dossiersTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  title: text("title").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type DossierBookmark = typeof dossierBookmarksTable.$inferSelect;

// ─── DOSSIER READING PROGRESS ───────────────────────────
export const dossierReadingProgressTable = pgTable("dossier_reading_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  dossierId: integer("dossier_id")
    .notNull()
    .references(() => dossiersTable.id, { onDelete: "cascade" }),
  lastPage: integer("last_page").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
