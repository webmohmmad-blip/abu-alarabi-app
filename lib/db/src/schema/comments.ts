import { pgTable, serial, varchar, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// ─── ENUMS ──────────────────────────────────────────────────────────────────
export const commentTypeEnum = pgEnum("comment_type", [
  "question",
  "answer",
  "clarification",
  "correction",
  "teacher_note",
  "announcement",
]);

export const contentTypeEnum = pgEnum("content_type_enum", [
  "dossier",
  "worksheet",
  "exam",
  "subject",
  "lesson",
]);

export const reportReasonEnum = pgEnum("report_reason", [
  "inappropriate",
  "spam",
  "wrong_info",
  "contact_sharing",
  "harassment",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "resolved",
  "dismissed",
]);

// ─── COMMENTS ───────────────────────────────────────────────────────────────
export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  contentId: integer("content_id").notNull(),
  parentId: integer("parent_id"),
  commentType: varchar("comment_type", { length: 50 }).default("question").notNull(),
  text: text("text").notNull(),
  helpfulCount: integer("helpful_count").default(0).notNull(),
  isAccepted: boolean("is_accepted").default(false).notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  hiddenReason: text("hidden_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// ─── COMMENT VOTES ───────────────────────────────────────────────────────────
export const commentVotesTable = pgTable("comment_votes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id")
    .notNull()
    .references(() => commentsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── COMMENT REPORTS ─────────────────────────────────────────────────────────
export const commentReportsTable = pgTable("comment_reports", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id")
    .notNull()
    .references(() => commentsTable.id, { onDelete: "cascade" }),
  reporterId: integer("reporter_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 50 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  resolvedBy: integer("resolved_by").references(() => usersTable.id),
  resolvedAt: timestamp("resolved_at"),
  action: varchar("action", { length: 50 }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
