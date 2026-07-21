---
name: Weekly Quiz Table Split
description: Weekly quizzes live in examsTable (type="weekly"), not weeklyQuizzesTable. useStartExam mutation shape bug.
---

## Rule
Weekly quizzes are stored in `examsTable` with `type = "weekly"`. The `weeklyQuizzesTable` exists in the schema but is NOT used by the admin quiz creation flow. Do not query `weeklyQuizzesTable` for student-facing quiz content.

## Canonical flow
- Admin creates via `POST /api/admin/quiz` → inserts into `examsTable`, `type = "weekly"`
- Admin publishes via `PATCH /api/admin/exams/:id` with `{ status: "published", isAvailable: true }`
- Student sees quiz via `GET /api/quiz/current` → queries `examsTable` where `type="weekly"`, `status="published"`, `isAvailable=true`, `deletedAt IS NULL`

## useStartExam mutation shape
`useStartExam` from `@workspace/api-client-react` expects `mutate({ id: number })`, NOT `mutate({ data: { examId } })`.
Calling with `{ data: { examId } }` makes `props.id = undefined`, URL becomes `/api/exams/undefined/start` → 404.

**Why:** The API client is auto-generated from OpenAPI schema. The generated `mutationFn` destructures `const { id } = props` directly from the top level.

**How to apply:** Any page that starts an exam must call `startExam.mutate({ id: examId })`.
