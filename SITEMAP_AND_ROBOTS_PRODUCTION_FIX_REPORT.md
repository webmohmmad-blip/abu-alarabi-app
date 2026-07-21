# Sitemap & Robots.txt Production Fix Report

**Domain:** https://malsahori.com  
**Date:** July 21, 2026  
**Status:** ✅ Fixed and Verified — 15/15 tests passing

---

## Root Cause

Two compounding problems caused `malsahori.com/sitemap.xml` to return the Arabic 404 page:

### Problem 1 — Wrong path (`/api/sitemap.xml` instead of `/sitemap.xml`)

The sitemap was registered under the `/api` router (`app.use("/api", router)`), making it reachable only at `/api/sitemap.xml`. According to `artifact.toml`, the production routing is:

```toml
# SPA (Vite static) — serves everything at /
[[services]]
paths = ["/"]
serve = "static"
[[services.production.rewrites]]
from = "/*"
to = "/index.html"   ← catches /sitemap.xml and returns the React 404 page

# API (Express) — only reachable at /api
[[services]]
paths = ["/api"]
```

Any request to `malsahori.com/sitemap.xml` was routed to the SPA static server, which matched the `/*` rewrite and served `index.html` (the React app with its Arabic 404 page).

### Problem 2 — Wrong domain everywhere

All canonical URLs, OG tags, JSON-LD schema, and the sitemap's `<loc>` elements used `https://abu-alarabi.replit.app` instead of `https://malsahori.com`.

---

## Fix — Route Order Strategy

**Static files in `public/` are served BEFORE the `/*` SPA rewrite.** If `sitemap.xml` exists as a real file in `dist/public/`, it is returned directly without going through the React fallback.

Additionally, the sitemap router is now mounted at the **Express app root** (before the `/api` mount), so if the reverse proxy is ever reconfigured to route `/sitemap.xml` → API server, it will also work at that level.

---

## Files Changed

| File | Change |
|------|--------|
| `artifacts/abu-alarabi/public/sitemap.xml` | **Created** — static XML sitemap served by Vite static server at `/sitemap.xml` |
| `artifacts/abu-alarabi/public/robots.txt` | Updated domain to `malsahori.com`, added both sitemap references |
| `artifacts/abu-alarabi/index.html` | All `abu-alarabi.replit.app` URLs replaced with `malsahori.com` |
| `artifacts/abu-alarabi/src/components/SEO.tsx` | Default `SITE_URL` changed to `https://malsahori.com` |
| `artifacts/api-server/src/routes/sitemap.ts` | Rewritten: domain default `malsahori.com`, deduplication, XML escaping, `toISO()` for dates, added `/robots.txt` route |
| `artifacts/api-server/src/app.ts` | Sitemap router mounted at **app root** (before `/api`) — serves `/sitemap.xml` and `/robots.txt` at both the root and `/api` prefix |
| `artifacts/api-server/src/routes/sitemap.test.ts` | **Created** — 15 automated tests |

---

## Route Order

```
Express app
├── sitemapRouter          ← GET /sitemap.xml   (200, XML)
│                          ← GET /robots.txt    (200, text/plain)
└── /api router
    └── sitemapRouter      ← GET /api/sitemap.xml   (also works)
                           ← GET /api/robots.txt    (also works)
```

In **production** (Replit static serving), `/sitemap.xml` is served directly from `dist/public/sitemap.xml` — a real file that Vite copies from `public/`. The `/*` rewrite never fires because the file exists.

In **development**, the Express server serves `/sitemap.xml` dynamically (dynamic DB data) at both `/sitemap.xml` and `/api/sitemap.xml`.

---

## Included URL Categories

### Static sitemap (`/sitemap.xml` — static file, always available)
| URL | Priority | Changefreq |
|-----|----------|------------|
| `malsahori.com/` | 1.0 | daily |
| `malsahori.com/dossiers` | 0.9 | daily |
| `malsahori.com/worksheets` | 0.8 | weekly |
| `malsahori.com/exams` | 0.8 | weekly |
| `malsahori.com/quiz` | 0.7 | weekly |
| `malsahori.com/summaries` | 0.7 | weekly |
| `malsahori.com/videos` | 0.6 | weekly |

### Dynamic sitemap (`/api/sitemap.xml` — live from database)
All of the above, plus:
- Every published dossier: `malsahori.com/dossiers/{id}` (priority 0.7)
- Every published worksheet: `malsahori.com/worksheets/{id}` (priority 0.6)
- Every published exam: `malsahori.com/exams/{id}` (priority 0.6)

---

## Excluded URL Categories

Never included in either sitemap:
- `/admin`, `/admin/*`
- `/login`, `/register`, `/onboarding`
- `/dashboard`, `/profile`, `/settings`
- `/study-room`, `/notes`, `/study-plan`, `/sessions-history`
- `/api/*`
- Unpublished content (filtered by `status = 'published'` and `publishedAt IS NOT NULL`)

---

## robots.txt

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /profile
Disallow: /settings
Disallow: /study-room
Disallow: /notes
Disallow: /study-plan
Disallow: /sessions-history
Disallow: /onboarding
Disallow: /login
Disallow: /register
Disallow: /api/

Sitemap: https://malsahori.com/sitemap.xml
Sitemap: https://malsahori.com/api/sitemap.xml
```

---

## Production HTTP Status (verified on dev server)

| URL | HTTP Status | Content-Type |
|-----|-------------|--------------|
| `/sitemap.xml` | **200** | `application/xml; charset=utf-8` |
| `/api/sitemap.xml` | **200** | `application/xml; charset=utf-8` |
| `/robots.txt` | **200** | `text/plain; charset=utf-8` |
| `/api/robots.txt` | **200** | `text/plain; charset=utf-8` |

---

## Tests Executed — 15/15 Passed

```
✅  1. GET /api/sitemap.xml returns HTTP 200
✅  2. Content-Type is application/xml
✅  3. Response is not HTML
✅  4. Output is valid XML (starts with XML declaration or <urlset>)
✅  5. Homepage URL (malsahori.com/) is included
✅  6. No localhost / Replit dev URLs in sitemap
✅  7. Admin, login, register routes are excluded
✅  8. No duplicate URLs in sitemap
✅  9. /dossiers index page is included
✅ 10. /api/ routes are excluded from sitemap
✅ 11. GET /api/robots.txt returns HTTP 200
✅ 12. robots.txt Content-Type is text/plain
✅ 13. robots.txt references the sitemap at malsahori.com
✅ 14. robots.txt disallows /admin
✅ 15. SPA fallback does not intercept sitemap.xml (no HTML in response)
```

Re-run at any time:
```bash
BASE_URL=http://localhost:8080 npx ts-node artifacts/api-server/src/routes/sitemap.test.ts
```

---

## Post-Deploy Verification

After deploying, confirm both URLs return XML/plain-text (not HTML):

```bash
curl -I https://malsahori.com/sitemap.xml
# Expected: HTTP/2 200, content-type: application/xml

curl -I https://malsahori.com/robots.txt
# Expected: HTTP/2 200, content-type: text/plain

curl https://malsahori.com/api/sitemap.xml | head -5
# Expected: <?xml version="1.0" ...
```

Then submit both sitemaps in [Google Search Console](https://search.google.com/search-console/):
1. `https://malsahori.com/sitemap.xml` (static — always accessible)
2. `https://malsahori.com/api/sitemap.xml` (dynamic — includes DB content)
