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
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  questionCount: integer("question_count").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(30),
  fileUrl: text("file_url"),
  downloads: integer("downloads").notNull().default(0),
  solvers: integer("solvers").notNull().default(0),
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
