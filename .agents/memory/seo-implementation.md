---
name: SEO Implementation
description: Complete SEO architecture for Abu Al-Arabi platform — react-helmet-async, dynamic sitemap, per-page meta, structured data.
---

## Rule
Every new public page must include `<SEO title="..." description="..." canonical="..." />`. Private/auth pages use `noindex`.

**Why:** react-helmet-async is installed and HelmetProvider wraps the app in main.tsx. Forgetting SEO on a new page leaves it with the generic fallback title from index.html.

## How to apply
- Import: `import { SEO } from "@/components/SEO";`
- Add as first child inside the layout component in the page's return
- Public pages: include `canonical` and `breadcrumbs`
- Private pages: `<SEO title="..." noindex />`
- Detail pages (dossier, worksheet): use dynamic title from data object, added after the loading guard

## Shared schema helpers (in SEO.tsx)
- `WEBSITE_SCHEMA` — WebSite + SearchAction (use on homepage)
- `ORGANIZATION_SCHEMA` — EducationalOrganization (use on homepage)
- `courseSchema({ name, description, url })` — Course
- `articleSchema({ headline, description, url })` — Article

## Dynamic sitemap
- Route: `GET /api/sitemap.xml` (in `artifacts/api-server/src/routes/sitemap.ts`)
- Registered in `routes/index.ts` via `router.use(sitemapRouter)`
- Queries published dossiers, worksheets, exams from DB
- Cached 1h

## robots.txt
Blocks: /admin, /dashboard, /login, /register, /onboarding, /profile, /settings, /api/, /study-room, /notes, /study-plan, /sessions-history
References sitemap: https://abu-alarabi.replit.app/sitemap.xml

## Analytics activation
GTM/GA4/Clarity code blocks are commented in index.html — uncomment and replace IDs to activate.
Google Search Console verification placeholder is also in index.html.
