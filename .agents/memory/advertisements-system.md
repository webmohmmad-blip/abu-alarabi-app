---
name: Homepage Advertisements System
description: Full-stack ad management — table, API, admin page, homepage carousel, button fixes.
---

## DB Table
`homepage_ads` — created via raw SQL (not drizzle push — TTY prompt blocks it in non-interactive shell).  
Schema source: `lib/db/src/schema/admin.ts` → `homepageAdsTable`.  
Storage key stored as `/objects/uploads/<uuid>`; served as `/api/storage` + objectPath.

## Auth Middleware
No `requireAdmin` export exists. Use `requireRole(["admin", "super_admin"])` from `lib/auth`.

## API Router
`artifacts/api-server/src/routes/advertisements.ts` — mounted via `router.use(advertisementsRouter)` in `routes/index.ts`.  
Public: `GET /api/advertisements/active` (no auth).  
Admin: full CRUD under `/api/admin/advertisements`.

## Frontend
- `src/components/HeroAdvertisement.tsx` — carousel INSIDE the Hero section (second flex child, visual left on desktop, below buttons on mobile). Returns null when no active ads — no reserved space.
- `src/components/AdCarousel.tsx` — deprecated shim; re-exports HeroAdvertisement.
- `src/pages/admin/advertisements.tsx` — lazy-loaded at `/admin/advertisements`.
- Nav item: "لافتات الصفحة" with `Wallpaper` icon in `admin-layout.tsx`.
- Hero in `home.tsx` uses `flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16` — text is `flex-1 min-w-0`, ad is `w-full lg:w-[42%] shrink-0 min-w-0`.

## Button Fixes
`ghost` variant now has explicit `text-foreground` to prevent invisible text on light surfaces.  
New variants: `white` (bg-white, text-primary) and `accent` (gold CTA).  
`outline` now fills solid color on hover for real contrast.

**Why:** Ghost without explicit text color inherits from parent — invisible on white backgrounds.
