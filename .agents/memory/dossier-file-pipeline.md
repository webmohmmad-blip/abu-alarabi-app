---
name: Dossier File Pipeline
description: How dossier PDF and cover image files are stored, served, and displayed — and the bugs that were fixed.
---

## Rule
Storage objects endpoint (`GET /api/storage/objects/*path`) must have NO auth. It is called by `<img>` tags and PDF.js — neither can send a Bearer token.

## Why
Production bug: deployed code had `requireAuth` on this route. All cover images returned 401 because `<img>` makes plain browser GETs. PDF.js also failed for the same reason.

## Rule
PDF.js requires HTTP Range request support. The view endpoint (`GET /api/dossiers/:id/view`) must respond `206 Partial Content` to `Range:` requests. If the server returns `200` to a range probe, PDF.js aborts with a file error.

## Why
PDF.js sends `Range: bytes=0-1` before loading. A full `200` response means the server doesn't support seeking; PDF.js treats this as a broken source.

## How to apply
- `GET /api/dossiers/:id/view` — streams PDF inline with range support. No auth. Used by PDF.js in Study Room.
- `GET /api/dossiers/:id/download` — streams PDF as attachment. No auth. Increments downloads counter.
- `GET /api/storage/objects/*path` — serves any stored object (images, PDFs) with range support. No auth.
- `fileUrl` in DB is stored as `/api/storage/objects/uploads/<uuid>` (stable path, not signed URL).
- To extract objectPath from fileUrl: strip `/api/storage` prefix → `/objects/uploads/<uuid>`.
- Study Room must set `dossierFileUrl` to `/api/dossiers/${id}/view`, not to the raw `fileUrl` from the dossier list.
- Download button must use `fetch()` → blob → `<a download>` pattern (not a plain `<a href>`), so the blob is created client-side after fetch completes. This works on Safari/iOS.
