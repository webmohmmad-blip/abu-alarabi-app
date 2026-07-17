import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", [
  "student",
  "teacher",
  "assistant_teacher",
  "moderator",
  "admin",
  "super_admin",
]);

export const userAccountStatusEnum = pgEnum("user_account_status", [
  "active",
  "suspended",
  "frozen",
  "pending",
  "deleted",
]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("student"),
  avatarUrl: text("avatar_url"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  status: userAccountStatusEnum("status").notNull().default("active"),
  isActive: boolean("is_active").notNull().default(true),
  groupId: integer("group_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// Student profiles — extra metadata beyond users table
export const studentProfilesTable = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  grade: text("grade"), // e.g. "12"
  field: text("field"), // "علمي", "أدبي"
  school: text("school"),
  tawjihiYear: integer("tawjihi_year"),
  isRepeating: boolean("is_repeating").notNull().default(false),
  goal: text("goal"), // "النجاح", "80+", "90+", "95+", "99+"
  studyStyle: text("study_style"), // "بصري", "سمعي", "قراءة", "تطبيق"
  availableHoursPerDay: numeric("available_hours_per_day", {
    precision: 4,
    scale: 1,
  }),
  studyDays: text("study_days").array(), // ["السبت","الأحد",...]
  streakDays: integer("streak_days").notNull().default(0),
  lastActiveDate: text("last_active_date"), // YYYY-MM-DD
  totalStudyMinutes: integer("total_study_minutes").notNull().default(0),
  totalSessions: integer("total_sessions").notNull().default(0),
  totalExams: integer("total_exams").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertStudentProfileSchema = createInsertSchema(
  studentProfilesTable
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type StudentProfile = typeof studentProfilesTable.$inferSelect;

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  condition: text("condition").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userAchievementsTable = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  achievementId: integer("achievement_id")
    .notNull()
    .references(() => achievementsTable.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Achievement = typeof achievementsTable.$inferSelect;
export type UserAchievement = typeof userAchievementsTable.$inferSelect;
