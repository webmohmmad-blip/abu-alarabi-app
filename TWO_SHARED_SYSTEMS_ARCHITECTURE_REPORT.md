# Two Shared Systems Architecture Report

**Date:** 2026-07-20  
**Platform:** Abu Al-Arabi Admin — Tawjihi Education Platform

---

## Overview

The admin panel is now organised into two internal shared systems while preserving four independent, separately-routed user-facing pages. No DB tables were merged, no routes were removed, and no migrations were required.

---

## System 1 — Educational Files

| Page | Route | DB Table |
|------|-------|----------|
| دوسيات (Dossiers) | `/admin/content` | `dossiersTable` |
| أوراق العمل (Worksheets) | `/admin/worksheets` | `worksheetsTable` |

### Shared components used by both pages

| Component | File | Replaces |
|-----------|------|---------|
| `AdminToast` | `src/components/admin/shared/admin-toast.tsx` | Inline `Toast` function (×2 pages) |
| `DeleteDialog` | `src/components/admin/shared/delete-dialog.tsx` | `AnimatePresence` delete modal block (×3 in content.tsx, ×1 in worksheets.tsx) |
| `StatusBadge` | `src/components/admin/shared/status-badge.tsx` | Inline `statusBadge` function (×2 pages) |
| `StatsCards` | `src/components/admin/shared/stats-cards.tsx` | 4-column inline card grid (×2 pages) |

---

## System 2 — Assessments

| Page | Route | DB Table / Filter |
|------|-------|-------------------|
| امتحانات (Exams) | `/admin/exams` | `examsTable WHERE type != 'weekly'` |
| كويز أسبوعي (Weekly Quiz) | `/admin/quiz` | `examsTable WHERE type = 'weekly'` |

Both pages share the same underlying DB table (`examsTable`) using the existing `examTypeEnum` — no new table, no migration.

### Shared components used by both pages

| Component | File | Replaces |
|-----------|------|---------|
| `AdminToast` | `src/components/admin/shared/admin-toast.tsx` | Inline `Toast` function (×2 pages) |
| `DeleteDialog` | `src/components/admin/shared/delete-dialog.tsx` | `AnimatePresence` delete modal block (×2 pages) |
| `StatusBadge` | `src/components/admin/shared/status-badge.tsx` | Inline `statusBadge` function (×2 pages) |
| `StatsCards` | `src/components/admin/shared/stats-cards.tsx` | 4-column inline card grid (×2 pages) |
| `QuestionPanel` | `src/components/admin/assessment/question-builder.tsx` | Full inline `QuestionPanel` component (~150 lines, ×2 pages) |
| `AddQuestionForm` | (exported from `question-builder.tsx`) | Full inline `AddQuestionForm` component (~220 lines, ×2 pages) |

### API consolidation for assessments

| Endpoint | Scope |
|----------|-------|
| `GET/POST/PATCH/DELETE /api/admin/exams` | `type != 'weekly'` — Exams page only |
| `GET/POST/PATCH/DELETE /api/admin/quiz` | `type = 'weekly'` — Quiz page only |
| `GET/POST/DELETE /api/admin/exams/:id/questions` | Used by both via shared `QuestionPanel` |
| `POST /api/admin/exams/:id/duplicate` | Used by both |

---

## Duplicated Code Removed

| Category | Removed from | Lines saved |
|----------|-------------|-------------|
| Inline `Toast` function | content, worksheets, exams, quiz | ~70 |
| Inline `statusBadge` function | worksheets, exams, quiz | ~30 |
| Inline stats card grid | worksheets, exams, quiz | ~45 |
| Inline `AnimatePresence` delete modals | content (×2), worksheets, exams, quiz | ~375 |
| Inline `QuestionPanel` component | exams, quiz | ~300 |
| Inline `AddQuestionForm` component | exams, quiz | ~440 |
| **Total** | | **~1,260 lines** |

---

## Shared Component Directory Structure

```
src/components/admin/
├── shared/
│   ├── admin-toast.tsx       ← AdminToast (success/error feedback)
│   ├── delete-dialog.tsx     ← DeleteDialog (animated confirm modal)
│   ├── status-badge.tsx      ← StatusBadge + statusBadgeFn helper
│   └── stats-cards.tsx       ← StatsCards + buildDefaultStats()
└── assessment/
    └── question-builder.tsx  ← QuestionPanel + AddQuestionForm (7 question types)
```

---

## DB Approach — No Migration Required

- `dossiersTable` and `worksheetsTable` remain separate (different schemas, different subjects-relationship).  
- `examsTable` is shared between Exams and Weekly Quiz via `type` column (`examTypeEnum` already contained `'weekly'`).  
- No new tables, no `ALTER TABLE`, no data migration.

---

## Routes Preserved

All four admin pages keep their independent routes and navigation entries:
- `/admin/content` — دوسيات ومواد
- `/admin/worksheets` — أوراق العمل
- `/admin/exams` — الامتحانات
- `/admin/quiz` — الكويز الأسبوعي

---

## Verification

- All four pages hot-reload cleanly with zero Vite errors after the refactor.
- TypeScript: zero new errors introduced (pre-existing carry-over errors in non-admin pages are unaffected).
- API server: all quiz/exam/worksheet/content endpoints return 200/201 in logs.
- `QuestionPanel` + `AddQuestionForm` now resolve from `question-builder.tsx` for both exams.tsx and quiz.tsx.
- `DeleteDialog` handles the `zClass` override needed by the nested dossier-delete modal in content.tsx.
