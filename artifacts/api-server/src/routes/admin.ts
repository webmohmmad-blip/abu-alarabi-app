import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  groupsTable,
  groupMembersTable,
  announcementsTable,
  auditLogsTable,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
  subjectsTable,
  unitsTable,
  dossiersTable,
  worksheetsTable,
  examsTable,
  weeklyQuizzesTable,
  commentsTable,
  commentReportsTable,
  studySessionsTable,
} from "@workspace/db";
import { requireAuth, requireRole, hashPassword } from "../lib/auth";
import { validatePhone } from "../lib/phone";
import { eq, desc, and, like, sql, count, isNull, ne, or } from "drizzle-orm";

const router = Router();

// All admin routes require auth + admin role minimum
router.use(requireAuth);
router.use(requireRole(["admin", "super_admin"]));

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
  const [students, teachers, subjects, dossiers, worksheets, exams, comments, sessions] =
    await Promise.all([
      db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "student")),
      db
        .select({ count: count() })
        .from(usersTable)
        .where(
          or(eq(usersTable.role, "teacher"), eq(usersTable.role, "assistant_teacher"))
        ),
      db.select({ count: count() }).from(subjectsTable),
      db.select({ count: count() }).from(dossiersTable).where(isNull(dossiersTable.deletedAt)),
      db.select({ count: count() }).from(worksheetsTable).where(isNull(worksheetsTable.deletedAt)),
      db.select({ count: count() }).from(examsTable).where(isNull(examsTable.deletedAt)),
      db.select({ count: count() }).from(commentsTable).where(isNull(commentsTable.deletedAt)),
      db
        .select({ count: count() })
        .from(studySessionsTable)
        .where(
          and(
            sql`DATE(${studySessionsTable.startedAt}) = CURRENT_DATE`
          )
        ),
    ]);

  const pendingReports = await db
    .select({ count: count() })
    .from(commentReportsTable)
    .where(eq(commentReportsTable.status, "pending"));

  // New users this week
  const newUsersThisWeek = await db
    .select({ count: count() })
    .from(usersTable)
    .where(sql`${usersTable.createdAt} >= NOW() - INTERVAL '7 days'`);

  // Total study hours
  const totalStudyMinutes = await db
    .select({ total: sql<number>`COALESCE(SUM(${studySessionsTable.actualMinutes}), 0)` })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.status, "completed"));

  res.json({
    totalStudents: Number(students[0]?.count ?? 0),
    totalTeachers: Number(teachers[0]?.count ?? 0),
    totalSubjects: Number(subjects[0]?.count ?? 0),
    totalDossiers: Number(dossiers[0]?.count ?? 0),
    totalWorksheets: Number(worksheets[0]?.count ?? 0),
    totalExams: Number(exams[0]?.count ?? 0),
    totalComments: Number(comments[0]?.count ?? 0),
    pendingReports: Number(pendingReports[0]?.count ?? 0),
    todaySessions: Number(sessions[0]?.count ?? 0),
    activeUsersNow: 0, // Would need websocket tracking
    newUsersThisWeek: Number(newUsersThisWeek[0]?.count ?? 0),
    totalStudyHoursAllTime: Math.round((Number(totalStudyMinutes[0]?.total ?? 0)) / 60),
  });
});

// ─── ADMIN ACTIVITY FEED ─────────────────────────────────────────────────────
router.get("/activity", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);

  res.json(
    logs.map((l) => ({
      id: l.id,
      type: l.action,
      description: l.description,
      actorName: l.actorName,
      createdAt: l.createdAt,
    }))
  );
});

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  const { search, role, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), 100);
  const offset = (pageNum - 1) * limitNum;

  let conditions = [isNull(usersTable.deletedAt)];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (status) conditions.push(eq(usersTable.status, status as any));
  if (search) {
    conditions.push(
      or(
        like(usersTable.fullName, `%${search}%`),
        like(usersTable.phone, `%${search}%`),
        like(usersTable.email ?? sql`''`, `%${search}%`)
      )!
    );
  }

  const [users, totalResult] = await Promise.all([
    db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        phone: usersTable.phone,
        email: usersTable.email,
        role: usersTable.role,
        status: usersTable.status,
        avatarUrl: usersTable.avatarUrl,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(and(...conditions))
      .orderBy(desc(usersTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ count: count() }).from(usersTable).where(and(...conditions)),
  ]);

  res.json({
    items: users.map((u) => ({
      ...u,
      totalSessions: 0,
      totalExams: 0,
      lastLoginAt: null,
    })),
    total: Number(totalResult[0]?.count ?? 0),
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/users/:id", async (req, res) => {
  const userId = parseInt(req.params.id);
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

  const profile = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, userId))
    .limit(1);

  const sessionCount = await db
    .select({ count: count() })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.userId, userId));

  const noteCount = 0;
  const commentCount = await db
    .select({ count: count() })
    .from(commentsTable)
    .where(eq(commentsTable.authorId, userId));

  res.json({
    id: user[0].id,
    fullName: user[0].fullName,
    phone: user[0].phone,
    email: user[0].email,
    role: user[0].role,
    status: user[0].status,
    avatarUrl: user[0].avatarUrl,
    grade: profile[0]?.grade ?? null,
    field: profile[0]?.field ?? null,
    goal: profile[0]?.goal ?? null,
    groupName: null,
    totalSessions: Number(sessionCount[0]?.count ?? 0),
    totalExams: 0,
    totalStudyMinutes: profile[0]?.totalStudyMinutes ?? 0,
    totalNotes: noteCount,
    totalComments: Number(commentCount[0]?.count ?? 0),
    streakDays: profile[0]?.streakDays ?? 0,
    lastLoginAt: null,
    createdAt: user[0].createdAt,
  });
});

router.post("/users", async (req, res) => {
  const { fullName, phone, password, email, role, grade, field } = req.body;
  if (!fullName || !phone || !password || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const phoneResult = validatePhone(phone);
  if (!phoneResult.ok) {
    res.status(400).json({ ok: false, message: phoneResult.error });
    return;
  }
  const normalizedPhone = phoneResult.phone;

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ fullName, phone: normalizedPhone, email, passwordHash, role, status: "active", isActive: true })
    .returning();

  if (role === "student" && user) {
    await db.insert(studentProfilesTable).values({
      userId: user.id,
      grade: grade ?? null,
      field: field ?? null,
    });
  }

  // Audit log
  await db.insert(auditLogsTable).values({
    actorId: (req as any).userId,
    actorName: "Admin",
    actorRole: "admin",
    action: "user_create",
    targetType: "user",
    targetId: user?.id,
    description: `أنشأ حساب جديد: ${fullName} (${role})`,
    ipAddress: req.ip,
  });

  res.status(201).json(user);
});

router.patch("/users/:id", async (req, res) => {
  const userId = parseInt(req.params.id);
  const { fullName, email, role } = req.body;

  const [updated] = await db
    .update(usersTable)
    .set({ fullName, email, role: role as any })
    .where(eq(usersTable.id, userId))
    .returning();

  await db.insert(auditLogsTable).values({
    actorId: (req as any).userId,
    actorName: "Admin",
    actorRole: "admin",
    action: "user_update",
    targetType: "user",
    targetId: userId,
    description: `عدّل بيانات المستخدم #${userId}`,
    ipAddress: req.ip,
  });

  res.json(updated);
});

router.patch("/users/:id/status", async (req, res) => {
  const userId = parseInt(req.params.id);
  const { status, reason } = req.body;

  if (!["active", "suspended", "frozen"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ status: status as any, isActive: status === "active" })
    .where(eq(usersTable.id, userId))
    .returning();

  await db.insert(auditLogsTable).values({
    actorId: (req as any).userId,
    actorName: "Admin",
    actorRole: "admin",
    action: status === "active" ? "user_activate" : "user_suspend",
    targetType: "user",
    targetId: userId,
    description: `غيّر حالة المستخدم #${userId} إلى "${status}"${reason ? `: ${reason}` : ""}`,
    ipAddress: req.ip,
  });

  res.json(updated);
});

router.post("/users/:id/reset-password", async (req, res) => {
  const userId = parseInt(req.params.id);
  const { newPassword, forceChange } = req.body;

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));

  await db.insert(auditLogsTable).values({
    actorId: (req as any).userId,
    actorName: "Admin",
    actorRole: "admin",
    action: "password_reset",
    targetType: "user",
    targetId: userId,
    description: `أعاد تعيين كلمة مرور المستخدم #${userId}`,
    ipAddress: req.ip,
  });

  res.json({ success: true });
});

router.delete("/users/:id", async (req, res) => {
  const userId = parseInt(req.params.id);
  await db.update(usersTable).set({ status: "deleted", isActive: false, deletedAt: new Date() } as any).where(eq(usersTable.id, userId));

  await db.insert(auditLogsTable).values({
    actorId: (req as any).userId,
    actorName: "Admin",
    actorRole: "admin",
    action: "user_delete",
    targetType: "user",
    targetId: userId,
    description: `حذف (منطقي) المستخدم #${userId}`,
    ipAddress: req.ip,
  });

  res.status(204).send();
});

router.post("/users/import", async (req, res) => {
  const { users, defaultRole = "student", defaultGroupId, defaultPassword } = req.body;
  if (!Array.isArray(users)) res.status(400).json({ error: "Invalid data" });
    return;

  let created = 0, skipped = 0, errors: string[] = [];

  for (const u of users) {
    try {
      const phoneResult = validatePhone(u.phone ?? "");
      if (!phoneResult.ok) {
        errors.push(`${u.phone}: ${phoneResult.error}`);
        continue;
      }
      const normalizedPhone = phoneResult.phone;

      const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, normalizedPhone)).limit(1);
      if (existing[0]) { skipped++; continue; }

      const passwordHash = await hashPassword(defaultPassword || normalizedPhone.slice(-6));
      const [newUser] = await db.insert(usersTable).values({
        fullName: u.fullName,
        phone: normalizedPhone,
        email: u.email ?? null,
        passwordHash,
        role: (u.role || defaultRole) as any,
        status: "active",
        isActive: true,
      }).returning();

      if (newUser && (u.role || defaultRole) === "student") {
        await db.insert(studentProfilesTable).values({
          userId: newUser.id,
          grade: u.grade ?? null,
          field: u.field ?? null,
        });
      }

      created++;
    } catch (e: any) {
      errors.push(`${u.phone}: ${e.message}`);
    }
  }

  res.json({ total: users.length, created, updated: 0, skipped, errors });
});

// ─── GROUPS ─────────────────────────────────────────────────────────────────
router.get("/groups", async (req, res) => {
  const groups = await db
    .select({
      id: groupsTable.id,
      name: groupsTable.name,
      description: groupsTable.description,
      color: groupsTable.color,
      createdAt: groupsTable.createdAt,
    })
    .from(groupsTable)
    .where(isNull(groupsTable.deletedAt))
    .orderBy(groupsTable.name);

  // Get member counts
  const memberCounts = await db
    .select({ groupId: groupMembersTable.groupId, count: count() })
    .from(groupMembersTable)
    .groupBy(groupMembersTable.groupId);

  const countMap = Object.fromEntries(memberCounts.map((m) => [m.groupId, Number(m.count)]));

  res.json(groups.map((g) => ({ ...g, memberCount: countMap[g.id] ?? 0, teacherName: null })));
});

router.post("/groups", async (req, res) => {
  const { name, description, color, teacherId } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }

  const [group] = await db.insert(groupsTable).values({ name, description, color, teacherId }).returning();
  res.status(201).json({ ...group, memberCount: 0, teacherName: null });
});

router.patch("/groups/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, color, teacherId } = req.body;
  const [group] = await db.update(groupsTable).set({ name, description, color, teacherId }).where(eq(groupsTable.id, id)).returning();
  res.json({ ...group, memberCount: 0, teacherName: null });
});

router.delete("/groups/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(groupsTable).set({ deletedAt: new Date() } as any).where(eq(groupsTable.id, id));
  res.status(204).send();
});

router.post("/groups/:id/members", async (req, res) => {
  const groupId = parseInt(req.params.id);
  const { userIds } = req.body as { userIds: number[] };

  if (!Array.isArray(userIds)) res.status(400).json({ error: "Invalid userIds" });
    return;

  for (const userId of userIds) {
    const existing = await db
      .select({ id: groupMembersTable.id })
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
      .limit(1);
    if (!existing[0]) {
      await db.insert(groupMembersTable).values({ groupId, userId });
    }
  }

  res.json({ success: true, added: userIds.length });
});

// ─── SUBJECTS (admin CRUD) ───────────────────────────────────────────────────
router.post("/subjects", async (req, res) => {
  const { name, grade, field, color, iconUrl } = req.body;
  const [sub] = await db.insert(subjectsTable).values({ name, grade, field, color, iconUrl }).returning();
  res.status(201).json(sub);
});

router.patch("/subjects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, grade, field, color, iconUrl } = req.body;
  const [sub] = await db.update(subjectsTable).set({ name, grade, field, color, iconUrl }).where(eq(subjectsTable.id, id)).returning();
  res.json(sub);
});

router.delete("/subjects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(subjectsTable).where(eq(subjectsTable.id, id));
  res.status(204).send();
});

// ─── UNITS (admin CRUD within a subject) ─────────────────────────────────────
router.get("/subjects/:id/units", async (req, res): Promise<void> => {
  const subjectId = parseInt(req.params.id);
  const units = await db
    .select()
    .from(unitsTable)
    .where(eq(unitsTable.subjectId, subjectId))
    .orderBy(unitsTable.order);
  res.json(units);
});

router.post("/subjects/:id/units", async (req, res): Promise<void> => {
  const subjectId = parseInt(req.params.id);
  const { title, order } = req.body;
  if (!title) { res.status(400).json({ error: "عنوان الوحدة مطلوب" }); return; }
  const maxOrder = await db
    .select({ m: sql<number>`COALESCE(MAX(${unitsTable.order}), 0)` })
    .from(unitsTable)
    .where(eq(unitsTable.subjectId, subjectId));
  const nextOrder = (maxOrder[0]?.m ?? 0) + 1;
  const [unit] = await db
    .insert(unitsTable)
    .values({ subjectId, title, order: order ?? nextOrder })
    .returning();
  res.status(201).json(unit);
});

router.patch("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { title, order } = req.body;
  const [unit] = await db
    .update(unitsTable)
    .set({ ...(title !== undefined && { title }), ...(order !== undefined && { order }) })
    .where(eq(unitsTable.id, id))
    .returning();
  res.json(unit);
});

router.delete("/units/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(unitsTable).where(eq(unitsTable.id, id));
  res.status(204).send();
});

// ─── DOSSIERS (admin CRUD) ───────────────────────────────────────────────────
router.post("/dossiers", async (req, res) => {
  const { title, description, subjectId, grade, pageCount, fileSize, fileUrl, coverUrl } = req.body;
  const [d] = await db
    .insert(dossiersTable)
    .values({ title, description, subjectId, grade, pageCount, fileSize, fileUrl, coverUrl })
    .returning();
  res.status(201).json(d);
});

router.patch("/dossiers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, subjectId, grade, pageCount, fileSize, fileUrl, coverUrl, status } = req.body;
  const [d] = await db
    .update(dossiersTable)
    .set({ title, description, subjectId, grade, pageCount, fileSize, fileUrl, coverUrl, ...(status ? { status } : {}) } as any)
    .where(eq(dossiersTable.id, id))
    .returning();
  res.json(d);
});

router.delete("/dossiers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id)) { res.status(400).json({ ok: false, message: "معرّف الدوسية غير صالح" }); return; }
  const [existing] = await db.select({ id: dossiersTable.id }).from(dossiersTable)
    .where(and(eq(dossiersTable.id, id), isNull(dossiersTable.deletedAt as any)));
  if (!existing) { res.status(404).json({ ok: false, message: "الدوسية غير موجودة" }); return; }
  await db.update(dossiersTable).set({ deletedAt: new Date() } as any).where(eq(dossiersTable.id, id));
  res.json({ ok: true, message: "تم حذف الدوسية بنجاح" });
});

// ─── WORKSHEETS (admin CRUD) ─────────────────────────────────────────────────
router.get("/worksheets", async (req, res) => {
  const items = await db
    .select()
    .from(worksheetsTable)
    .where(isNull(worksheetsTable.deletedAt as any))
    .orderBy(desc(worksheetsTable.createdAt));
  res.json({ items });
});

router.post("/worksheets", async (req, res) => {
  const { title, subjectId, grade, difficulty, questionCount, estimatedMinutes, fileUrl, status } = req.body;
  const [w] = await db
    .insert(worksheetsTable)
    .values({ title, subjectId, grade, difficulty, questionCount: Number(questionCount) || 0, estimatedMinutes: Number(estimatedMinutes) || 30, fileUrl, status: status ?? "draft" } as any)
    .returning();
  res.status(201).json(w);
});

router.patch("/worksheets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, subjectId, grade, difficulty, questionCount, estimatedMinutes, fileUrl, status } = req.body;
  const patch: Record<string, any> = { title, subjectId, grade, difficulty, fileUrl };
  if (questionCount !== undefined) patch.questionCount = Number(questionCount);
  if (estimatedMinutes !== undefined) patch.estimatedMinutes = Number(estimatedMinutes);
  if (status !== undefined) { patch.status = status; if (status === "published") patch.publishedAt = new Date(); }
  const [w] = await db.update(worksheetsTable).set(patch as any).where(eq(worksheetsTable.id, id)).returning();
  res.json(w);
});

router.delete("/worksheets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id)) { res.status(400).json({ ok: false, message: "معرّف ورقة العمل غير صالح" }); return; }
  const [existing] = await db.select({ id: worksheetsTable.id }).from(worksheetsTable)
    .where(and(eq(worksheetsTable.id, id), isNull(worksheetsTable.deletedAt as any)));
  if (!existing) { res.status(404).json({ ok: false, message: "ورقة العمل غير موجودة" }); return; }
  await db.update(worksheetsTable).set({ deletedAt: new Date() } as any).where(eq(worksheetsTable.id, id));
  res.json({ ok: true, message: "تم حذف ورقة العمل بنجاح" });
});

// ─── EXAMS (admin CRUD) ──────────────────────────────────────────────────────
router.get("/exams", async (req, res) => {
  // Exclude "weekly" type — those are managed via the quiz admin page
  const exams = await db
    .select()
    .from(examsTable)
    .where(and(isNull(examsTable.deletedAt), ne(examsTable.type, "weekly")))
    .orderBy(desc(examsTable.createdAt));
  res.json({ items: exams });
});

router.post("/exams", async (req, res) => {
  const { title, subjectId, type, durationMinutes, maxAttempts, passingScore, totalScore, instructions, status, isAvailable } = req.body;
  const [exam] = await db.insert(examsTable).values({
    title, subjectId: parseInt(subjectId), type: type ?? "full",
    durationMinutes: durationMinutes ?? 60, maxAttempts: maxAttempts ?? 3,
    passingScore: passingScore ?? "50", totalScore: totalScore ?? "100",
    instructions: instructions ?? null,
    status: status ?? "draft",
    isAvailable: isAvailable ?? false,
    questionCount: 0,
  } as any).returning();
  res.status(201).json(exam);
});

router.patch("/exams/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [exam] = await db.update(examsTable).set(req.body).where(eq(examsTable.id, id)).returning();
  res.json(exam);
});

router.delete("/exams/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id)) { res.status(400).json({ ok: false, message: "معرّف الامتحان غير صالح" }); return; }

  const [existing] = await db.select({ id: examsTable.id, title: examsTable.title })
    .from(examsTable).where(and(eq(examsTable.id, id), isNull(examsTable.deletedAt)));
  if (!existing) { res.status(404).json({ ok: false, message: "الامتحان غير موجود" }); return; }

  await db.update(examsTable).set({ deletedAt: new Date() } as any).where(eq(examsTable.id, id));
  res.json({ ok: true, message: "تم حذف الامتحان بنجاح" });
});

// ─── WEEKLY QUIZ ADMIN (backed by examsTable with type="weekly") ─────────────
router.get("/quiz", async (req, res) => {
  const quizzes = await db
    .select()
    .from(examsTable)
    .where(and(eq(examsTable.type, "weekly"), isNull(examsTable.deletedAt)))
    .orderBy(desc(examsTable.createdAt));
  res.json({ items: quizzes });
});

router.post("/quiz", async (req, res) => {
  const { title, subjectId, durationMinutes, maxAttempts, passingScore, totalScore, instructions, status, isAvailable } = req.body;
  const [quiz] = await db.insert(examsTable).values({
    title,
    subjectId: parseInt(subjectId),
    type: "weekly",
    durationMinutes: durationMinutes ?? 20,
    maxAttempts: maxAttempts ?? 1,
    passingScore: passingScore ?? "50",
    totalScore: totalScore ?? "100",
    instructions: instructions ?? null,
    status: status ?? "draft",
    isAvailable: isAvailable ?? false,
    questionCount: 0,
  } as any).returning();
  res.status(201).json(quiz);
});

router.patch("/quiz/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [quiz] = await db.update(examsTable).set(req.body as any)
    .where(and(eq(examsTable.id, id), eq(examsTable.type, "weekly")))
    .returning();
  if (!quiz) { res.status(404).json({ ok: false, message: "الكويز غير موجود" }); return; }
  res.json(quiz);
});

router.delete("/quiz/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id)) { res.status(400).json({ ok: false, message: "معرّف الكويز غير صالح" }); return; }
  const [existing] = await db.select({ id: examsTable.id }).from(examsTable)
    .where(and(eq(examsTable.id, id), eq(examsTable.type, "weekly"), isNull(examsTable.deletedAt)));
  if (!existing) { res.status(404).json({ ok: false, message: "الكويز غير موجود" }); return; }
  await db.update(examsTable).set({ deletedAt: new Date() } as any).where(eq(examsTable.id, id));
  res.json({ ok: true, message: "تم حذف الكويز بنجاح" });
});

// ─── COMMENTS (moderation) ───────────────────────────────────────────────────
router.get("/comments", async (req, res) => {
  const { reported, page = "1", limit = "20" } = req.query as any;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);

  let baseQ = db
    .select({
      id: commentsTable.id,
      authorId: commentsTable.authorId,
      text: commentsTable.text,
      contentType: commentsTable.contentType,
      contentId: commentsTable.contentId,
      commentType: commentsTable.commentType,
      isHidden: commentsTable.isHidden,
      isPinned: commentsTable.isPinned,
      isAccepted: commentsTable.isAccepted,
      helpfulCount: commentsTable.helpfulCount,
      createdAt: commentsTable.createdAt,
    })
    .from(commentsTable)
    .where(isNull(commentsTable.deletedAt))
    .orderBy(desc(commentsTable.createdAt))
    .limit(limitNum)
    .offset((pageNum - 1) * limitNum);

  const items = await baseQ;
  const totalResult = await db.select({ count: count() }).from(commentsTable).where(isNull(commentsTable.deletedAt));

  // Enrich with author name
  const enriched = await Promise.all(
    items.map(async (c) => {
      const author = await db.select({ fullName: usersTable.fullName, role: usersTable.role, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, c.authorId)).limit(1);
      return {
        ...c,
        authorName: author[0]?.fullName ?? "مجهول",
        authorRole: author[0]?.role ?? "student",
        authorAvatarUrl: author[0]?.avatarUrl ?? null,
        parentId: null,
        replies: [],
        isTeacherReply: ["teacher", "admin"].includes(author[0]?.role ?? ""),
        updatedAt: c.createdAt,
      };
    })
  );

  res.json({ items: enriched, total: Number(totalResult[0]?.count ?? 0), page: pageNum, limit: limitNum });
});

router.post("/comments/:id/hide", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(commentsTable).set({ isHidden: true }).where(eq(commentsTable.id, id));

  await db.insert(auditLogsTable).values({
    actorId: (req as any).userId,
    actorName: "Admin",
    actorRole: "admin",
    action: "comment_hide",
    targetType: "comment",
    targetId: id,
    description: `أخفى تعليق #${id}`,
    ipAddress: req.ip,
  });

  res.json({ success: true });
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────
router.get("/reports", async (req, res) => {
  const { status, page = "1" } = req.query as any;
  const pageNum = parseInt(page);
  const limit = 20;

  const conditions = [isNull(commentsTable.deletedAt)];
  if (status) conditions.push(eq(commentReportsTable.status, status));

  const reports = await db
    .select()
    .from(commentReportsTable)
    .orderBy(desc(commentReportsTable.createdAt))
    .limit(limit)
    .offset((pageNum - 1) * limit);

  const total = await db.select({ count: count() }).from(commentReportsTable);

  const enriched = await Promise.all(
    reports.map(async (r) => {
      const reporter = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, r.reporterId)).limit(1);
      const comment = await db.select({ text: commentsTable.text, contentType: commentsTable.contentType }).from(commentsTable).where(eq(commentsTable.id, r.commentId)).limit(1);
      return {
        id: r.id,
        reason: r.reason,
        description: r.description,
        reporterName: reporter[0]?.fullName ?? "مجهول",
        contentType: comment[0]?.contentType ?? "unknown",
        commentText: comment[0]?.text ?? "",
        status: r.status,
        createdAt: r.createdAt,
      };
    })
  );

  res.json({ items: enriched, total: Number(total[0]?.count ?? 0), page: pageNum, limit });
});

router.post("/reports/:id/resolve", async (req, res) => {
  const id = parseInt(req.params.id);
  const { action, note } = req.body;

  await db.update(commentReportsTable).set({
    status: "resolved",
    resolvedBy: (req as any).userId,
    resolvedAt: new Date(),
    action,
    note,
  }).where(eq(commentReportsTable.id, id));

  if (action === "hide_content") {
    const report = await db.select({ commentId: commentReportsTable.commentId }).from(commentReportsTable).where(eq(commentReportsTable.id, id)).limit(1);
    if (report[0]) {
      await db.update(commentsTable).set({ isHidden: true }).where(eq(commentsTable.id, report[0].commentId));
    }
  }

  res.json({ success: true });
});

// ─── ROLES & PERMISSIONS ─────────────────────────────────────────────────────
router.get("/roles", async (req, res) => {
  const roles = await db.select().from(rolesTable).where(isNull(rolesTable.deletedAt));
  const perms = await db.select().from(rolePermissionsTable);
  const permMap: Record<number, string[]> = {};
  for (const p of perms) {
    permMap[p.roleId] ??= [];
    permMap[p.roleId].push(p.permissionName);
  }

  res.json(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      memberCount: 0,
      permissionCount: permMap[r.id]?.length ?? 0,
      permissions: permMap[r.id] ?? [],
      createdAt: r.createdAt,
    }))
  );
});

router.post("/roles", async (req, res) => {
  const { name, description, permissions = [] } = req.body;
  const [role] = await db.insert(rolesTable).values({ name, description }).returning();

  if (permissions.length > 0 && role) {
    await db.insert(rolePermissionsTable).values(permissions.map((p: string) => ({ roleId: role.id, permissionName: p })));
  }

  res.status(201).json({ ...role, memberCount: 0, permissionCount: permissions.length, permissions });
});

router.patch("/roles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, permissions } = req.body;
  const [role] = await db.update(rolesTable).set({ name, description }).where(eq(rolesTable.id, id)).returning();

  if (permissions !== undefined) {
    await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, id));
    if (permissions.length > 0) {
      await db.insert(rolePermissionsTable).values(permissions.map((p: string) => ({ roleId: id, permissionName: p })));
    }
  }

  res.json({ ...role, memberCount: 0, permissionCount: permissions?.length ?? 0, permissions: permissions ?? [] });
});

router.delete("/roles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(rolesTable).set({ deletedAt: new Date() } as any).where(eq(rolesTable.id, id));
  res.status(204).send();
});

router.get("/permissions", async (_req, res) => {
  const perms = await db.select().from(permissionsTable);
  res.json(perms);
});

// ─── SYSTEM SETTINGS ─────────────────────────────────────────────────────────
router.get("/settings", async (_req, res) => {
  // Return compiled settings object from system_settings table
  res.json({
    platformName: "منصة أبو العربي",
    platformDescription: "منصة التوجيهي الأولى في الأردن",
    logoUrl: null,
    allowComments: true,
    allowStudentRegistration: true,
    requireCommentApproval: false,
    maxFileSize: 50,
    allowedFileTypes: ["pdf", "mp4", "jpg", "png"],
    pomodoroMinutes: 25,
    breakMinutes: 5,
    streakMinDailyMinutes: 30,
    defaultTimezone: "Asia/Amman",
  });
});

router.patch("/settings", async (req, res) => {
  await db.insert(auditLogsTable).values({
    actorId: (req as any).userId,
    actorName: "Admin",
    actorRole: "admin",
    action: "settings_update",
    description: "عدّل إعدادات المنصة",
    ipAddress: req.ip,
  });
  res.json({ ...req.body });
});

// ─── AUDIT LOGS ─────────────────────────────────────────────────────────────
router.get("/audit-logs", async (req, res) => {
  const { userId, action, page = "1", limit = "20" } = req.query as any;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);

  const conditions: any[] = [];
  if (userId) conditions.push(eq(auditLogsTable.actorId, parseInt(userId)));
  if (action) conditions.push(eq(auditLogsTable.action, action));

  const [logs, totalResult] = await Promise.all([
    db
      .select()
      .from(auditLogsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum),
    db
      .select({ count: count() })
      .from(auditLogsTable)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  res.json({
    items: logs.map((l) => ({
      id: l.id,
      actorName: l.actorName,
      actorRole: l.actorRole,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      description: l.description,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    })),
    total: Number(totalResult[0]?.count ?? 0),
    page: pageNum,
    limit: limitNum,
  });
});

// ─── PLATFORM REPORTS ────────────────────────────────────────────────────────
router.get("/platform-reports", async (req, res) => {
  const { type = "weekly" } = req.query as any;

  const [studentCount, sessionCount, examCount] = await Promise.all([
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "student")),
    db.select({ count: count() }).from(studySessionsTable).where(eq(studySessionsTable.status, "completed")),
    db.select({ count: count() }).from(examsTable),
  ]);

  res.json({
    type,
    from: new Date(Date.now() - 7 * 86400000).toISOString(),
    to: new Date().toISOString(),
    data: {
      totalStudents: Number(studentCount[0]?.count ?? 0),
      completedSessions: Number(sessionCount[0]?.count ?? 0),
      totalExams: Number(examCount[0]?.count ?? 0),
    },
  });
});

// ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────
router.get("/announcements", async (_req, res) => {
  const items = await db
    .select()
    .from(announcementsTable)
    .where(isNull(announcementsTable.deletedAt))
    .orderBy(desc(announcementsTable.createdAt));
  res.json(items);
});

router.post("/announcements", async (req, res) => {
  const { title, description, type, targetGrade, targetGroupId, startsAt, endsAt, isActive = true } = req.body;
  const [item] = await db
    .insert(announcementsTable)
    .values({
      title,
      description,
      type,
      targetGrade,
      targetGroupId,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      isActive,
      createdBy: (req as any).userId,
    })
    .returning();
  res.status(201).json(item);
});

router.patch("/announcements/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, type, targetGrade, startsAt, endsAt, isActive } = req.body;
  const [item] = await db
    .update(announcementsTable)
    .set({ title, description, type, targetGrade, isActive, startsAt: startsAt ? new Date(startsAt) : undefined, endsAt: endsAt ? new Date(endsAt) : undefined })
    .where(eq(announcementsTable.id, id))
    .returning();
  res.json(item);
});

router.delete("/announcements/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(announcementsTable).set({ deletedAt: new Date() } as any).where(eq(announcementsTable.id, id));
  res.status(204).send();
});

export default router;
