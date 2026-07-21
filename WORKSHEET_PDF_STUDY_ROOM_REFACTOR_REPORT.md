# WORKSHEET PDF & STUDY ROOM REFACTOR — COMPLETION REPORT
**Date:** 2026-07-21  
**Scope:** Convert the Worksheets feature from an electronic quiz system into a PDF-based study material system, fully integrated with the Study Room and matching the Dossier pipeline.

---

## Summary

The worksheets feature has been completely refactored. All electronic-quiz fields, buttons, and logic have been removed. Every worksheet is now a PDF file with a cover image, description, grade, and estimated time. Students can study any worksheet directly in the Study Room (with full annotation, bookmark, progress, and Pomodoro support) or download it as PDF.

---

## Database Schema Changes

**Table: `worksheets`** — Two new nullable columns added:
- `description text` — Free-text description of the worksheet
- `cover_url text` — URL to the cover image (same object-storage pattern as dossiers)

**New tables** (all created via raw SQL `ALTER TABLE` / `CREATE TABLE IF NOT EXISTS`):
- `worksheet_annotations` — Per-page drawing strokes (mirrors `dossier_annotations`)
- `worksheet_bookmarks` — Page bookmarks (mirrors `dossier_bookmarks`)
- `worksheet_progress` — Last-read-page progress (mirrors `dossier_reading_progress`)

All new tables use `user_id` + `worksheet_id` foreign keys with `ON DELETE CASCADE`.

---

## Backend Changes

### `artifacts/api-server/src/routes/worksheets.ts` — Complete rewrite
- `GET /worksheets` — list (includes `description`, `coverUrl` in response)
- `GET /worksheets/:id` — detail (includes all new fields)
- `GET /worksheets/:id/view` — streams PDF inline with **range-request (206)** support for PDF.js
- `GET /worksheets/:id/download` — streams PDF as attachment, increments `downloads` counter
- All streaming uses the same `fileUrlToObjectPath` + `createReadStream().pipe(res)` pattern established for dossiers

### `artifacts/api-server/src/routes/workspace.ts` — Complete rewrite
- Preserved all existing dossier annotation/bookmark/progress routes
- Added 6 new parallel routes for worksheets:
  - `GET /PUT /workspace/worksheet-annotations/:worksheetId/:page`
  - `GET /POST /workspace/worksheet-bookmarks/:worksheetId`
  - `DELETE /workspace/worksheet-bookmarks/:id`
  - `GET /PUT /workspace/worksheet-progress/:worksheetId`

### `artifacts/api-server/src/routes/admin.ts`
- Worksheet `POST` and `PATCH` now accept `description` and `coverUrl` fields

---

## Frontend Changes

### `artifacts/abu-alarabi/src/pages/worksheets.tsx` — Complete redesign
- Removed: quiz stats (questionCount, solvers, difficulty badge), "ابدأ الحل" button
- Added: cover image with fallback, description, grade badge, estimated time
- Two action buttons per card:
  - **Primary (green):** "حلّ في غرفتي الدراسية" → navigates to `/study-room?worksheetId=:id`
  - **Secondary:** "تحميل PDF" → fetch→blob download (same pattern as dossier-detail)
- Subject filter pills + search preserved

### `artifacts/abu-alarabi/src/pages/worksheet-detail.tsx` — New page
- Detail view matching `dossier-detail.tsx` pattern
- Cover image (portrait, sticky), title, description, subject/grade badges, estimated time
- Primary: "حلّ في غرفتي الدراسية"
- Secondary: "تحميل PDF"
- Tertiary: "معاينة سريعة" (inline iframe using `/api/worksheets/:id/view`)

### `artifacts/abu-alarabi/src/pages/study-room.tsx`
- Parses `?worksheetId=` URL param alongside existing `?dossierId=`
- New `sourceType: "DOSSIER" | "WORKSHEET"` state
- Computed source-type-aware API base URLs (`annotationBase`, `bookmarkBase`, `progressBase`, `bookmarkQueryKey`)
- New `openWorksheet()` function (mirrors `openDossier()`)
- Auto-open effect for `worksheetId` URL param
- Worksheets query added; worksheets section shown in the file picker page
- All annotation load/save, bookmark CRUD, progress save routed to correct endpoints based on `sourceType`
- Recent sessions extended with `sourceType` field — re-opening a worksheet session uses `openWorksheet()`

### `artifacts/abu-alarabi/src/pages/admin/worksheets.tsx`
- Header: "أوراق العمل الإلكترونية" → "أوراق العمل"
- Form: added `description` textarea, added cover image upload (same upload-URL pattern as PDF), removed `questionCount` field
- Row display: removed question count stat
- Duplicate mutation: updated to pass `description` and `coverUrl`, removed `questionCount`

### `artifacts/abu-alarabi/src/App.tsx`
- Added route: `<Route path="/worksheets/:id" component={WorksheetDetail} />`

---

## Architecture Decisions

1. **Annotation separation by `sourceType`:** Worksheet annotations are stored in completely separate DB tables from dossier annotations. This prevents any cross-contamination and makes it clear which source a set of strokes belongs to.

2. **`dossierId` state reused as generic `sourceId`:** Rather than adding a separate `worksheetId` state in the Study Room, the existing `dossierId` state variable doubles as the source ID. The `sourceType` state determines which endpoints to call. This minimises the diff and reduces risk of regressions.

3. **No separate PDF reader:** The Study Room is the single PDF reader for both dossiers and worksheets, per the spec requirement.

4. **Range-request streaming:** The `/worksheets/:id/view` endpoint supports HTTP 206 partial content (range requests), required for PDF.js to seek through pages efficiently.

5. **Auth-free streaming endpoints:** `/worksheets/:id/view` and `/worksheets/:id/download` do not require authentication, consistent with the dossier streaming endpoints and the requirement that `<iframe>` and `<img>` tags work without Authorization headers.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/db/src/schema/content.ts` | Added `description`, `coverUrl` to `worksheetsTable`; added 3 new annotation/bookmark/progress tables |
| `artifacts/api-server/src/routes/worksheets.ts` | Complete rewrite — added view/download stream endpoints |
| `artifacts/api-server/src/routes/workspace.ts` | Complete rewrite — added worksheet annotation/bookmark/progress routes |
| `artifacts/api-server/src/routes/admin.ts` | Added `description`, `coverUrl` to worksheet POST/PATCH |
| `artifacts/abu-alarabi/src/pages/worksheets.tsx` | Complete redesign — PDF card UI with study room + download buttons |
| `artifacts/abu-alarabi/src/pages/worksheet-detail.tsx` | **New file** — worksheet detail page |
| `artifacts/abu-alarabi/src/pages/study-room.tsx` | Added `worksheetId` URL param, `sourceType` state, `openWorksheet()`, worksheets sidebar section, source-type-aware API routing |
| `artifacts/abu-alarabi/src/pages/admin/worksheets.tsx` | Removed questionCount, added description + cover image upload |
| `artifacts/abu-alarabi/src/App.tsx` | Added `/worksheets/:id` route |
