---
name: Study Room 2.0
description: Complete rebuild of the study room as a GoodNotes-like workspace — architecture, DB tables, API, and pdfjs-dist integration details.
---

## Architecture

Full-screen workspace (no DashboardLayout — manages its own layout), accessed at `/study-room?dossierId=X`.

### Layout
- TopToolbar (h-12): back, sidebar toggle, title, page nav, zoom, undo/redo, bookmark, save status, fullscreen
- LeftSidebar (w-72): tabs = Notes | Tasks | Bookmarks | Quick Files
- Center: PDF canvas (pdfjs-dist) + annotation canvas overlay, scrollable
- BottomAnnotationBar (h-14): hand/pen/highlighter/eraser/rect/circle/line tools + colors + stroke widths

### PDF Rendering
- **Library:** `pdfjs-dist` v6.1.200 (installed in @workspace/abu-alarabi)
- **Worker:** CDN URL — `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
- **Render:** `page.render({ canvasContext: ctx as any, viewport } as any).promise` — the `as any` casts are required due to pdfjs-dist v6 TypeScript strictness
- One page rendered at a time (currentPage state), user navigates manually

### Annotation System
- Per-page strokes stored in `Map<pageNumber, Stroke[]>`
- Separate undo/redo history stacks per page
- Auto-save debounced 1500ms after last stroke → `PUT /api/workspace/annotations/:dossierId/:page`
- Strokes format: `{ id, tool, color, width, opacity, points: [{x,y}], rect?, text? }`

### Dossier Source
- Opens from URL param `?dossierId=X`, matched against `/api/dossiers` (returns `{ items: [...] }` not array)
- If no dossierId: shows dossier picker UI

## New DB Tables (migration: 29 succeeded)

- `dossier_annotations` — userId, dossierId, pageNumber, strokesJson (text), updatedAt
- `dossier_bookmarks` — userId, dossierId, pageNumber, title, createdAt
- `dossier_reading_progress` — userId, dossierId, lastPage, updatedAt

All in `lib/db/src/schema/study.ts`.

## New API Routes (`artifacts/api-server/src/routes/workspace.ts`)

- GET/PUT `/api/workspace/annotations/:dossierId/:page` — upsert strokes
- GET/POST/DELETE `/api/workspace/bookmarks/:dossierId` + `/api/workspace/bookmarks/:id`
- GET/PUT `/api/workspace/progress/:dossierId` — last page read

## Object Storage (for PDF upload in admin)

- Setup complete: `setupObjectStorage()` ran, secrets set
- Route in `storage.ts`: POST `/api/storage/uploads/request-url` (JWT auth) → returns `{ uploadURL, objectPath }`
- Client uploads file directly to GCS via PUT to presigned URL
- Serving URL: `/api/storage${objectPath}`
- Admin `AddDossierModal` now has a file upload button + fallback manual URL input

## Known Constraints

- pdfjs-dist v6 TypeScript: must cast render params `as any` 
- Dossiers API returns `{ items: [...] }` not a plain array — always call `.then(r => r.items ?? [])`
- `/api/dossiers` is public (no auth) but notes/bookmarks/workspace routes require JWT Bearer
