# منصة أبو العربي

منصة تعليمية احترافية متخصصة 100% في اللغة العربية، مبنية حول العلامة التجارية **أبو العربي** بقيادة الأستاذ محمد الساحوري، موجّهة لطلاب الثانوية العامة (التوجيهي) في الأردن.

---

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm --filter @workspace/abu-alarabi run dev` — Frontend (port assigned by Replit)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from OpenAPI spec (run from `lib/api-spec/` via `npx orval`)
- `node migrate.mjs` from `lib/db/` — apply DB migrations (use this, NOT `drizzle-kit push` which requires TTY)
- `npx tsc -p tsconfig.json` from `lib/db/` — rebuild `.d.ts` after schema changes
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React + Vite, Tajawal font, RTL-only, Framer Motion, Wouter router
- **API:** Express 5, JWT Bearer tokens in localStorage
- **DB:** PostgreSQL + Drizzle ORM (`@workspace/db` lib)
- **Validation:** Zod v4, drizzle-zod
- **API codegen:** Orval v8 (OpenAPI → React Query hooks + Zod schemas)
- **Build:** esbuild

## Where Things Live

- `artifacts/abu-alarabi/` — React frontend
- `artifacts/api-server/` — Express API
- `lib/db/src/schema/` — Drizzle schema (source of truth for DB)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — auto-generated hooks (do NOT edit)
- `lib/api-client-react/src/custom-fetch.ts` — custom fetch wrapper with JWT injection

## Architecture Decisions

- **JWT in localStorage** — not sessions; `customFetch` injects `Authorization: Bearer <token>` on every request
- **`requireRole(roles[])`** middleware in `api-server/src/lib/auth.ts` for RBAC route guards
- **No payments ever** — `isFree` removed from all tables; access is 100% admin-controlled RBAC
- **`useAuth` hook** lives in `src/hooks/use-auth.ts` (separate from `AuthProvider` in `src/contexts/auth-context.tsx`) to avoid Vite Fast Refresh warning
- **`customFetch` exported** from `@workspace/api-client-react` for admin pages that don't have Orval-generated hooks
- **Admin pages** use `AdminLayout` component which enforces `role === admin | super_admin`; redirects to `/login` otherwise
- **DB migrations** — use `node migrate.mjs` (not drizzle-kit push). After schema changes always run `npx tsc -p tsconfig.json` in `lib/db/`

## Product Vision

> أي قرار برمجي أو تصميمي يجب أن يجيب عن السؤال: "هل هذا يجعل الطالب يدرس براحة أكبر؟"

**هوية المنصة:** منصة تعليمية متخصصة في اللغة العربية فقط — ليست LMS تقليدية، وليست منصة متعددة المواد، وليست Marketplace.

**المسارات الأكاديمية (مُدارة من الأدمن، لا تُكتب في الكود):**
- توجيهي (الصف الثاني عشر)، أول ثانوي، التاسع، الثامن، تأسيس، مراجعة نهائية، دورة الإعراب، دورة البلاغة، إلخ.

**المحتوى الرسمي:** اللغة العربية فقط — دروس، فيديوهات، دوسيات، اختبارات، ملخصات.

**المواد الشخصية للطالب (للتنظيم فقط):**
- الطالب يستطيع إنشاء مادة شخصية (رياضيات، فيزياء، إلخ)
- لا تحتوي على محتوى رسمي من المنصة
- تستخدم فقط لـ: رفع PDFs الشخصية، كتابة الملاحظات، المؤقت، خطة الدراسة
- خاصة بالطالب — لا تظهر لأحد آخر

## Design System

| العنصر | القيمة |
|--------|--------|
| اللون الأساسي | `#5A2D82` (بنفسجي ملكي) |
| اللون الثانوي | `#0D9BB5` (فيروزي) |
| اللون المميز | `#C79A2D` (ذهبي) |
| اللون المساعد | `#2FA84F` (أخضر) |
| الخلفية | `#FAFAF8` (أبيض دافئ) |
| الخط | Tajawal (Google Fonts) |
| الاتجاه | RTL دائماً |

**فلسفة التصميم:** Minimal · Premium · Modern · Elegant · Clean · Academic
مستوى مرجعي: Apple · Notion · Linear · Stripe Dashboard

## User Preferences

- **لا دفع أبداً** — المنصة مجانية للطلاب، الوصول يُدار بواسطة الأدمن فقط
- **اللغة:** عربية 100% في كل الواجهات
- **RTL:** كل شيء يبدأ من اليمين دون استثناء
- **لا تقليد:** لا قوالب جاهزة، كل شاشة مصممة خصيصاً لأبو العربي
- المنافس الحقيقي هو أفضل منتج تعليمي في العالم، وليس المنصات المحلية

## Gotchas

- بعد أي تغيير في schema: شغّل `node migrate.mjs` ثم `npx tsc -p tsconfig.json` داخل `lib/db/`
- بعد تغيير `openapi.yaml`: شغّل `npx orval` داخل `lib/api-spec/`
- لا تُعدّل ملفات `lib/api-client-react/src/generated/` يدوياً — تُولَّد تلقائياً
- `customFetch` مُصدَّرة من `@workspace/api-client-react` (أُضيفت يدوياً لأن Orval لا يُصدّرها افتراضياً)
- Fast Refresh: لا تجمع component + hook في ملف واحد

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Admin API routes in `artifacts/api-server/src/routes/admin.ts`
- RBAC roles: `student | teacher | assistant_teacher | moderator | admin | super_admin`
- User statuses: `active | suspended | frozen | pending | deleted`
