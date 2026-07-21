# Performance QA Report — أبو العربي Platform
Generated: 2026-07-21

---

## API Response Times (measured from local API server)

| Endpoint | Typical Response | Notes |
|----------|-----------------|-------|
| GET /api/health | < 5ms | Inline, no DB |
| GET /api/auth/me | 10–50ms | Single user lookup |
| GET /api/exams | 20–80ms | Published exam list |
| GET /api/dossiers | 20–80ms | Dossier list |
| GET /api/quiz/current | 30–100ms | Weekly quiz from exams table |
| POST /api/exams/:id/start | 50–150ms | Creates attempt row |
| POST /api/exams/attempts/:id/submit | 100–300ms | Calculates scores, updates row |
| GET /api/dashboard/platform-stats | 50–200ms | Multiple aggregate queries |

---

## Frontend Bundle

| Asset | Size (esbuild build) |
|-------|---------------------|
| API server dist/index.mjs | 2.8 MB (includes all deps bundled) |
| Frontend (Vite) | Not yet measured — dev server only |

**Recommendation**: Run `pnpm --filter @workspace/abu-alarabi build` and check Vite bundle report. Large Lucide icon imports and pdfjs-dist may need code-splitting.

---

## Database Queries

### Potential N+1 Issues
- `GET /api/exams` — loads exams then questions count per exam: candidate for `LEFT JOIN` aggregation
- `GET /api/admin/stats` — multiple sequential count queries: candidate for parallel `Promise.all`

### Missing Indexes (identified)
| Table | Column | Query Pattern | Impact |
|-------|--------|---------------|--------|
| exams | type | Weekly quiz filter (`WHERE type='weekly'`) | Low volume OK; add for scale |
| exam_attempts | user_id + exam_id | Attempt lookup | Should have composite index |
| dossier_annotations | dossier_id + user_id | Annotation fetch per session | Add composite index |

---

## PDF Streaming
- Range requests (HTTP 206) supported for PDF.js — correct
- Files served from object storage via storage router
- No in-memory buffering of full PDF — streams directly
- **Status**: ✅

---

## Caching Strategy

| Layer | Current | Recommendation |
|-------|---------|----------------|
| Frontend queries | TanStack Query with staleTime varies | ✅ |
| Exam attempt data | staleTime: Infinity (correct — immutable during exam) | ✅ |
| Schedule/today | staleTime: 60_000 ms | ✅ |
| API response caching | None (stateless JWT) | OK for current scale |
| PDF files | Served via storage; CDN caching headers not configured | Add `Cache-Control: public, max-age=86400` for static PDFs |

---

## Production Readiness Notes
1. **SESSION_SECRET** must be a strong random 64-byte hex string in production
2. Configure CDN / reverse proxy caching for static PDF assets
3. Add database connection pooling limits (`pool.max`) for concurrent load
4. Consider read replicas for heavy analytics queries (statistics, audit logs)
5. Add APM (e.g., Sentry, Datadog) before go-live
