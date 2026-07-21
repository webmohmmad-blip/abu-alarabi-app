# Full Route Inventory — أبو العربي Platform
Generated: 2026-07-21

---

## Frontend Routes (wouter — artifacts/abu-alarabi/src/App.tsx)

### Public Routes
| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | Home | No |
| `/login` | Login | No (redirect to /dashboard if authed) |
| `/register` | Register | No (redirect to /dashboard if authed) |

### Student Routes
| Path | Component | Auth Required |
|------|-----------|---------------|
| `/dashboard` | Dashboard | Yes |
| `/dossiers` | Dossiers | Yes |
| `/dossiers/:id` | DossierDetail | Yes |
| `/worksheets` | Worksheets | Yes |
| `/worksheets/:id` | WorksheetDetail | Yes |
| `/study-room` | StudyRoom | Yes |
| `/summaries` | Summaries | Yes |
| `/notes` | Notes | Yes |
| `/statistics` | Statistics | Yes |
| `/study-plan` | StudyPlan | Yes |
| `/history` | SessionsHistory | Yes |
| `/schedule` | Schedule | Yes |
| `/profile` | Profile | Yes |
| `/settings` | Settings | Yes |

### Exam Route Chain (spec-compliant)
| Path | Component | Notes |
|------|-----------|-------|
| `/exams` | Exams | Exam list |
| `/exams/:examId/instructions` | ExamInstructions | Canonical instructions |
| `/exams/:examId/attempt/:attemptId` | ExamTake | Live exam |
| `/exams/:examId/result/:attemptId` | ExamResult | Results page (real data) |
| `/exams/:id` | ExamInstructions | Legacy alias (backward compat) |

### Weekly Quiz Route Chain (spec-compliant)
| Path | Component | Notes |
|------|-----------|-------|
| `/quiz` | Quiz | Alias |
| `/weekly-quiz` | Quiz | Weekly quiz landing |
| `/weekly-quiz/:quizId/instructions` | ExamInstructions | Quiz instructions |
| `/weekly-quiz/:quizId/attempt/:attemptId` | ExamTake | Live quiz |
| `/weekly-quiz/:quizId/result/:attemptId` | ExamResult | Quiz result |

### Admin Routes
| Path | Component | Auth Required |
|------|-----------|---------------|
| `/admin` | AdminDashboard | admin/super_admin |
| `/admin/users` | AdminUsers | admin/super_admin |
| `/admin/groups` | AdminGroups | admin/super_admin |
| `/admin/content` | AdminContent | admin/super_admin |
| `/admin/exams` | AdminExams | admin/super_admin |
| `/admin/summaries` | AdminSummaries | admin/super_admin |
| `/admin/roles` | AdminRoles | admin/super_admin |
| `/admin/settings` | AdminSettings | admin/super_admin |
| `/admin/audit` | AdminAudit | admin/super_admin |
| `/admin/reports` | AdminReports | admin/super_admin |
| `/admin/announcements` | AdminAnnouncements | admin/super_admin |
| `/admin/worksheets` | AdminWorksheets | admin/super_admin |
| `/admin/quiz` | AdminQuiz | admin/super_admin |

### Removed Routes (not accessible)
- `/onboarding` — removed; app sets `onboardingCompleted=true` on register
- `/videos` — removed; no video system in platform
- `/exams/results/:id` — removed (was shadowed and broken); replaced by `/exams/:examId/result/:attemptId`
- `/exams/:id/take` — removed; replaced by `/exams/:examId/attempt/:attemptId`

---

## Student Navigation (header.tsx — 6 items, spec-compliant)

| Label | Path | Status |
|-------|------|--------|
| لوحتي | /dashboard | ✅ |
| الدوسيات | /dossiers | ✅ |
| أوراق العمل | /worksheets | ✅ |
| الامتحانات الإلكترونية | /exams | ✅ |
| الكويز الأسبوعي | /weekly-quiz | ✅ |
| غرفتي الدراسية | /study-room | ✅ |

*Note: جدولي الدراسي removed from nav (not in approved spec list).*
