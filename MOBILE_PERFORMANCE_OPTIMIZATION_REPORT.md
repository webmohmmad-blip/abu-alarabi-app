# Mobile Performance Optimization Report
**Date:** 2026-07-21  
**Baseline Mobile PageSpeed:** 58 (FCP 6.0 s, LCP 6.4 s, Speed Index 13.9 s, CLS 0)  
**Desktop baseline:** 94

---

## Root Causes Identified

| # | Issue | Impact |
|---|-------|--------|
| 1 | `teacher-sahouri.jpg` — 5000 × 5000 px, **1.93 MB** — no compression, no WebP | Very High |
| 2 | Hero `<h1>` starts at `opacity: 0` via Framer Motion — LCP element hidden until JS executes | Very High |
| 3 | Google Fonts loaded **twice** (`@import` in `index.css` render-blocking + `<link>` in HTML) with **5 weights** | High |
| 4 | `useGetPlatformStats()` called in `home.tsx` but stats data **never rendered** — wasted auth API call | Medium |
| 5 | 3 separate API calls on homepage load (hero settings + ads + dossiers) — no `Cache-Control` on any | High |
| 6 | Ad images: no `fetchpriority`, no `loading`, no explicit dimensions (potential LCP element in hero) | High |
| 7 | `Login` and `Register` pages imported **eagerly** in App.tsx — add to initial JS bundle unnecessarily | Medium |
| 8 | Teacher and dossier images: no `loading="lazy"` or explicit dimensions — no CLS prevention | Medium |

---

## Changes Made

### 1. Image Compression — teacher-sahouri.jpg
**Before:** `teacher-sahouri.jpg` = 1.93 MB, 5000 × 5000 px  
**After:** Three output files:

| File | Size | Use |
|------|------|-----|
| `teacher-sahouri-380.webp` | **13 KB** | Mobile (≤ 640 px viewport) |
| `teacher-sahouri-760.webp` | **58 KB** | Desktop / tablet |
| `teacher-sahouri-760.jpg` | 80 KB | JPEG fallback |

**Command:** `magick teacher-sahouri.jpg -resize 760x -quality 82 teacher-sahouri-760.webp`

**Code change:** `home.tsx` teacher photo is now a `<picture>` element:
```html
<picture>
  <source type="image/webp"
          srcSet="/teacher-sahouri-380.webp 380w, /teacher-sahouri-760.webp 760w"
          sizes="(max-width: 640px) 380px, 760px" />
  <source type="image/jpeg" srcSet="/teacher-sahouri-760.jpg" />
  <img src="/teacher-sahouri-760.jpg" loading="lazy" decoding="async"
       width="760" height="950" ... />
</picture>
```

**Result:** Mobile downloads **13 KB** instead of 1.93 MB — **99 % reduction** on mobile.

---

### 2. Hero H1 LCP Fix (Critical)
**Before:**
```tsx
<motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
```
The heading was invisible until Framer Motion ran after React hydrated. On mobile this means LCP was gated on full JS parse + React mount + animation frame — 3–5 s delay.

**After:**
```tsx
<h1 className="text-5xl md:text-7xl font-black ... text-white">
```
Plain `<h1>` — rendered at full opacity on first paint. LCP for text is measured at paint time, not animation completion.

---

### 3. Google Fonts — Double Load Removed, Weights Reduced
**Before:**  
- `@import url(...)` in `index.css` — **render-blocking** CSS import  
- `<link rel="preload" as="style">` in `index.html` — non-blocking  
- Both loading `wght@300;400;500;700;900` = **5 font files**

**After:**  
- `@import` removed from `index.css` (was causing a render-blocking font CSS download)  
- `index.html` preload updated to `wght@400;700;900` = **3 font files** (300 and 500 are never used)
- Added `fetchpriority="high"` to the preload link

**Result:** Eliminates one render-blocking request; reduces font network calls from 5 to 3.

---

### 4. Combined Homepage API Endpoint
**Before:** 3 separate React Query calls on every homepage load:
- `GET /api/homepage-settings` (hero text)
- `GET /api/advertisements/active` (ad carousel)
- `GET /api/dossiers?limit=3` (featured dossiers)

**After:** Single call to `GET /api/public/homepage` returns all three in one JSON response.

```json
{
  "ok": true,
  "hero": { "titleLine1": "أتقن العربية.", ... },
  "ads": [{ "id": 1, "imageUrl": "...", ... }],
  "featuredDossiers": [{ "id": 1, "title": "...", "coverUrl": "...", ... }]
}
```

- Ads are seeded into React Query cache (`queryClient.setQueryData`) so `HeroAdvertisement` 
  resolves immediately without a second request.
- `Cache-Control: public, max-age=60, stale-while-revalidate=300` — subsequent visits within 
  60 s are served from browser cache (zero network latency).

---

### 5. Cache-Control on Public API Endpoints

| Endpoint | New Cache-Control |
|----------|-------------------|
| `GET /api/public/homepage` | `public, max-age=60, stale-while-revalidate=300` |
| `GET /api/advertisements/active` | `public, max-age=60, stale-while-revalidate=300` |
| `GET /api/homepage-settings` | `public, max-age=300, stale-while-revalidate=900` |

---

### 6. Ad Image Loading Attributes (LCP Hint)
**Before:** No `loading`, no `fetchpriority`, no explicit dimensions on ad images.

**After:**
```tsx
<img
  loading="eager"
  decoding="async"
  fetchPriority="high"
  width="800"
  height="450"
/>
```
The first ad image is a potential LCP element (it's in the hero above the fold). Marking it `fetchpriority="high"` tells the browser to start fetching it during the preload scan, before React renders.

---

### 7. Lazy Imports for Login / Register
**Before:** `Login` and `Register` imported eagerly — added to initial JS chunk parsed on every page.

**After:**
```tsx
const Login    = lazy(() => import('@/pages/login'));
const Register = lazy(() => import('@/pages/register'));
```
These pages are only loaded when the user navigates to `/login` or `/register`. Estimated JS bundle reduction: 15–30 KB (minified).

---

### 8. Lazy Loading for Below-Fold Images
- **Teacher photo:** `loading="lazy" decoding="async"` — below the fold on all screen sizes
- **Dossier cover images:** `loading="lazy" decoding="async" width="400" height="176"` — explicit dimensions prevent CLS
- **`<link rel="preload" as="image">` in `index.html`** for teacher WebP srcset so it loads early even though the tag is lazy

---

### 9. Removed Dead API Call
`useGetPlatformStats()` was called in `home.tsx` but the `stats` variable was never referenced in any JSX. Removed entirely — eliminates one network request that always returned 401 for guests.

---

## Expected Performance Impact

| Metric | Before | Expected After | Mechanism |
|--------|--------|----------------|-----------|
| LCP | 6.4 s | ~2.0–2.8 s | H1 opacity fix; hero image `fetchpriority`; combined API (fewer round-trips) |
| FCP | 6.0 s | ~1.5–2.5 s | Font @import removed (no render-block); JS bundle smaller |
| Speed Index | 13.9 s | ~4–8 s | WebP images (99 % smaller); 1 API call instead of 3; cache headers |
| Mobile Score | 58 | ~80–92 | Cumulative effect of all changes |
| Repeat-visit LCP | ~6 s | <1 s | Cache-Control headers across all public endpoints |
| Mobile data transferred | ~2.5 MB | ~200–400 KB | WebP images; lazy loading; fewer font weights |

> Note: Exact scores require a real Lighthouse run against the production domain (`malsahori.com`).
> Development Lighthouse scores undercount real-world improvements because the local server runs
> on the same machine (no network latency, fast CPU, no mobile throttling emulation).

---

## Files Changed

### API Server
- `artifacts/api-server/src/routes/public-homepage.ts` — **new** combined endpoint
- `artifacts/api-server/src/routes/index.ts` — register new router
- `artifacts/api-server/src/routes/advertisements.ts` — added `Cache-Control` header
- `artifacts/api-server/src/routes/homepage-settings.ts` — added `Cache-Control` header

### Frontend (abu-alarabi)
- `artifacts/abu-alarabi/src/index.css` — removed render-blocking `@import` for Google Fonts
- `artifacts/abu-alarabi/index.html` — reduced font weights (5→3), `fetchpriority` on font preload, teacher photo preload hints
- `artifacts/abu-alarabi/src/App.tsx` — `Login` and `Register` made lazy
- `artifacts/abu-alarabi/src/pages/home.tsx` — combined query, h1 LCP fix, WebP `<picture>`, lazy images, removed dead stats call
- `artifacts/abu-alarabi/src/components/HeroAdvertisement.tsx` — `fetchpriority="high"`, `loading="eager"`, explicit dimensions

### Static Assets
- `artifacts/abu-alarabi/public/teacher-sahouri-760.webp` — 58 KB (from 1.93 MB)
- `artifacts/abu-alarabi/public/teacher-sahouri-380.webp` — 13 KB (mobile)
- `artifacts/abu-alarabi/public/teacher-sahouri-760.jpg` — 80 KB (JPEG fallback)
