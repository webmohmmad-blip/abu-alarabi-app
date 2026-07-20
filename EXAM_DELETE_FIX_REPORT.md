# EXAM_DELETE_FIX_REPORT

## Root Cause

Two compounding bugs made exam deletion appear broken:

### Bug 1 — Backend returned 204 (empty body) ← Primary cause
`DELETE /admin/exams/:id` sent `res.status(204).send()` with no body.
`customFetch` always calls `response.json()` on the result.
Parsing an empty 204 body throws a JSON parse error →
`deleteExam` mutation fails → `onSuccess` never fires →
React Query cache never invalidated → list never refreshes.

### Bug 2 — Public exams list didn't filter soft-deleted records
The admin exams page fetched from the public `GET /api/exams` endpoint
(not the admin endpoint). That route had no `WHERE deleted_at IS NULL` filter,
so even if the cache had been invalidated, the deleted exam would have
reappeared in the next fetch.

### Additional UX issues
- Delete triggered via browser-native `confirm()` dialog — no proper modal
- No success toast after deletion
- No loading/disabled state during the DELETE request
- Question delete also used `confirm()` — same issue

---

## Files Modified

| File | Change |
|---|---|
| `artifacts/api-server/src/routes/admin.ts` | Fixed `DELETE /admin/exams/:id` — returns `{ ok, message }` JSON with 200; adds 404 check; validates ID |
| `artifacts/api-server/src/routes/exams.ts` | Added `isNull(examsTable.deletedAt)` to the public `GET /api/exams` query |
| `artifacts/abu-alarabi/src/pages/admin/exams.tsx` | Full frontend fix — confirmation modal, success toast, loading state, question confirmation modal |

---

## Endpoint Behavior (after fix)

### `DELETE /api/admin/exams/:id`
| Scenario | HTTP Status | Response |
|---|---|---|
| Success | 200 | `{ "ok": true, "message": "تم حذف الامتحان بنجاح" }` |
| Exam not found (already deleted or never existed) | 404 | `{ "ok": false, "message": "الامتحان غير موجود" }` |
| Invalid ID (NaN, letters) | 400 | `{ "ok": false, "message": "معرّف الامتحان غير صالح" }` |
| Unauthenticated | 401 | `{ "error": "غير مصرح" }` |
| Authenticated but not admin | 403 | `{ "error": "ليس لديك صلاحية" }` |

### `GET /api/exams` (public)
Now always excludes soft-deleted exams (`WHERE deleted_at IS NULL`).

---

## Database Strategy

**Soft delete** — sets `deleted_at` timestamp, never destroys rows.

- Draft exams with no attempts → soft deleted (safe to restore if needed)
- Published exams with student attempts → same soft delete; student results
  (`exam_attempts`, `attempt_answers`) are preserved via their own cascade rules
- Admins see the updated list immediately (filtered by `deleted_at IS NULL`)
- Students never see deleted exams (same filter on public route)

Child table cascade behaviour (from schema):
- `questions` → `ON DELETE CASCADE` from `exams`
- `question_choices` → `ON DELETE CASCADE` from `questions`
- `exam_attempts` → `ON DELETE CASCADE` from `exams`
- `attempt_answers` → `ON DELETE CASCADE` from `exam_attempts`
- `weekly_quizzes` → `ON DELETE CASCADE` from `exams`

Soft delete avoids triggering any cascade, keeping all historical data intact.

---

## Permission Checks

| Role | Can delete exam? |
|---|---|
| `super_admin` | ✅ Yes |
| `admin` | ✅ Yes |
| `student` | ❌ No — 403 |
| Unauthenticated | ❌ No — 401 |

Enforced by `router.use(requireAuth)` + `router.use(requireRole(["admin", "super_admin"]))` at the top of `admin.ts` (applies to all routes including DELETE).

---

## Frontend Changes

### Exam deletion
- Trash icon opens a **confirmation modal** (not `confirm()`) showing:
  - Exam title in a highlighted box
  - Warning: "هذا الإجراء لا يمكن التراجع عنه"
  - Two buttons: **إلغاء** / **حذف الامتحان**
- Delete button shows spinner + "جارٍ الحذف..." while pending
- Both buttons disabled during pending (prevents double submission)
- On success: modal closes, list refreshes, green toast "تم حذف الامتحان بنجاح"
- On error: red toast with the server's Arabic error message

### Question deletion
- Same pattern: confirmation modal with question text preview
- Shows loading state and disables buttons during deletion
- On success: question list refreshes, green toast "تم حذف السؤال بنجاح"

---

## Tests Performed

| # | Scenario | Result |
|---|---|---|
| 1 | Delete existing exam → `{ ok: true, message: "تم حذف الامتحان بنجاح" }` | ✅ |
| 2 | Delete same exam again → 404 `"الامتحان غير موجود"` | ✅ |
| 3 | Public list does not show deleted exam | ✅ |
| 4 | Unauthenticated DELETE → 401 `"غير مصرح"` | ✅ |
| 5 | Invalid exam ID (letters) → 400 `"معرّف الامتحان غير صالح"` | ✅ |
| 6 | Frontend: confirmation modal opens on trash click | ✅ |
| 7 | Frontend: İlgaء button closes modal without deleting | ✅ |
| 8 | Frontend: delete button disabled during pending | ✅ |
| 9 | Frontend: success toast shown after deletion | ✅ |
| 10 | Frontend: question delete has its own confirmation modal | ✅ |

## Confirmation: Exam deletion now works end-to-end ✅
