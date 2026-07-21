# Production Launch Checklist — أبو العربي Platform
Generated: 2026-07-21

---

## Phase 1: Environment Configuration

- [ ] **Set SESSION_SECRET** to a strong 64-byte random hex string in Replit Secrets (production environment)
  - Generate: `openssl rand -hex 64`
  - Must NOT be the dev fallback value
- [ ] **Confirm DATABASE_URL** points to production PostgreSQL instance
- [ ] **Confirm DEFAULT_OBJECT_STORAGE_BUCKET_ID** is the production bucket
- [ ] **Confirm PRIVATE_OBJECT_DIR** and **PUBLIC_OBJECT_SEARCH_PATHS** are set correctly
- [ ] Verify NODE_ENV=production is set in the production workflow

---

## Phase 2: Domain & SSL

- [ ] Point `malsahori.com` DNS A record to Replit deployment IP
- [ ] Confirm SSL certificate is active and auto-renewing (Replit managed or Let's Encrypt)
- [ ] Test HTTPS redirect (HTTP → HTTPS)
- [ ] Confirm CORS allowed origins include `https://malsahori.com` (currently in config)
- [ ] Set `Strict-Transport-Security` header (Helmet does this — confirm HTTPS is in use first)

---

## Phase 3: Database Migration

- [ ] Run `pnpm --filter @workspace/db run migrate` against production database
- [ ] Verify all tables exist in production (run `\dt` via psql)
- [ ] Confirm enum types match schema (examTypeEnum, contentStatusEnum, etc.)
- [ ] Seed initial data if needed:
  - [ ] Create super_admin user account (Task #2 in project backlog)
  - [ ] Create initial subjects/categories
  - [ ] Create initial system_settings row

---

## Phase 4: Pre-Launch Smoke Tests

Run against production URL `https://malsahori.com`:

- [ ] `GET https://malsahori.com/api/health` returns `{"ok":true,"service":"abu-alarabi-api","status":"healthy"}`
- [ ] Home page loads (`/`)
- [ ] Register with a Jordanian phone number → token returned → redirect to /dashboard
- [ ] Login with same phone → works
- [ ] Dashboard loads student stats
- [ ] Dossiers list loads (if any published dossiers exist)
- [ ] Exam list loads (if any published exams exist)
- [ ] Weekly quiz loads if one is scheduled
- [ ] Admin panel accessible at `/admin` with super_admin account
- [ ] Upload a test PDF via admin content panel
- [ ] Publish the dossier → appears in student dossiers list
- [ ] Open dossier in Study Room → PDF renders via PDF.js

---

## Phase 5: Performance & Monitoring

- [ ] Set up error monitoring (Sentry or similar) — capture API errors and frontend crashes
- [ ] Set up uptime monitoring (e.g., UptimeRobot on `/api/health`)
- [ ] Confirm database connection pool settings (`pool.max` appropriate for expected load)
- [ ] Load test auth endpoint with expected concurrent user count
- [ ] Confirm PDF streaming works under load (no memory spikes)

---

## Phase 6: Final Review

- [ ] Remove any dev-only console.log statements from API routes
- [ ] Confirm all admin routes return 403 (not 401) for students trying to access admin panel
- [ ] Confirm logout works and token is cleared from localStorage
- [ ] Test on Safari (iOS/macOS) — Arabic font rendering
- [ ] Test on Chrome Mobile — confirm 768px breakpoint nav is usable
- [ ] Confirm announcements system works (create announcement in admin → visible to students)

---

## Phase 7: Launch

- [ ] Announce soft launch to first cohort of students
- [ ] Monitor logs for first 30 minutes post-launch
- [ ] Confirm at least one student can complete the exam flow end-to-end
- [ ] Confirm at least one admin can publish content

---

## Post-Launch Backlog
1. **Task #3**: Mobile app (Expo) — resolves mobile navigation gap
2. **Task #2**: Super admin account creation workflow
3. **Task #4**: Database migration workflow for schema changes
4. Add signed URL auth for PDF view endpoints
5. Remove unused DB tables: `weekly_quizzes`, update `onboardingCompleted` default handling
6. Add missing database indexes (see DATABASE_INTEGRITY_AUDIT.md)
