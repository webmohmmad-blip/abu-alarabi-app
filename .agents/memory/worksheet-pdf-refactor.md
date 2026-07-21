---
name: Worksheet PDF Study Room Refactor
description: Key decisions from converting worksheets from electronic quiz system to PDF study materials
---

## Rule
Worksheets are now PDF study materials — not electronic quizzes. Every worksheet has `fileUrl` (PDF), `coverUrl` (image), `description`, and `estimatedMinutes`. No questionCount, scores, or attempts anywhere in the UI.

## Architecture Decisions

**Separate annotation tables:** Worksheet annotations/bookmarks/progress are in dedicated DB tables (`worksheet_annotations`, `worksheet_bookmarks`, `worksheet_progress`), completely separate from dossier tables. No cross-contamination.

**`dossierId` reused as generic `sourceId` in Study Room:** Rather than adding a new state variable, `dossierId` doubles as the source ID for both dossiers and worksheets. `sourceType: "DOSSIER" | "WORKSHEET"` state determines which API endpoints to call. Computed base URL strings (`annotationBase`, `bookmarkBase`, `progressBase`, `bookmarkQueryKey`) handle routing transparently.

**URL param pattern:** `/study-room?worksheetId=:id` opens a worksheet. `/study-room?dossierId=:id` opens a dossier. Both are handled in the same Study Room component.

**Stream endpoints are auth-free:** `/worksheets/:id/view` and `/worksheets/:id/download` do not use `requireAuth`. Required for `<iframe>` and PDF.js range requests to work without Authorization headers.

**Why:**
- Dossier pipeline lesson (from dossier-file-pipeline.md) applied directly: auth-free streaming + range-request (206) support are both mandatory for PDF.js to function.
- Keeping `dossierId` variable name avoids a large rename refactor with high regression risk.
- Separate DB tables (not a shared `source_type` column) makes queries simpler and ensures one source can never pollute another's annotations.
