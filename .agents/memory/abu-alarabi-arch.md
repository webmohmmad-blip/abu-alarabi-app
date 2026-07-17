---
name: Abu Al-Arabi Platform Architecture
description: Full-stack Tawjihi education platform — key decisions, patterns, and constraints worth preserving across sessions.
---

## Stack

- **Frontend:** React + Vite, Tajawal font, Royal Purple/Turquoise/Gold glassmorphism, RTL-only, artifact `abu-alarabi` at `/`
- **Backend:** Express 5 API, artifact `api-server`, JWT Bearer tokens stored in localStorage
- **DB:** PostgreSQL via Drizzle ORM, `@workspace/db` lib
- **Codegen:** Orval v8 reads `lib/api-spec/openapi.yaml` → generates hooks to `lib/api-client-react/src/generated/`

## Critical Constraints

- **No payments ever.** `isFree` was removed from all tables/routes. Access is RBAC-only.
- **RBAC roles:** `student | teacher | assistant_teacher | moderator | admin | super_admin`
- **User statuses:** `active | suspended | frozen | pending | deleted`

## Auth Pattern

JWT Bearer token in localStorage. Auth context: `AuthProvider` in `src/contexts/auth-context.tsx`, `useAuth` hook in `src/hooks/use-auth.ts` (kept separate to avoid Vite Fast Refresh warning about mixing component + hook exports).

**Why separate:** Vite Fast Refresh requires files to export only components OR only hooks/values — not both. Mixing causes an HMR invalidation warning on every save.

## DB Migration Pattern

`drizzle-kit push` requires TTY → use `node migrate.mjs` from `lib/db/` instead. After schema changes, also run `npx tsc -p tsconfig.json` inside `lib/db/` to regenerate `.d.ts` files so the API server can typecheck.

## API Client

`customFetch` is exported from `@workspace/api-client-react` (added to `lib/api-client-react/src/index.ts`). Admin pages use it directly with `useQuery`/`useMutation` since Orval doesn't generate admin-specific hooks.

## Admin Panel

All admin pages at `/admin/*` use `AdminLayout` which enforces `role === 'admin' | 'super_admin'`. Pages:
- `/admin` — dashboard stats + activity log
- `/admin/users` — user CRUD + status + password reset
- `/admin/groups` — group CRUD with colors
- `/admin/content` — subject/dossier tree
- `/admin/roles` — RBAC custom roles + permission toggles
- `/admin/settings` — platform settings
- `/admin/audit` — audit log viewer
- `/admin/reports` — comment reports moderation
- `/admin/announcements` — announcements CRUD

Admin link appears in student sidebar only for `admin`/`super_admin` roles (amber color to distinguish).

## Express Route Guards

`requireRole(roles: string[])` middleware factory in `artifacts/api-server/src/lib/auth.ts`. Returns 403 if user's role not in the list.

## TypeScript Gotcha — Express Early Returns

Express handlers with `return res.status(4xx).json(...)` cause TS7030 ("not all code paths return a value") when the function return type is `Promise<void>`. Pattern fix: `res.status(400).json(...); return;` instead.
