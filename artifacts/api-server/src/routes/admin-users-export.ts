/**
 * GET /api/admin/users/export
 * Streams all matching users as a real .xlsx file.
 * Requires admin or super_admin role.
 */
import { Router } from "express";
import ExcelJS from "exceljs";
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  examAttemptsTable,
  examsTable,
  auditLogsTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { and, like, isNull, or, sql, gte, lte, eq } from "drizzle-orm";

const router = Router();

// Role/status → Arabic
const ROLE_AR: Record<string, string> = {
  student: "طالب",
  teacher: "معلم",
  assistant_teacher: "معلم مساعد",
  moderator: "مشرف",
  admin: "مدير",
  super_admin: "مدير عام",
};
const STATUS_AR: Record<string, string> = {
  active: "نشط",
  suspended: "معلق",
  frozen: "مجمد",
  pending: "قيد الانتظار",
  deleted: "محذوف",
};

function fmtDate(d: Date | string | null): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ` +
    `${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  );
}

router.get(
  "/users/export",
  requireAuth,
  requireRole(["admin", "super_admin"]),
  async (req, res): Promise<void> => {
    const actorId: number = (req as any).userId;
    const {
      search = "",
      role = "",
      status = "",
      dateFrom = "",
      dateTo = "",
    } = req.query as Record<string, string>;

    // ── Build WHERE conditions (same logic as paginated list) ─────────────────
    const conditions: ReturnType<typeof isNull>[] = [isNull(usersTable.deletedAt)];

    if (role) conditions.push(eq(usersTable.role, role as any) as any);
    if (status) conditions.push(eq(usersTable.status, status as any) as any);
    if (search) {
      conditions.push(
        or(
          like(usersTable.fullName, `%${search}%`),
          like(usersTable.phone, `%${search}%`)
        )! as any
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        conditions.push(gte(usersTable.createdAt, from) as any);
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!isNaN(to.getTime())) {
        // end of day
        to.setHours(23, 59, 59, 999);
        conditions.push(lte(usersTable.createdAt, to) as any);
      }
    }

    const where = and(...conditions);

    try {
      // ── Fetch all matching users with student profile generation ───────────
      const users = await db
        .select({
          id: usersTable.id,
          fullName: usersTable.fullName,
          phone: usersTable.phone,
          role: usersTable.role,
          status: usersTable.status,
          createdAt: usersTable.createdAt,
          tawjihiYear: studentProfilesTable.tawjihiYear,
        })
        .from(usersTable)
        .leftJoin(studentProfilesTable, eq(usersTable.id, studentProfilesTable.userId))
        .where(where)
        .orderBy(usersTable.createdAt);

      if (!users.length) {
        // Still produce a valid xlsx with headers only
      }

      // ── Aggregate exam / quiz attempt counts in ONE query ──────────────────
      // exam = attempts where linked exam type != 'weekly'
      // quiz = attempts where linked exam type = 'weekly'
      const countRows = await db
        .select({
          userId: examAttemptsTable.userId,
          examCount: sql<string>`count(distinct case when ${examsTable.type} != 'weekly' then ${examAttemptsTable.id} end)`,
          quizCount: sql<string>`count(distinct case when ${examsTable.type} = 'weekly'  then ${examAttemptsTable.id} end)`,
        })
        .from(examAttemptsTable)
        .leftJoin(examsTable, eq(examAttemptsTable.examId, examsTable.id))
        .groupBy(examAttemptsTable.userId);

      const countMap = new Map(
        countRows.map((r) => [
          r.userId,
          { exams: Number(r.examCount), quizzes: Number(r.quizCount) },
        ])
      );

      // ── Build Excel workbook ───────────────────────────────────────────────
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "أبو العربي";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("المستخدمون", {
        views: [{ rightToLeft: true, state: "frozen" as const, ySplit: 1 }],
      });

      // Column definitions
      sheet.columns = [
        { header: "الرقم",             key: "num",        width: 8  },
        { header: "الاسم الكامل",       key: "fullName",   width: 30 },
        { header: "رقم الهاتف",         key: "phone",      width: 16 },
        { header: "الدور",              key: "role",       width: 16 },
        { header: "جيل الطالب",         key: "generation", width: 14 },
        { header: "الحالة",             key: "status",     width: 14 },
        { header: "تاريخ التسجيل",      key: "createdAt",  width: 22 },
        { header: "عدد الامتحانات",     key: "exams",      width: 18 },
        { header: "عدد الكويزات",       key: "quizzes",    width: 16 },
      ];

      // Header row styling
      const HEADER_FILL = "4A235A"; // dark purple
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${HEADER_FILL}` },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FF7B3FA0" } },
        };
      });
      headerRow.height = 28;

      // Enable auto-filter on header row
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      };

      // Data rows
      const EVEN_FILL = "F5F0FA"; // very light purple
      users.forEach((u, idx) => {
        const counts = countMap.get(u.id) ?? { exams: 0, quizzes: 0 };
        const genValue = u.role === "student" && u.tawjihiYear ? String(u.tawjihiYear) : "-";
        
        const row = sheet.addRow({
          num: idx + 1,
          fullName: u.fullName,
          phone: u.phone,
          role: ROLE_AR[u.role] ?? u.role,
          generation: genValue,
          status: STATUS_AR[u.status] ?? u.status,
          createdAt: fmtDate(u.createdAt),
          exams: counts.exams,
          quizzes: counts.quizzes,
        });

        // Alternate row background
        if (idx % 2 === 0) {
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: `FF${EVEN_FILL}` },
            };
          });
        }

        // Phone cell: force text format to prevent scientific notation
        const phoneCell = row.getCell("phone");
        phoneCell.numFmt = "@";
        phoneCell.value = String(u.phone);

        // Align numbers centre
        row.getCell("num").alignment        = { horizontal: "center" };
        row.getCell("generation").alignment = { horizontal: "center" };
        row.getCell("exams").alignment      = { horizontal: "center" };
        row.getCell("quizzes").alignment    = { horizontal: "center" };
        row.getCell("status").alignment     = { horizontal: "center" };
        row.getCell("role").alignment       = { horizontal: "center" };

        // RTL text
        row.getCell("fullName").alignment = { readingOrder: "rtl" };

        row.height = 22;
        row.commit();
      });

      // ── Write audit log ────────────────────────────────────────────────────
      await db.insert(auditLogsTable).values({
        action: "USERS_EXPORTED",
        actorId,
        actorName: "Admin",
        description: `تصدير ${users.length} مستخدم إلى Excel — فلاتر: بحث="${search}" دور="${role}" حالة="${status}"`,
      });

      // ── Stream response ────────────────────────────────────────────────────
      const today = new Date().toISOString().slice(0, 10);
      const filename = `users-export-${today}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      res.setHeader("Cache-Control", "no-store");

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("[users/export]", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "تعذر تصدير بيانات المستخدمين" });
      }
    }
  }
);

export default router;
