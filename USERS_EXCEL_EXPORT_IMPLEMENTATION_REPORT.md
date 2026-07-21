# USERS EXCEL EXPORT — IMPLEMENTATION REPORT
## Abu Al-Arabi Platform — July 21, 2026

---

## Summary

A complete Excel export feature has been added to the Admin Users Management page (`/admin/users`). Admins can download all platform users — or the current filtered subset — as a real `.xlsx` file with Arabic headers, RTL direction, styled rows, and protected phone number formatting.

---

## Endpoint Added

**`GET /api/admin/users/export`**

- **File:** `artifacts/api-server/src/routes/admin-users-export.ts`  
- **Registered in:** `artifacts/api-server/src/routes/index.ts` (mounted at `/admin`, before the main admin router so `/users/export` resolves before `/users/:id`)
- **Library:** `exceljs@^4.x` — generates real OOXML `.xlsx`, not HTML renamed

### Supported Query Parameters

| Param | Type | Description |
|---|---|---|
| `search` | string | Filters by `fullName` or `phone` (LIKE) |
| `role` | string | Exact role match: student, admin, super_admin, etc. |
| `status` | string | Exact status match: active, suspended, frozen, etc. |
| `dateFrom` | ISO date | Registration date ≥ (start of day) |
| `dateTo` | ISO date | Registration date ≤ (end of day, 23:59:59) |

### Response Headers

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="users-export-YYYY-MM-DD.xlsx"; filename*=UTF-8''...
Cache-Control: no-store
```

---

## Frontend Button Location

**File:** `artifacts/abu-alarabi/src/pages/admin/users.tsx`

The export button appears in the page header row, directly to the left of "إضافة مستخدم":

```
[ تصدير إلى Excel ]  [ + إضافة مستخدم ]
```

**Button behavior:**
- Idle: `FileSpreadsheet` icon + "تصدير إلى Excel"
- Loading: spinning `Loader2` + "جاري تجهيز الملف..."
- Done (3s): `CheckCircle2` + "تم التصدير بنجاح"
- Error (4s): red tint + "تعذر التصدير"
- Repeated clicks disabled while loading
- `title` tooltip shows: "سيتم تصدير جميع النتائج المطابقة للفلاتر الحالية"
- Does not navigate away or open a new tab
- Uses `URL.createObjectURL` → programmatic `<a>` click → `revokeObjectURL` pattern

**Active filters forwarded to export:**
- Current `search` state
- Current `roleFilter` state

---

## Exported Columns

| Arabic Header | Source Field | Notes |
|---|---|---|
| الرقم | row index (1-based) | Sequential, not DB ID |
| الاسم الكامل | `users.full_name` | RTL alignment |
| رقم الهاتف | `users.phone` | Stored as **text** (`numFmt: "@"`), never converts to scientific notation |
| الدور | `users.role` | Mapped to Arabic: طالب / مدير / مدير عام / etc. |
| الحالة | `users.status` | Mapped to Arabic: نشط / معلق / مجمد / قيد الانتظار / محذوف |
| تاريخ التسجيل | `users.created_at` | Formatted `YYYY-MM-DD HH:mm` |
| عدد الامتحانات | COUNT of exam_attempts WHERE exam type ≠ 'weekly' | Aggregated in one SQL query |
| عدد الكويزات | COUNT of exam_attempts WHERE exam type = 'weekly' | Same aggregate query |

---

## Database Query Design

**Users query — no pagination limit:**
```sql
SELECT id, full_name, phone, role, status, created_at
FROM users
WHERE deleted_at IS NULL
  [AND role = ?]
  [AND status = ?]
  [AND (full_name LIKE ? OR phone LIKE ?)]
  [AND created_at >= ?]
  [AND created_at <= ?]
ORDER BY created_at ASC
```

**Exam/quiz counts — single aggregate JOIN (no N+1):**
```sql
SELECT
  ea.user_id,
  COUNT(DISTINCT CASE WHEN e.type != 'weekly' THEN ea.id END) AS exam_count,
  COUNT(DISTINCT CASE WHEN e.type = 'weekly'  THEN ea.id END) AS quiz_count
FROM exam_attempts ea
LEFT JOIN exams e ON e.id = ea.exam_id
GROUP BY ea.user_id
```

Results are loaded into a `Map<userId, { exams, quizzes }>` and joined in memory — no N+1, 2 total DB queries regardless of user count.

**Soft-deleted users excluded** via `isNull(usersTable.deletedAt)`.

---

## Excel Styling

| Feature | Implementation |
|---|---|
| Worksheet name | "المستخدمون" |
| Direction | RTL (`rightToLeft: true` on worksheet view) |
| Frozen header | `ySplit: 1` freeze pane |
| Auto-filter | Applied across all columns |
| Header background | Dark purple `#4A235A` with white bold text |
| Header height | 28px |
| Alternating rows | Even rows get light lavender `#F5F0FA` fill |
| Row height | 22px |
| Column widths | الرقم:8 · الاسم:30 · الهاتف:16 · الدور:16 · الحالة:14 · التاريخ:22 · الامتحانات:18 · الكويزات:16 |
| Phone numbers | `numFmt: "@"` — forces text, prevents scientific notation |
| Creator metadata | "أبو العربي" |

---

## Permission Checks

| Caller | Result |
|---|---|
| No token (guest) | **401 Unauthorized** |
| Student token | **403 Forbidden** (via `requireRole(["admin","super_admin"])`) |
| Admin token | **200** + xlsx binary |
| Super Admin token | **200** + xlsx binary |

The export button is rendered inside the `AdminLayout` — students never see the admin panel at all.

---

## Audit Log

Every successful export writes to `audit_logs`:

```
action:      USERS_EXPORTED
actorId:     <admin user ID>
actorName:   Admin
description: تصدير N مستخدم إلى Excel — فلاتر: بحث="..." دور="..." حالة="..."
```

Full exported user data is **not** logged — only the count and filter parameters.

---

## Privacy Exclusions

The following fields are **never exported**:

- `password_hash`
- `session_secret` / tokens
- `reset_tokens`
- `is_active` (internal boolean — Arabic `الحالة` from `status` enum is used instead)
- DB row IDs (row number used instead)
- IP addresses
- `deleted_at` timestamps
- Internal `group_id` foreign keys
- `onboarding_completed`

---

## Excel Library

**ExcelJS** (`pnpm --filter @workspace/api-server add exceljs`)

- Generates real OOXML `.xlsx` (not CSV or HTML)
- Supports cell-level formatting, fill, fonts, freeze panes, RTL, auto-filter
- Streams directly to `res` via `workbook.xlsx.write(res)` — no temp files, bounded memory

---

## Tests Executed

### Automated regression
```
38 passed | 0 failed | 0 skipped | 38 total ✅
```

### Manual API verification

| Test | Result |
|---|---|
| Guest → 401 | ✅ |
| Wrong credentials → 401 | ✅ |
| Admin login → 200 + xlsx Content-Type | ✅ |
| File magic bytes `PK\x03\x04` (valid zip/xlsx) | ✅ |
| Full export file size: 7,633 bytes (real data) | ✅ |
| `role=student` filter → 200 + smaller file | ✅ |
| `search=محمد` (URL-encoded Arabic) → 200 | ✅ |
| `search=test` (ASCII) → 200 | ✅ |
| No pagination limit (all users exported) | ✅ |
| TypeScript `tsc --noEmit` on API server | ✅ |
| TypeScript `tsc --noEmit` on frontend | ✅ |

### Acceptance criteria

- ✅ Button exists on `/admin/users` page  
- ✅ All matching users exported (no pagination limit)  
- ✅ Real `.xlsx` file with correct MIME type  
- ✅ Arabic column headers readable  
- ✅ Phone numbers preserved as text  
- ✅ Current filters (search, role) forwarded to export  
- ✅ Unauthorized users blocked (401/403)  
- ✅ Sensitive fields excluded  
- ✅ Audit log created per export  
- ✅ No navigation away from page  
- ✅ Loading / success / error states shown  
- ✅ Repeated clicks prevented during export  

---

## Files Changed

| File | Change |
|---|---|
| `artifacts/api-server/src/routes/admin-users-export.ts` | **New** — export endpoint |
| `artifacts/api-server/src/routes/index.ts` | Registered `adminUsersExportRouter` before `adminRouter` |
| `artifacts/abu-alarabi/src/pages/admin/users.tsx` | Export button + `handleExport` + state + icons |
