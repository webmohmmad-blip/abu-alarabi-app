import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { subjectsTable } from "./subjects";

export const examTypeEnum = pgEnum("exam_type", [
  "full",
  "unit",
  "lesson",
  "weekly",
  "diagnostic",
  "ministerial",
]);

export const examDifficultyEnum = pgEnum("exam_difficulty", [
  "easy",
  "medium",
  "hard",
  "ministerial",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "mcq",
  "true_false",
  "fill_blank",
  "matching",
  "ordering",
  "short_answer",
  "essay",
]);

export const examsTable = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  type: examTypeEnum("type").notNull().default("full"),
  difficulty: examDifficultyEnum("difficulty").notNull().default("medium"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  instructions: text("instructions"),
  passingScore: numeric("passing_score", { precision: 5, scale: 2 }).default(
    "50"
  ),
  totalScore: numeric("total_score", { precision: 5, scale: 2 }).default("100"),
  canGoBack: boolean("can_go_back").notNull().default(true),
  canSkip: boolean("can_skip").notNull().default(true),
  showResultImmediately: boolean("show_result_immediately")
    .notNull()
    .default(true),
  randomizeQuestions: boolean("randomize_questions").notNull().default(false),
  randomizeChoices: boolean("randomize_choices").notNull().default(false),
  deductOnWrong: boolean("deduct_on_wrong").notNull().default(false),
  maxAttempts: integer("max_attempts").notNull().default(3),
  isFree: boolean("is_free").notNull().default(true),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id")
    .notNull()
    .references(() => examsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  type: questionTypeEnum("type").notNull().default("mcq"),
  order: integer("order").notNull(),
  score: numeric("score", { precision: 5, scale: 2 }).notNull().default("1"),
  imageUrl: text("image_url"),
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Question = typeof questionsTable.$inferSelect;

export const questionChoicesTable = pgTable("question_choices", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id")
    .notNull()
    .references(() => questionsTable.id, { onDelete: "cascade" }),
  choiceKey: text("choice_key").notNull(), // "A", "B", "C", "D"
  text: text("text").notNull(),
  imageUrl: text("image_url"),
  order: integer("order").notNull().default(0),
});

export type QuestionChoice = typeof questionChoicesTable.$inferSelect;

export const examAttemptsTable = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id")
    .notNull()
    .references(() => examsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  score: numeric("score", { precision: 5, scale: 2 }),
  totalScore: numeric("total_score", { precision: 5, scale: 2 }),
  percentage: numeric("percentage", { precision: 5, scale: 2 }),
  passed: boolean("passed"),
  timeTakenMinutes: integer("time_taken_minutes"),
  correctCount: integer("correct_count"),
  wrongCount: integer("wrong_count"),
  unansweredCount: integer("unanswered_count"),
  rank: integer("rank"),
});

export const insertExamAttemptSchema = createInsertSchema(
  examAttemptsTable
).omit({ id: true, startedAt: true });
export type InsertExamAttempt = z.infer<typeof insertExamAttemptSchema>;
export type ExamAttempt = typeof examAttemptsTable.$inferSelect;

export const attemptAnswersTable = pgTable("attempt_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => examAttemptsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questionsTable.id, { onDelete: "cascade" }),
  answer: text("answer"),
  isCorrect: boolean("is_correct"),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AttemptAnswer = typeof attemptAnswersTable.$inferSelect;

// ─── WEEKLY QUIZ ────────────────────────────────────────
export const weeklyQuizzesTable = pgTable("weekly_quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").references(() => examsTable.id, {
    onDelete: "cascade",
  }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  prizes: text("prizes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WeeklyQuiz = typeof weeklyQuizzesTable.$inferSelect;
