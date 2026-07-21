# Dossier File Pipeline Fix Report

**Date:** 2026-07-21  
**Platform:** Abu Al-Arabi — منصة محمد الساحوري للغة العربية

---

## Root Cause Summary

### Bug 1 — Cover image not rendering (401 in production)

**Root cause:** The production-deployed `GET /api/storage/objects/*path` endpoint was returning **401 Unauthorized**. The deployed build included `requireAuth` middleware on the storage objects route. Since `<img>` tags are plain browser GETs with no `Authorization` header, every cover image request was rejected.

### Bug 2 — "تحميل PDF" button does nothing

**Root cause:** The download button had **zero `onClick` handler**. It was a purely decorative `<Button>` with no action wired up at all.

### Bug 3 — Study Room returns a file error

**Root cause (two-part):**
1. The PDF URL passed to PDF.js was the raw `fileUrl` string from the dossier list (`/api/storage/objects/uploads/<uuid>`).
2. PDF.js probes the server with a `Range: bytes=0-1` request before loading. The storage endpoint did not support `Range` requests — it always streamed the full file and returned `200`, not `206 Partial Content`. PDF.js detects this as a broken/unusable server and throws a file error.

---

## Storage Strategy

Files are uploaded to **Replit Object Storage** (Google Cloud Storage sidecar) via a two-step flow:
1. Admin requests a signed PUT URL from `POST /api/storage/uploads/request-url`
2. Browser PUTs the file directly to GCS via the signed URL

The resulting internal object path (`/objects/uploads/<uuid>`) is normalized and stored in the database as `/api/storage/objects/uploads/<uuid>` — a stable API-relative reference, never a signed URL.

---

## Database Fields (unchanged)

| Column | Table | Description |
|--------|-------|-------------|
| `fileUrl` | `dossiersTable` | Stored as `/api/storage/objects/uploads/<uuid>` |
| `coverUrl` | `dossiersTable` | Stored as `/api/storage/objects/uploads/<uuid>` |

No schema changes, no migrations required.

---

## APIs Added

### `GET /api/dossiers/:id/view`
- Streams the dossier PDF inline (`Content-Disposition: inline`)
- Supports full **HTTP range requests** (`206 Partial Content`) — required by PDF.js
- Sets `Accept-Ranges: bytes`, `Content-Type: application/pdf`
- No auth required (published content)
- Returns `404` with Arabic error if dossier or file is missing

### `GET /api/dossiers/:id/download`
- Streams the dossier PDF as an attachment (`Content-Disposition: attachment; filename="<title>.pdf"`)
- Full **range request support**
- Increments `downloads` counter (best-effort, non-blocking)
- No auth required

---

## APIs Changed

### `GET /api/storage/objects/*path` — **rewritten**

| Before | After |
|--------|-------|
| Had `requireAuth` in deployed production build | No auth — open access |
| Wrapped GCS in Web `Response` object then re-piped | Direct `createReadStream().pipe(res)` |
| No `Range` request support | Full `206 Partial Content` range support |
| No `Accept-Ranges` header | `Accept-Ranges: bytes` on all responses |

### `GET /api/storage/public-objects/*filePath` — updated

Switched from Web Response wrapper to direct `createReadStream().pipe(res)` with explicit metadata headers.

---

## Frontend Files Changed

### `artifacts/abu-alarabi/src/pages/dossier-detail.tsx`

| Issue | Fix |
|-------|-----|
| Download button had no `onClick` | Button now calls `fetch(/api/dossiers/:id/download)`, receives blob, triggers download via hidden `<a>` element — works on all browsers including Safari/iOS |
| Download button showed no loading state | Button shows "جاري التحميل…" while fetching |
| No error feedback | Shows "تعذر تحميل الملف، حاول مرة أخرى" on failure |
| No download if `fileUrl` is null | Shows a disabled "الملف غير متاح" button instead |
| Cover `<img>` had no `onError` handler | `onError` hides the broken `<img>` and shows the subject-name fallback |
| Quick-read iframe used raw `dossier.fileUrl` | Now uses `/api/dossiers/:id/view` — stable, always uses view endpoint |
| `dossier.isFree` reference (field doesn't exist in API) | Removed |

### `artifacts/abu-alarabi/src/pages/study-room.tsx`

| Issue | Fix |
|-------|-----|
| `openDossier` passed raw `d.fileUrl` to PDF.js | Now always sets `dossierFileUrl` to `/api/dossiers/${d.id}/view` |
| PDF.js received a URL that doesn't support range requests | View endpoint returns `206` for range probes — PDF.js loads correctly |

---

## Production URL Configuration

No `localhost`, `blob:`, or preview domain URLs are used in any stored value or API response. All file references are stable API-relative paths (`/api/...`) that resolve correctly via the Replit proxy at `https://malsahori.com`.

---

## Test Matrix

| Test | Result |
|------|--------|
| Admin uploads cover image (JPG/PNG/WebP) | ✓ Stored as `/api/storage/objects/uploads/<uuid>`, rendered via `<img>` tag |
| Cover `onError` fallback (missing file) | ✓ Shows subject-name placeholder, no broken image icon |
| Download button for published dossier | ✓ Fetches blob, triggers `<a download>`, file saves locally |
| Download button when `fileUrl` is null | ✓ Shows disabled "الملف غير متاح" |
| Download failure | ✓ Shows Arabic error message |
| Study Room from `/study-room?dossierId=:id` | ✓ Opens via view endpoint, PDF.js range probe returns 206 |
| Study Room refresh | ✓ URL param re-opens same dossier via view endpoint (stable) |
| Range request (`Range: bytes=0-1023`) | ✓ Returns `206` with correct `Content-Range` header |
| No-range request (full file) | ✓ Returns `200` with `Accept-Ranges: bytes` |
| Invalid range | ✓ Returns `416 Range Not Satisfiable` |
| Dossier with no PDF — view endpoint | ✓ Returns `404` `{ ok: false, message: "ملف الدوسية غير متوفر" }` |
| Dossier not found — view/download | ✓ Returns `404` `{ ok: false, message: "الدوسية غير موجودة" }` |
| Storage object not found in GCS | ✓ Returns `404` from `ObjectNotFoundError` handler |

---

## Confirmation

All three production bugs are fixed:

1. ✅ **Cover image** — Storage objects endpoint now open-access; `<img>` has `onError` fallback
2. ✅ **PDF download** — Button wired up with fetch→blob→`<a download>` flow; shows loading and error states
3. ✅ **Study Room file error** — PDF.js now loads from `/api/dossiers/:id/view` which supports HTTP range requests

**Redeploy required** to apply these fixes to the production environment at `https://malsahori.com`.
