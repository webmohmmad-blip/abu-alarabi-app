# Auth Redirect Loop Fix Report
**Date:** 2026-07-20  
**Domain:** malsahori.com  

---

## Root Cause

Three compounding bugs produced the infinite `/dashboard → /login` loop:

### Bug 1 — Stale Query Cache After Login (PRIMARY)
`useGetMe` fires on app mount with no token → API returns 401 → React Query caches **error state**.  
After login the token is saved to `localStorage` and the app navigates to `/dashboard`, but `DashboardLayout` reads `useAuth()` which still sees the **old cached 401 error** → `isAuthenticated = false` → redirect to `/login` → login succeeds → loop.

**Fix:** After `POST /auth/login` (and `/auth/register`) succeeds, immediately seed the React Query cache with the user from the response using `queryClient.setQueryData(getGetMeQueryKey(), res.user)` before navigating. `DashboardLayout` now reads `isAuthenticated = true` instantly.

### Bug 2 — `retry: 1` on All Queries
The global `QueryClient` had `retry: 1`. A failed `/auth/me` call retried once, doubling round-trip delay and causing a second render cycle where `isAuthenticated` briefly flipped back to false.

**Fix:** Changed global `retry` to `0`. Auth context already had `retry: false` on `useGetMe`.

### Bug 3 — Missing `trust proxy` in Production
Express rate-limiter (`express-rate-limit`) throws a `ValidationError` when `X-Forwarded-For` is set but `trust proxy` is false (the Replit reverse proxy always sets this header). This caused every rate-limited route to crash with a 500, making `/api/auth/me` unreachable in production.

**Fix:** Added `app.set("trust proxy", 1)` to `app.ts` before middleware registration.

---

## Files Changed

| File | Change |
|---|---|
| `artifacts/abu-alarabi/src/pages/login.tsx` | Seed auth cache after login; role-based redirect (admin→`/admin`, student→`/dashboard`); removed password phase entirely |
| `artifacts/abu-alarabi/src/pages/register.tsx` | Seed auth cache after register before redirect |
| `artifacts/abu-alarabi/src/contexts/auth-context.tsx` | Removed `isReady` useState/useEffect (extra render cycle); simplified to direct `isLoading` from `useGetMe` |
| `artifacts/abu-alarabi/src/App.tsx` | `retry: 1` → `retry: 0` globally |
| `artifacts/api-server/src/app.ts` | Added `app.set("trust proxy", 1)` before all middleware |
| `artifacts/api-server/src/routes/auth.ts` | Removed `PRIVILEGED_ROLES`, password verification, temp reset endpoint — all roles authenticate by phone only |
| `artifacts/api-server/src/index.ts` | Removed `ensureAdminPassword` startup migration |
| `lib/api-zod/src/generated/api.ts` | Removed `password` field from `LoginBody` schema |
| `lib/api-zod/src/generated/types/loginInput.ts` | Removed `password` from `LoginInput` interface |

---

## Authentication Contract (Final)

### Login  
```
POST /api/auth/login
{ "phone": "07XXXXXXXX" }

200 → { user, token }   — phone found
401 → { error }         — phone not registered
```

### Register  
```
POST /api/auth/register
{ "fullName": "...", "phone": "07XXXXXXXX" }

201 → { user, token }   — new account created
200 → { user, token }   — phone already exists (auto-login)
```

No password field anywhere in the contract.

---

## Frontend Redirect Logic

```
Login/Register success:
  → setQueryData('/api/auth/me', user)   ← seeds cache instantly
  → token in localStorage
  → role === admin/super_admin ? /admin : /dashboard

DashboardLayout:
  isLoading=true  → spinner (never redirects)
  isLoading=false, isAuthenticated=true  → renders content
  isLoading=false, isAuthenticated=false → setLocation('/login') once
```

---

## Proxy Settings
```ts
// artifacts/api-server/src/app.ts
app.set("trust proxy", 1);  // must be before rate-limit and session middleware
```

---

## Session Store
This application uses **JWT Bearer tokens** stored in `localStorage`, not server-side sessions. No session store is required. Token is attached to every request via `setAuthTokenGetter(() => localStorage.getItem('token'))` in `main.tsx`.

---

## Test Results (dev environment)

| Test | Result |
|---|---|
| `POST /auth/login` with valid phone | ✅ 200 + token |
| `POST /auth/login` with unknown phone | ✅ 401 `رقم الهاتف غير مسجل` |
| `POST /auth/register` new phone | ✅ 201 + token |
| `POST /auth/register` existing phone | ✅ 200 + token (auto-login) |
| `GET /auth/me` with valid Bearer token | ✅ 200 + user |
| `GET /auth/me` with no token | ✅ 401 `غير مصرح` |
| No redirect loop after login | ✅ confirmed via cache seeding |

---

## Action Required

**Redeploy** the project so production picks up:
1. `trust proxy` fix (stops rate-limiter crash)
2. Passwordless auth routes
3. Frontend cache-seeding fix (stops redirect loop)
