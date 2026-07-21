# Mobile Render-Blocking Final Report
**Domain:** https://malsahori.com  
**Date:** 2026-07-21  
**Baseline (entering this pass):** Speed Index ~5.2s · TBT ~80ms · CLS 0 · Render-blocking ~1060ms · Unused JS ~218KB · Cache savings ~733KB

---

## 1 — Render-Blocking Resources (Before vs After)

### Before this pass
| File | Type | Source | Est. delay |
|------|------|---------|-----------|
| `assets/index.[hash].css` (Tailwind bundle) | CSS | Same origin | **~900–1100ms** |
| Google Fonts CSS + WOFF2 | CSS + Font | External CDN | **~0ms** *(fixed prior session)* |
| `fonts/tajawal-900.woff2` preload | Font | Same origin | Non-blocking (preload hint only) |
| **Total blocking** | | | **~1060ms** |

### After this pass
| File | Type | Treatment | Est. delay |
|------|------|-----------|-----------|
| `assets/index.[hash].css` (Tailwind bundle) | CSS | **Deferred** via `media="print"` trick in Vite plugin | **~0ms** |
| `assets/tajawal-400/700/900.[hash].woff2` | Font | @font-face `font-display:swap` — never blocks | **0ms** |
| **Total blocking** | | | **< 50ms** |

**How:** A `deferNonCriticalCss` Vite plugin (production-only, `apply:'build'`) transforms the built HTML at `transformIndexHtml`:

```html
<!-- Before (render-blocking) -->
<link rel="stylesheet" crossorigin href="/assets/index.abc123.css">

<!-- After (non-blocking) -->
<link rel="stylesheet" crossorigin href="/assets/index.abc123.css"
      media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" crossorigin href="/assets/index.abc123.css"></noscript>
```

The pre-rendered hero in `<div id="root">` uses inline styles — the page looks correct during the window before Tailwind switches from `print` → `all`. By the time React mounts (2–3s later), Tailwind is already loaded.

---

## 2 — CSS Split: Before vs After

### Before
- Single Tailwind bundle contains ALL classes from ALL pages (admin, study room, PDF viewer, exam editor, etc.)
- No critical CSS inline — browser blocked for ~1060ms before first paint
- Google Fonts render-blocking CSS (fixed prior session)

### After
- Tailwind bundle unchanged in size BUT **deferred** — no longer render-blocking
- **Critical CSS is inline** in `index.html` (pre-rendered hero `<div id="root">`) with inline styles matching the hero design:
  - Dark background `#0d0618`
  - Tajawal font (via `font-family: Tajawal, system-ui, sans-serif`)
  - h1 gold gradient (`linear-gradient(135deg, #C79A2D, #e8c060, #C79A2D)`)
  - RTL layout, flex centering
- FCP from pre-rendered hero: **< 0.3s** (prev: 5.6s)

---

## 3 — JavaScript: Before vs After

### Unused JavaScript (218 KB → target < 75 KB)

**Root cause identified:** `framer-motion` (est. ~140–160 KB gzip) was imported **eagerly** in:
- `src/pages/home.tsx` — `import { motion } from "framer-motion"` 
- `src/components/HeroAdvertisement.tsx` — `import { useReducedMotion } from "framer-motion"`

`home.tsx` is an eager import in `App.tsx` (homepage must load immediately). This pulled ALL of framer-motion into the initial JS bundle for every page visit.

### What was replaced

| Usage | Was | Now |
|-------|-----|-----|
| Hero badge, description, CTAs | `<motion.div animate={{ opacity: 1, y: 0 }}>` | Plain `<div>` — visible immediately (no animation blocks LCP) |
| Teacher section (2 elements) | `<motion.div whileInView>` | `<div data-fade>` — CSS IntersectionObserver animation |
| Feature cards (4 elements) | `<motion.div whileInView>` | `<div data-fade>` — CSS IntersectionObserver animation |
| Dossier cards (3–6 elements) | `<motion.div whileInView>` | `<div data-fade>` — CSS IntersectionObserver animation |
| CTA section | `<motion.div whileInView>` | `<div data-fade>` — CSS IntersectionObserver animation |
| `useReducedMotion()` | Framer hook | `window.matchMedia('(prefers-reduced-motion: reduce)').matches` |

### CSS replacement for framer-motion `whileInView`
Added to `index.css` (only applies when user has not requested reduced motion):
```css
@media (prefers-reduced-motion: no-preference) {
  [data-fade] {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.55s ease, transform 0.55s ease;
  }
  [data-fade].in-view {
    opacity: 1;
    transform: none;
  }
}
```

Added `IntersectionObserver` in `home.tsx` `useEffect`:
```tsx
const observer = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in-view"); observer.unobserve(e.target); }
  }),
  { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll("[data-fade]").forEach(el => observer.observe(el));
```

### Remaining framer-motion usage
All other pages that use framer-motion (DossierDetail, WorksheetDetail, etc.) are **lazy-loaded** — framer-motion is NOT in the initial bundle. Rollup creates a shared chunk for it that only downloads when those pages are visited.

### Initial JS bundle estimate
| Component | Before | After |
|-----------|--------|-------|
| framer-motion in initial bundle | ~140–160 KB gzip | **0 KB** (lazy pages only) |
| Home page motion animations | framer-motion | Pure CSS (0 KB JS) |
| Unused JS (Lighthouse) | ~218 KB | **< 60 KB estimated** |

---

## 4 — Fonts: Before vs After

### Before
| State | Details |
|-------|---------|
| Source | Google Fonts CDN |
| Delivery | External `<link rel="preload" as="style">` → external CSS → external WOFF2 |
| DNS lookups | 2 (fonts.googleapis.com + fonts.gstatic.com) |
| TCP connections | 2 |
| Files downloaded | 1 CSS + 3 WOFF2 (400, 700, 900) |
| Render impact | Render-blocking CSS + font-swap |
| Cache | CDN cache (browser does not control headers) |

### After
| State | Details |
|-------|---------|
| Source | Self-hosted in `src/assets/tajawal-{400,700,900}.woff2` |
| Delivery | Processed by Vite → hashed filenames → `assets/tajawal-400.abc123.woff2` |
| DNS lookups | 0 |
| TCP connections | 0 extra |
| Files downloaded | 3 WOFF2 from same origin (~8.5–8.9 KB each, 26 KB total) |
| Cache headers | `Cache-Control: public, max-age=31536000, immutable` (Vite hashed assets) |
| @font-face | `font-display: swap` — system-ui shows instantly, Tajawal swaps in |
| Preload | Removed — `font-display:swap` prevents FOIT without blocking preload |

**Savings:** Eliminates 2 DNS lookups + 2 TCP handshakes + 1 render-blocking CSS file + CDN latency per visit. Estimated: **~500–1000ms saved** on first visit to site.

---

## 5 — Cache Strategy: Before vs After

### Problem (733 KB savings flagged by Lighthouse)
Non-versioned static files (fonts, images) served from `public/` without content hashes → short or no cache headers.

### Fix
Font files moved from `public/fonts/` to `src/assets/` — Vite processes them and emits as `assets/tajawal-900.[hash].woff2`. These get the platform's default long-cache headers for hashed assets.

### Remaining cache concerns
- Teacher photo images (`/teacher-sahouri-*.avif`) are in `public/` without hashes → cannot get `immutable` cache headers without URL versioning. Acceptable trade-off (rarely change, < 30 KB).
- API responses: `Cache-Control: public, max-age=60, stale-while-revalidate=300` (set prior session).

---

## 6 — Largest Initial Bundles (Estimated)

After removing framer-motion from the initial bundle:

| Chunk | Est. size (gzip) | Notes |
|-------|-----------------|-------|
| React + React DOM | ~45 KB | Core framework |
| @tanstack/react-query | ~15 KB | Always needed |
| wouter | ~3 KB | Router |
| lucide-react (tree-shaken) | ~10 KB | Only icons used |
| home.tsx + deps | ~8 KB | Landing page |
| Tailwind CSS (deferred) | ~40–70 KB | Now non-blocking |
| **framer-motion** | **0 KB** | **Removed from initial** |
| **Total initial JS** | **~85–100 KB** | Down from ~250 KB |

---

## 7 — Network Dependency Tree: Before vs After

### Before (LCP chain)
```
HTML
  → [BLOCKING] Tailwind CSS bundle (~1060ms wait)
  → [BLOCKING] Google Fonts CSS → Google Fonts WOFF2 (prior session fix)
  → JS bundle (parallel with CSS)
  → React mounts → API call → image URL discovered → image download
  = LCP: ~6.6s
```

### After (LCP chain)
```
HTML (0ms)
  → [inline script] fetch('/api/public/homepage') starts immediately
  → [deferred, parallel] Tailwind CSS (non-blocking, loads async)
  → [parallel] JS bundle download + parse
  → API responds (~200ms) → window.__HOMEPAGE__ set → ad image preload injected
  → Ad image downloads (~200–500ms)
  → React mounts (JS done: ~2–3s) → initialData from window.__HOMEPAGE__ → 0ms re-fetch
  → Ad image from preload cache (~0ms)
  = LCP: ~2–3s (React mount time; image already cached)
  = FCP: ~0.1–0.3s (pre-rendered hero in index.html)
```

---

## 8 — Expected Scores After Deployment

Run Lighthouse Mobile (`malsahori.com`) 3× and record the median.

| Metric | Entering this pass | Expected after deploy |
|--------|-------------------|-----------------------|
| Performance | ~65 | **82–92** |
| FCP | ~5.6s | **< 0.5s** |
| LCP | ~6.6s | **2.0–3.0s** |
| Speed Index | ~5.2s | **1.5–3.0s** |
| TBT | ~80ms | **< 80ms** |
| CLS | 0 | **0** |
| Render-blocking | ~1060ms | **< 50ms** |
| Unused JS | ~218KB | **< 70KB** |

> ⚠️ These targets apply to the **deployed production site** after redeployment. Dev-mode Lighthouse is unreliable (no throttling, no mobile CPU simulation, Vite HMR overhead, no CSS deferral in dev).

---

## 9 — Files Changed This Pass

| File | Change |
|------|--------|
| `artifacts/abu-alarabi/src/pages/home.tsx` | Removed `framer-motion`; replaced all `motion.*` with plain elements; `data-fade` for below-fold; IntersectionObserver useEffect |
| `artifacts/abu-alarabi/src/components/HeroAdvertisement.tsx` | Removed `useReducedMotion` from framer-motion; replaced with `window.matchMedia` |
| `artifacts/abu-alarabi/vite.config.ts` | Added `deferNonCriticalCss()` Vite plugin (production-only CSS deferral) |
| `artifacts/abu-alarabi/src/index.css` | @font-face changed to relative paths (`./assets/`) for Vite hashing; added `[data-fade]` CSS animation rules |
| `artifacts/abu-alarabi/src/assets/tajawal-400.woff2` | **New** — moved from public/fonts/ to src/assets/ for Vite hash processing |
| `artifacts/abu-alarabi/src/assets/tajawal-700.woff2` | **New** |
| `artifacts/abu-alarabi/src/assets/tajawal-900.woff2` | **New** |
| `artifacts/abu-alarabi/index.html` | Removed font preload (no longer needed; font-display:swap handles it) |

---

## 10 — Remaining Bottleneck

After this pass, the primary LCP limit is **React JS bundle parse + execute time** (~2–3s on Moto G Power at 4× CPU slowdown). The ad image is preloaded and cached; React mounting is the gating factor.

To push LCP below 2.0s, the next step would be:
- **SSR / partial hydration**: Generate HTML server-side with the hero + ad image known
- **Partial prerendering**: Static hero + streaming dynamic content
- These require architectural changes to the deployment model (currently: static SPA + Express API)
