import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { subjectsTable } from "./subjects";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "published",
  "archived",
  "hidden",
  "scheduled",
]);

// ─── DOSSIERS ───────────────────────────────────────────
export const dossiersTable = pgTable("dossiers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(),
  pageCount: integer("page_count").notNull().default(0),
  fileSize: text("file_size"),
  fileUrl: text("file_url"),
  coverUrl: text("cover_url"),
  downloads: integer("downloads").notNull().default(0),
  views: integer("views").notNull().default(0),
  rating: numeric("rating", { precision: 3, scale: 1 }).notNull().default("0"),
  status: contentStatusEnum("status").notNull().default("published"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const insertDossierSchema = createInsertSchema(dossiersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDossier = z.infer<typeof insertDossierSchema>;
export type Dossier = typeof dossiersTable.$inferSelect;

export const dossierFavoritesTable = pgTable("dossier_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  dossierId: integer("dossier_id")
    .notNull()
    .references(() => dossiersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dossierProgressTable = pgTable("dossier_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  dossierId: integer("dossier_id")
    .notNull()
    .references(() => dossiersTable.id, { onDelete: "cascade" }),
  lastReadPage: integer("last_read_page").notNull().default(1),
  readingProgress: integer("reading_progress").notNull().default(0), // 0-100
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type DossierProgress = typeof dossierProgressTable.$inferSelect;

// ─── WORKSHEETS ─────────────────────────────────────────
export const worksheetsTable = pgTable("worksheets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  questionCount: integer("question_count").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(30),
  fileUrl: text("file_url"),
  coverUrl: text("cover_url"),
  downloads: integer("downloads").notNull().default(0),
  solvers: integer("solvers").notNull().default(0),
  status: contentStatusEnum("status").notNull().default("published"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const insertWorksheetSchema = createInsertSchema(worksheetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWorksheet = z.infer<typeof insertWorksheetSchema>;
export type Worksheet = typeof worksheetsTable.$inferSelect;

// ─── WORKSHEET ANNOTATIONS ───────────────────────────────
// Per-page drawing strokes, separate from dossier annotations
export const worksheetAnnotationsTable = pgTable("worksheet_annotations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  worksheetId: integer("worksheet_id")
    .notNull()
    .references(() => worksheetsTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull().default(1),
  strokesJson: text("strokes_json").notNull().default("[]"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export type WorksheetAnnotation = typeof worksheetAnnotationsTable.$inferSelect;

// ─── WORKSHEET BOOKMARKS ─────────────────────────────────
export const worksheetBookmarksTable = pgTable("worksheet_bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  worksheetId: integer("worksheet_id")
    .notNull()
    .references(() => worksheetsTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  title: text("title").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type WorksheetBookmark = typeof worksheetBookmarksTable.$inferSelect;

// ─── WORKSHEET READING PROGRESS ──────────────────────────
export const worksheetProgressTable = pgTable("worksheet_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  worksheetId: integer("worksheet_id")
    .notNull()
    .references(() => worksheetsTable.id, { onDelete: "cascade" }),
  lastPage: integer("last_page").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export type WorksheetProgress = typeof worksheetProgressTable.$inferSelect;

// ─── SUMMARIES ───────────────────────────────────────────────────────────────
export const summaryTypeEnum = pgEnum("summary_type", ["text", "pdf", "print"]);

export const summariesTable = pgTable("summaries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(),
  type: summaryTypeEnum("type").notNull().default("text"),
  content: text("content"), // rich text / markdown for "text" type
  fileUrl: text("file_url"), // PDF URL for pdf/print types
  status: contentStatusEnum("status").notNull().default("draft"),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Summary = typeof summariesTable.$inferSelect;

// ─── VIDEOS (External Embed Only) ───────────────────────────────────────────
export const videoProviderEnum = pgEnum("video_provider", [
  "youtube",
  "vimeo",
  "bunny",
  "cloudflare",
  "other",
]);

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(),
  provider: videoProviderEnum("provider").notNull().default("youtube"),
  videoUrl: text("video_url").notNull(),
  durationMinutes: integer("duration_minutes"),
  coverUrl: text("cover_url"),
  views: integer("views").notNull().default(0),
  order: integer("order").notNull().default(0),
  isPublished: integer("is_published").notNull().default(1), // 1=published, 0=draft
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const insertVideoSchema = createInsertSchema(videosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
});
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;
