# Full API Inventory — أبو العربي Platform
Generated: 2026-07-21

All routes are mounted under `/api` prefix. JWT Bearer token auth via `requireAuth` middleware.

---

## Health
| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/health` | No | `{ok:true, service:"abu-alarabi-api", status:"healthy"}` |
| GET | `/api/healthz` | No | Same (legacy alias) |

---

## Authentication (`routes/auth.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register/login by phone `{fullName, phone}` → `{user, token}` |
| POST | `/api/auth/login` | No | Login by phone `{phone}` → `{user, token}` |
| POST | `/api/auth/logout` | Yes | Logout → `{success:true}` |
| GET | `/api/auth/me` | Yes | Current user profile |

*Phone validation: `/^(077|078|079)\d{7}$/` (Jordanian numbers only)*

---

## Users (`routes/users.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Yes | List users |
| PATCH | `/api/users/me` | Yes | Update own profile |

---

## Subjects (`routes/subjects.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/subjects` | Yes | List subjects |

---

## Dossiers (`routes/dossiers.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dossiers` | Yes | List dossiers |
| GET | `/api/dossiers/:id` | Yes | Dossier detail |
| GET | `/api/dossiers/:id/view` | No* | Stream PDF (206 range) |
| GET | `/api/dossiers/:id/download` | No* | Download PDF attachment |

*Auth-free by design: required for PDF.js range requests*

---

## Worksheets (`routes/worksheets.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/worksheets` | Yes | List worksheets |
| GET | `/api/worksheets/:id` | Yes | Worksheet detail |
| GET | `/api/worksheets/:id/view` | No* | Stream PDF (206 range) |
| GET | `/api/worksheets/:id/download` | No* | Download PDF attachment |

---

## Exams (`routes/exams.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/exams` | Yes | List published exams |
| GET | `/api/exams/:id` | Yes | Exam detail |
| POST | `/api/exams/:id/start` | Yes | Start exam → `{id: attemptId}` |
| GET | `/api/exams/attempts/:attemptId` | Yes | Fetch in-progress attempt |
| POST | `/api/exams/attempts/:attemptId/answer` | Yes | Save answer |
| POST | `/api/exams/attempts/:attemptId/submit` | Yes | Submit exam → result object |
| GET | `/api/exams/attempts/:attemptId/result` | Yes | Fetch stored result |
| GET | `/api/quiz/current` | Yes | Current published weekly quiz |

---

## Workspace/Study Room (`routes/workspace.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspace/dossier/:dossierId/annotations` | Yes | Get annotations |
| POST | `/api/workspace/dossier/:dossierId/annotations` | Yes | Save annotation |
| DELETE | `/api/workspace/dossier/:dossierId/annotations/:id` | Yes | Delete annotation |
| GET | `/api/workspace/dossier/:dossierId/bookmarks` | Yes | Get bookmarks |
| POST | `/api/workspace/dossier/:dossierId/bookmarks` | Yes | Add bookmark |
| DELETE | `/api/workspace/dossier/:dossierId/bookmarks/:id` | Yes | Remove bookmark |
| GET | `/api/workspace/dossier/:dossierId/progress` | Yes | Get reading progress |
| PATCH | `/api/workspace/dossier/:dossierId/progress` | Yes | Update progress |
| *(same endpoints with /worksheet/:worksheetId/...)* | | | Worksheet variants |

---

## Summaries (`routes/summaries.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/summaries` | Yes | List summaries |
| GET | `/api/summaries/:id` | Yes | Summary detail |

---

## Schedule (`routes/schedule.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/schedule/today` | Yes | Today's schedule + custom tasks |
| POST | `/api/schedule/daily-tasks` | Yes | Add custom task |
| PATCH | `/api/schedule/daily-tasks/:id/toggle` | Yes | Toggle task |
| DELETE | `/api/schedule/daily-tasks/:id` | Yes | Delete task |

---

## Dashboard (`routes/dashboard.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard/platform-stats` | Yes | Platform stats |
| GET | `/api/dashboard/activity` | Yes | Recent activity |

---

## Notifications (`routes/notifications.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Yes | List notifications |
| PATCH | `/api/notifications/:id/read` | Yes | Mark read |

---

## Comments (`routes/comments.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/comments` | Yes | List comments |
| POST | `/api/comments` | Yes | Add comment |
| DELETE | `/api/comments/:id` | Yes | Delete comment |

---

## Storage (`routes/storage.ts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/storage/upload` | Yes | Upload file → `{url}` |
| GET | `/api/storage/objects/*` | No* | Serve object from bucket |

---

## Admin (`routes/admin.ts`, `admin-questions.ts`, `admin-summaries.ts`)
All under `/api/admin/*`, require admin/super_admin role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | Platform statistics |
| GET/POST/PATCH/DELETE | `/api/admin/users/:id?` | User management |
| GET/POST/PATCH/DELETE | `/api/admin/groups/:id?` | Group management |
| GET/POST/PATCH/DELETE | `/api/admin/dossiers/:id?` | Dossier management |
| GET/POST/PATCH/DELETE | `/api/admin/worksheets/:id?` | Worksheet management |
| GET/POST/PATCH/DELETE | `/api/admin/exams/:id?` | Exam management |
| GET | `/api/admin/quiz` | List weekly quizzes |
| POST | `/api/admin/quiz` | Create weekly quiz |
| PATCH | `/api/admin/quiz/:id` | Update weekly quiz |
| DELETE | `/api/admin/quiz/:id` | Delete weekly quiz |
| GET/POST/PATCH/DELETE | `/api/admin/questions/:id?` | Question management |
| GET/POST/PATCH/DELETE | `/api/admin/summaries/:id?` | Summary management |
| GET/POST/PATCH/DELETE | `/api/admin/announcements/:id?` | Announcements |
| GET | `/api/admin/audit-logs` | Audit log |

---

## Removed APIs
- `/api/videos/*` — removed (no video system)
- `/api/flashcard-decks`, `/api/flashcards` — removed (not in platform scope)
