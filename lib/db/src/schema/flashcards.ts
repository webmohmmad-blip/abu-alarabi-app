import { pgTable, serial, varchar, text, boolean, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { subjectsTable } from "./subjects";
import { notesTable } from "./study";

// ─── FLASHCARD DECKS ─────────────────────────────────────────────────────────
export const flashcardDecksTable = pgTable("flashcard_decks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  isTeacherDeck: boolean("is_teacher_deck").default(false).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  cardCount: integer("card_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// ─── FLASHCARDS ──────────────────────────────────────────────────────────────
export const flashcardsTable = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  deckId: integer("deck_id").references(() => flashcardDecksTable.id, {
    onDelete: "set null",
  }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  cardType: varchar("card_type", { length: 50 }).default("qa").notNull(),
  difficulty: varchar("difficulty", { length: 20 }).default("medium").notNull(),
  tags: text("tags").array(),
  sourceNoteId: integer("source_note_id").references(() => notesTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// ─── FLASHCARD REVIEWS ───────────────────────────────────────────────────────
export const flashcardReviewsTable = pgTable("flashcard_reviews", {
  id: serial("id").primaryKey(),
  flashcardId: integer("flashcard_id")
    .notNull()
    .references(() => flashcardsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  rating: varchar("rating", { length: 20 }).notNull(),
  masteryLevel: numeric("mastery_level", { precision: 4, scale: 2 }).default("0").notNull(),
  nextReviewAt: timestamp("next_review_at"),
  responseTimeSeconds: integer("response_time_seconds"),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
});

// ─── FLASHCARD USER STATE ────────────────────────────────────────────────────
export const flashcardUserStateTable = pgTable("flashcard_user_state", {
  id: serial("id").primaryKey(),
  flashcardId: integer("flashcard_id")
    .notNull()
    .references(() => flashcardsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  masteryLevel: numeric("mastery_level", { precision: 4, scale: 2 }).default("0").notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
  lastRating: varchar("last_rating", { length: 20 }),
  lastReviewedAt: timestamp("last_reviewed_at"),
  nextReviewAt: timestamp("next_review_at"),
  interval: integer("interval").default(1).notNull(),
  easeFactor: numeric("ease_factor", { precision: 4, scale: 2 }).default("2.50").notNull(),
});
