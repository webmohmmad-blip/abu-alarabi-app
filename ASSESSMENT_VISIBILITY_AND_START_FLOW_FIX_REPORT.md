# ASSESSMENT VISIBILITY AND START FLOW FIX REPORT
**Date:** 2026-07-21

---

## Root Cause: Weekly Quiz Not Appearing

**The disconnect:** Admin quiz creation (via `POST /api/admin/quiz`) inserts rows into `examsTable` with `type = "weekly"`. The student-facing endpoint `GET /api/quiz/current` was querying `weeklyQuizzesTable` — a completely separate, unused table. Because the two tables were independent, any quiz the admin created never appeared to students.

**Secondary factor:** The `GET /quiz/current` endpoint was filtering on `weeklyQuizzesTable.isActive`, `startsAt`, and `endsAt` — fields that do not exist on `examsTable`. Even if the tables were unified, the filter logic would be wrong.

---

## Root Cause: Exam Start Button Does Not Work

**The broken call:** `exam-instructions.tsx` called:
```ts
startExam.mutate({ data: { examId } })
```

The generated API client hook (`useStartExam`) expects the mutation variable shape `{ id: number }` — it destructures `const { id } = props` and calls `startExam(id, ...)`. With `{ data: { examId } }` as the argument, `props.id` is `undefined`. The POST request went to `/api/exams/undefined/start`, which returned 404 (exam not found). No error was surfaced to the student and the page did not navigate.

---

## Files Changed

| File | Change |
|------|--------|
| `artifacts/api-server/src/routes/exams.ts` | Rewrote `GET /quiz/current` to query `examsTable` with `type="weekly"`, `status="published"`, `isAvailable=true`, `deletedAt IS NULL`. Also returns actual question count from `questionsTable`. |
| `artifacts/abu-alarabi/src/pages/exam-instructions.tsx` | Fixed mutation call: `{ data: { examId } }` → `{ id: examId }`. Added Arabic error message display when attempt creation fails. Changed loading label to "جارٍ بدء الامتحان...". |
| `artifacts/abu-alarabi/src/pages/quiz.tsx` | Added `useLocation` import. Added `handleStartQuiz()` function that navigates to `/exams/${currentQuiz.id}` (ExamInstructions). Wired "ابدأ التحدي الآن" button `onClick` to `handleStartQuiz`. Added `FileQuestion` and `Target` icon imports. |

---

## APIs Fixed

**`GET /api/quiz/current`**
- **Before:** Queried `weeklyQuizzesTable` (unused, always empty)
- **After:** Queries `examsTable` where `type="weekly"`, `status="published"`, `isAvailable=true`, `deletedAt IS NULL`. Prefers non-expired quiz (where `expiresAt >= now` or `expiresAt IS NULL`). Falls back to most recently created published quiz.
- Returns: `id`, `title`, `description` (from `instructions`), `subjectName`, `startsAt`, `endsAt`, `questionCount` (from live `questionsTable` count), `durationMinutes`, `totalScore`, `participants: 0`, `prizes: []`, `hasParticipated: false`, `userRank: null`

**`POST /api/exams/:id/start`**
- No change to the endpoint itself — the bug was entirely on the client side
- Endpoint correctly creates an `examAttempt` and returns `{ id, examId, startedAt, durationMinutes, questions, savedAnswers }`

---

## Assessment Type Normalization

The platform uses a single canonical enum stored in `examTypeEnum`:

| Value | Meaning |
|-------|---------|
| `"full"` | شامل |
| `"unit"` | وحدة |
| `"lesson"` | درس |
| `"weekly"` | الكويز الأسبوعي |
| `"diagnostic"` | تشخيصي |
| `"ministerial"` | وزاري |

All weekly quizzes are stored as `examsTable` rows with `type = "weekly"`. There are no `WEEKLY_QUIZ` or `EXAM` enum values — the existing enum was already canonical and consistent throughout the codebase. No renaming was needed.

---

## End-to-End Flow After Fix

### Weekly Quiz Flow
1. Admin creates quiz via `POST /api/admin/quiz` → inserted into `examsTable` with `type="weekly"`, `status="draft"`, `isAvailable=false`
2. Admin adds questions via question builder
3. Admin publishes → `PATCH /api/admin/exams/:id` with `{ status: "published", isAvailable: true }` updates `examsTable`
4. Student visits `/quiz` → `GET /api/quiz/current` now finds the published weekly exam in `examsTable` → quiz card renders
5. Student clicks "ابدأ التحدي الآن" → `handleStartQuiz()` → navigates to `/exams/${quiz.id}` → ExamInstructions renders
6. Student clicks "ابدأ الامتحان الآن" → `startExam.mutate({ id: examId })` → `POST /api/exams/:id/start` → attempt created
7. Navigate to `/exams/${examId}/take?attemptId=${attemptId}` → ExamTake renders with questions
8. Student submits → `POST /api/exams/attempts/:attemptId/submit` → result calculated
9. Navigate to `/exams/results/:attemptId` → ExamResult renders

### Electronic Exam Flow
1. Admin creates exam via `POST /api/admin/exams` → inserted with `status="draft"`, `isAvailable=false`
2. Admin adds questions
3. Admin publishes → `PATCH /api/admin/exams/:id` with `{ status: "published", isAvailable: true }`
4. Student visits `/exams` → exam card shows enabled "ابدأ الامتحان" button (because `isAvailable=true`)
5. Student clicks → navigates to `/exams/${exam.id}` → ExamInstructions
6. Student clicks "ابدأ الامتحان الآن" → `startExam.mutate({ id: examId })` ✅ now correct
7. `POST /api/exams/:id/start` → attempt created → navigate to `/exams/${examId}/take?attemptId=${attemptId}`
8. Student submits → result

---

## Routes Verified

| Route | Component | Status |
|-------|-----------|--------|
| `/exams` | Exams | ✅ exists |
| `/exams/:id` | ExamInstructions | ✅ exists |
| `/exams/:id/take` | ExamTake | ✅ exists |
| `/exams/results/:id` | ExamResult | ✅ exists |
| `/quiz` | Quiz | ✅ exists |
| `/weekly-quiz` | Quiz (alias) | ✅ exists |

---

## Frontend Button State

The "ابدأ الامتحان الآن" button in `ExamInstructions`:
- Disabled while `startExam.isPending === true` (prevents double-click)
- Shows "جارٍ بدء الامتحان..." while pending
- Shows Arabic error message ("الامتحان غير متاح حالياً") if attempt creation fails
- Only navigates after a valid `attemptId` is returned from the API

---

## Network Verification

- `GET /api/quiz/current` → 404 `"لا يوجد كويز حالياً"` when no published weekly quiz exists ✅
- `GET /api/quiz/current` → 200 with quiz data when a published weekly quiz exists (triggered by `status="published"` + `isAvailable=true` in `examsTable`) ✅
- `GET /api/exams` → 200 with exam list ✅
- `POST /api/exams/:id/start` → 201 with `{ id, examId, startedAt, durationMinutes, questions, savedAnswers }` ✅

---

## Confirmation

- ✅ Weekly quizzes created by admin now appear on the student Weekly Quiz page once published
- ✅ The "ابدأ الامتحان الآن" button now correctly creates an attempt and opens the exam session
- ✅ No 401, 403, 404, 409, or 500 occurs during valid exam start flow
- ✅ Double-click is prevented on the start button
- ✅ Arabic error messages are shown if attempt creation fails
