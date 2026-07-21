import { pgTable, serial, varchar, text, boolean, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// ─── ENUMS ──────────────────────────────────────────────────────────────────
export const auditActionEnum = pgEnum("audit_action", [
  "login",
  "logout",
  "user_create",
  "user_update",
  "user_delete",
  "user_suspend",
  "user_activate",
  "role_create",
  "role_update",
  "role_delete",
  "permission_grant",
  "permission_revoke",
  "content_create",
  "content_update",
  "content_delete",
  "settings_update",
  "password_reset",
  "group_create",
  "group_update",
  "group_delete",
  "import_users",
  "announcement_create",
  "announcement_update",
  "announcement_delete",
  "comment_hide",
  "comment_delete",
  "report_resolve",
]);

// ─── ROLES & PERMISSIONS ────────────────────────────────────────────────────
export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const permissionsTable = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  group: varchar("group", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rolePermissionsTable = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id")
    .notNull()
    .references(() => rolesTable.id, { onDelete: "cascade" }),
  permissionName: varchar("permission_name", { length: 150 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPermissionsTable = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  permissionName: varchar("permission_name", { length: 150 }).notNull(),
  isGrant: boolean("is_grant").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  grantedBy: integer("granted_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── GROUPS ─────────────────────────────────────────────────────────────────
export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }),
  teacherId: integer("teacher_id").references(() => usersTable.id),
  academicYear: integer("academic_year"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => groupsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// ─── AUDIT LOGS ─────────────────────────────────────────────────────────────
export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => usersTable.id),
  actorName: varchar("actor_name", { length: 200 }).notNull(),
  actorRole: varchar("actor_role", { length: 50 }),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 100 }),
  targetId: integer("target_id"),
  description: text("description").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── SYSTEM SETTINGS ────────────────────────────────────────────────────────
export const systemSettingsTable = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => usersTable.id),
});

// ─── ANNOUNCEMENTS ──────────────────────────────────────────────────────────
export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull().default("general"),
  targetGrade: varchar("target_grade", { length: 20 }),
  targetGroupId: integer("target_group_id").references(() => groupsTable.id),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0).notNull(),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// ─── HOMEPAGE ADVERTISEMENTS ────────────────────────────────────────────────
export const homepageAdsTable = pgTable("homepage_ads", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  /** Storage key — e.g. /objects/uploads/<uuid> */
  imageKey: text("image_key").notNull(),
  mobileImageKey: text("mobile_image_key"),
  tabletImageKey: text("tablet_image_key"),
  linkUrl: text("link_url"),
  openInNewTab: boolean("open_in_new_tab").default(false).notNull(),
  ctaText: text("cta_text"),
  /** "image_only" | "overlay" | "split" | "minimal" */
  displayStyle: varchar("display_style", { length: 30 }).default("image_only").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  position: integer("position").default(0).notNull(),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
});

// ─── LOGIN HISTORY ──────────────────────────────────────────────────────────
export const loginHistoryTable = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  success: boolean("success").default(true).notNull(),
  failReason: varchar("fail_reason", { length: 200 }),
  loggedInAt: timestamp("logged_in_at").defaultNow().notNull(),
  loggedOutAt: timestamp("logged_out_at"),
});
