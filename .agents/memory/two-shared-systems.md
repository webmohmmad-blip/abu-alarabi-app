---
name: Two Shared Systems Refactor
description: How the admin panel is organised into two shared component systems for Educational Files and Assessments.
---

## Rule
Admin pages must import shared components from these paths — never re-implement inline:
- `@/components/admin/shared/admin-toast` → `AdminToast`
- `@/components/admin/shared/delete-dialog` → `DeleteDialog`
- `@/components/admin/shared/status-badge` → `StatusBadge`
- `@/components/admin/shared/stats-cards` → `StatsCards`
- `@/components/admin/assessment/question-builder` → `QuestionPanel`

## Why
~1,260 lines of duplicated Toast/statusBadge/DeleteModal/StatsCards/QuestionPanel code were spread across content.tsx, worksheets.tsx, exams.tsx, quiz.tsx. All four pages now use shared imports.

## How to apply
- `QuestionPanel` takes `assessmentId` (not `examId` or `quizId`), `listQueryKey`, `qc`, `onToast`.
- For exams: `listQueryKey={["/api/admin/exams-list"]}`.
- For quiz: `listQueryKey={QUIZ_KEY}` where `QUIZ_KEY = ["/api/admin/quiz-list"]`.
- `DeleteDialog` accepts optional `zClass` to override z-index for nested modals (e.g. z-[60] for dossier-delete inside content.tsx which already has a z-50 modal).
- Exams page only shows `type != 'weekly'`; Quiz page only shows `type = 'weekly'`. Both use `examsTable` — no separate table.
- Pre-existing TS errors in dashboard.tsx, dossier-detail.tsx, exam-instructions.tsx, home.tsx, notes.tsx, quiz.tsx (user-facing) are carry-overs, not introduced here.
