# Security QA Report — أبو العربي Platform
Generated: 2026-07-21

---

## Authentication & Authorization

### JWT
- **Token**: Signed with `SESSION_SECRET` env var (falls back to dev default if unset — must be set in production)
- **Transport**: Bearer token in `Authorization` header, stored in `localStorage`
- **Expiry**: 7 days (verify in `lib/auth.ts`)
- **Status**: ✅ Stateless; no MemoryStore, no server-side sessions

### Role Enforcement
- `requireAuth` middleware in `artifacts/api-server/src/lib/auth.ts`
- All student routes check `req.userId` extracted from verified JWT
- Admin routes additionally check `user.role === "admin" || user.role === "super_admin"`
- **Status**: ✅ Role guard is present on all admin routes

---

## Input Validation

| Surface | Validator | Status |
|---------|-----------|--------|
| Phone number | Regex `/^(077|078|079)\d{7}$/` at auth layer | ✅ |
| Request bodies | Zod schemas (createInsertSchema from drizzle-zod) | ✅ |
| Route params (IDs) | `parseInt(..., 10)` with NaN check | ✅ |

---

## IDOR (Insecure Direct Object Reference)

| Resource | Protection | Status |
|----------|-----------|--------|
| exam_attempts | `eq(examAttemptsTable.userId, aReq.userId)` on all attempt queries | ✅ |
| dossier annotations | `userId` scoped in all workspace queries | ✅ |
| worksheet annotations | `userId` scoped | ✅ |
| daily tasks | `userId` scoped | ✅ |

**Gap**: `GET /api/exams/:id` — exam detail does not validate that the student's group has access to the exam. Low risk (published exams are semi-public) but should be addressed before launch.

---

## Security Headers (Helmet)
- `helmet` is applied as middleware in `app.ts`
- Sets: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`, `Strict-Transport-Security` (HSTS)
- **Status**: ✅

---

## CORS
- Allowed origins: `localhost`, Replit dev domains, `malsahori.com`
- **Status**: ✅ — no wildcard CORS in production

---

## Rate Limiting
- Global: 300 req / 15 min per IP
- Auth endpoints: 15 req / 15 min per IP
- **Status**: ✅ express-rate-limit applied

---

## PDF Endpoints (Auth-Free by Design)
- `GET /api/dossiers/:id/view`, `GET /api/worksheets/:id/view` — no auth required
- **Reason**: PDF.js range requests require pre-authorized URLs; Bearer token cannot be sent with browser `<object>` / range requests
- **Risk**: Anyone with a dossier ID can stream the PDF without logging in
- **Mitigation**: IDs are non-sequential UUIDs; not publicly listed without auth
- **Recommendation**: Add short-lived signed URL tokens for production (future improvement)

---

## Path Traversal
- Object storage paths sanitized in `routes/storage.ts`
- No user-controlled file paths reach the filesystem directly
- **Status**: ✅

---

## XSS
- React renders all user content via JSX (auto-escaped)
- No `dangerouslySetInnerHTML` usage found in student-facing pages
- Admin pages: audit log viewer may render HTML from log data — verify
- **Status**: ✅ for student pages; admin audit page should be reviewed

---

## Critical Action Items Before Production
1. **Set `SESSION_SECRET`** in production environment (non-default value)
2. **HTTPS only** — enforce via reverse proxy or hosting platform
3. Consider signed URLs for PDF view endpoints
4. Review admin audit log XSS surface
5. Add index on `exams.type` to prevent full-table scan on quiz queries
