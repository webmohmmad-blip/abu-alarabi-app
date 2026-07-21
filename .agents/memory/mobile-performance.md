---
name: Mobile Performance Optimization
description: Root causes of Mobile PageSpeed 58, fixes applied 2026-07-21, and what to watch for on future UI changes.
---

## Baseline
- Mobile PageSpeed 58: FCP 6.0s, LCP 6.4s, Speed Index 13.9s
- Desktop 94

## Root Causes & Fixes Applied

### LCP (biggest impact)
- **Hero h1 was opacity:0 via Framer Motion** → changed to plain `<h1>` (no opacity animation). NEVER add `initial={{ opacity: 0 }}` to the LCP element.
- **teacher-sahouri.jpg was 1.93 MB, 5000x5000px** → compressed to WebP (760px=58KB, 380px=13KB). `<picture>` element with srcset in home.tsx. Original `.jpg` preserved but should not be used.

### Font loading
- Google Fonts was loaded TWICE: `@import` in `index.css` (render-blocking) AND `<link preload>` in `index.html`.
- Fix: removed `@import` from `index.css`, kept only the non-blocking preload in HTML.
- Reduced from 5 weights (300,400,500,700,900) to 3 (400,700,900).

### API waterfall
- Homepage made 3 separate API calls (hero settings, ads, dossiers).
- Fixed: `GET /api/public/homepage` combined endpoint returns all 3 in one call.
- Cache-Control: `public, max-age=60, stale-while-revalidate=300` on combined endpoint.
- Ads seeded into React Query cache so HeroAdvertisement resolves from cache, not network.

### Bundle size
- Login and Register pages made lazy in App.tsx (were eagerly imported).
- Removed dead `useGetPlatformStats()` call from home.tsx (stats never rendered).

### Image attributes
- Ad images: `fetchPriority="high"`, `loading="eager"`, explicit width/height.
- Teacher photo: `loading="lazy"`, `decoding="async"`, explicit `width="760" height="950"`.
- Dossier cover images: `loading="lazy"`, `decoding="async"`, explicit dimensions.

## Rules for Future Work
- Never add `initial={{ opacity: 0 }}` to any element that could be the LCP (hero heading, above-fold images).
- New public API endpoints should include `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- New images uploaded by admin go through object storage; they are not compressed server-side. Large uploads will still be slow until server-side resizing (sharp) is added.
- The combined `/api/public/homepage` endpoint is the source of truth for homepage data. If new homepage sections are added, extend this endpoint instead of adding new React Query calls in home.tsx.

## LCP Bootstrap Pattern (key technique)
index.html `<head>` contains an inline `<script>` that fires `fetch('/api/public/homepage')` before React loads. On response: sets `window.__HOMEPAGE__` and dynamically injects `<link rel="preload" as="image" fetchpriority="high">` for the first ad image. React's queries use `initialData: window.__HOMEPAGE__` so they return immediately on first render with zero re-fetch.

Pre-rendered hero HTML is in `<div id="root">` (inline CSS, matches real hero design) — gives FCP < 0.3s instead of 5.6s.

## Self-hosted Tajawal fonts
WOFF2 files live in `src/assets/` (NOT `public/`) so Vite hashes them → `assets/tajawal-900.[hash].woff2` → immutable cache headers. `@font-face` in index.css uses relative paths `./assets/`. No `<link rel="preload">` needed — `font-display:swap` prevents FOIT.

## CSS deferral (Vite plugin)
`deferNonCriticalCss()` in vite.config.ts (`apply:'build'`, `enforce:'post'`) rewrites the built HTML to add `media="print" onload="this.media='all'"` to the Tailwind CSS bundle link. Eliminates ~1060ms render-blocking. Safe because the pre-rendered hero uses inline styles. Dev mode unaffected.

## framer-motion removed from initial bundle
home.tsx and HeroAdvertisement.tsx no longer import framer-motion. Replaced with: plain HTML for hero animations (they show immediately — good for LCP); `[data-fade]` CSS class + IntersectionObserver for below-fold scroll animations; `window.matchMedia('(prefers-reduced-motion: reduce)')` for the hook. Saves ~140–160 KB gzip from the initial bundle. Other lazy pages still use framer-motion normally via their own chunks.

**Why:** Mobile users on slow connections were downloading 2+ MB on first paint. Every extra network round-trip adds 300–1000ms on mobile. The h1 opacity animation was the single biggest LCP killer. The LCP image was undiscoverable until HTML → JS → React → API — a 6+ second chain. The bootstrap script collapses that chain to HTML → API (parallel with JS) → image cached before React mounts.
