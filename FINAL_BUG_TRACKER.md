# Final Bug Tracker — أبو العربي Platform
Generated: 2026-07-21

---

## FIXED in This Session

| # | Severity | Bug | Fix Applied |
|---|----------|-----|-------------|
| 1 | CRITICAL | `/api/healthz` returned wrong format; spec requires `/api/health` with `{ok,service,status}` | Added `/api/health` endpoint + updated healthz to same format |
| 2 | CRITICAL | `/exams/results/:id` shadowed by `/exams/:id` in wouter Switch — ExamResult was unreachable | Removed broken route; replaced with `/exams/:examId/result/:attemptId` |
| 3 | CRITICAL | ExamResult page used 100% hardcoded mock data — no real exam result was shown | Added `GET /api/exams/attempts/:attemptId/result` endpoint; rewrote ExamResult to fetch real data |
| 4 | HIGH | ExamTake read `attemptId` from query string `?attemptId=xxx`; new route chain uses route params | Changed to `useParams()` reading `:attemptId` route param |
| 5 | HIGH | After submit, ExamTake navigated to `/exams/results/${attempt.id}` (broken route) | Fixed to `/exams/${attempt.examId}/result/${attempt.id}` |
| 6 | HIGH | ExamInstructions only handled `/exams/:id` — weekly quiz route `/weekly-quiz/:quizId` was broken | Added dual param support (`id || quizId`); navigation respects `isWeeklyQuiz` flag |
| 7 | HIGH | Student nav "الامتحانات" — spec requires "الامتحانات الإلكترونية" | Updated STUDENT_NAV label |
| 8 | HIGH | Student nav had 7th item "جدولي الدراسي" — spec mandates exactly 6 items | Removed from STUDENT_NAV |
| 9 | HIGH | `/onboarding` route existed — spec says no onboarding system | Removed route and import from App.tsx |
| 10 | HIGH | `/videos` route existed — spec says no video system | Removed route and import from App.tsx |
| 11 | MEDIUM | Videos API router (`/api/videos/*`) still mounted | Removed from routes/index.ts |
| 12 | MEDIUM | Flashcards API router (`/api/flashcard-decks`, `/api/flashcards`) still mounted | Removed from routes/index.ts |
| 13 | MEDIUM | `/exams/:id/take` route + `?attemptId=` pattern — replaced by spec route chain | Replaced with `/exams/:examId/attempt/:attemptId` |
| 14 | MEDIUM | Weekly quiz start button navigated to `/exams/${id}` instead of weekly quiz chain | Fixed to `/weekly-quiz/${id}/instructions` |
| 15 | MEDIUM | Exams list link used `/exams/${exam.id}` (legacy) | Updated to `/exams/${exam.id}/instructions` |

---

## REMAINING — Non-Critical

| # | Severity | Issue | Recommendation |
|---|----------|-------|----------------|
| R1 | HIGH | No mobile hamburger/bottom nav below 768px | Implement mobile nav before launch; Task #3 (mobile app) addresses this |
| R2 | MEDIUM | `GET /api/exams/:id` does not check if student's group has access | Add group-access filter for multi-group deployments |
| R3 | MEDIUM | Multiple exam attempts per user not prevented at DB level | Add unique constraint or soft-prevent at API level |
| R4 | LOW | PDF view endpoints are auth-free (by design) | Document this decision; consider signed URLs for production |
| R5 | LOW | ExamResult has no "performance by skill" breakdown | Would require per-question skill tagging in schema |
| R6 | LOW | `onboardingCompleted` column exists in users but is always `true` | Dead column — remove in future migration |
| R7 | LOW | `weekly_quizzes` table is unused | Remove in future migration after confirming zero rows |
| R8 | LOW | No index on `exams.type` | Add `CREATE INDEX idx_exams_type ON exams(type)` |
| R9 | LOW | Admin quiz PATCH uses `/api/admin/exams/:id` (not quiz-scoped) | Works correctly but consider adding quiz-specific guard |
| R10 | LOW | Accent gold color may fail WCAG AA contrast on purple backgrounds | Run WCAG audit; adjust shade if needed |

---

## Severity Key
- **CRITICAL**: Breaks core functionality, data loss, security risk
- **HIGH**: Blocks a primary user workflow
- **MEDIUM**: Degraded UX or secondary workflow broken
- **LOW**: Cosmetic, edge case, or future improvement
