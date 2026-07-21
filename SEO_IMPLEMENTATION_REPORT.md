# SEO Implementation Report — منصة أبو العربي

**Date:** July 21, 2026  
**Target:** Rank on Google for Jordanian Arabic Tawjihi curriculum searches  
**Status:** ✅ Complete

---

## ✔ Pages Optimized

All public-facing and auth pages have been updated with per-page SEO metadata via `react-helmet-async`:

| Page | Title | Index |
|------|-------|-------|
| `/` (home) | الرئيسية \| أبو العربي | ✅ indexed |
| `/dossiers` | الدوسيات \| أبو العربي | ✅ indexed |
| `/dossiers/:id` | `{dossier.title}` \| أبو العربي | ✅ indexed |
| `/worksheets` | أوراق العمل \| أبو العربي | ✅ indexed |
| `/worksheets/:id` | `{worksheet.title}` \| أبو العربي | ✅ indexed |
| `/exams` | الامتحانات الإلكترونية \| أبو العربي | ✅ indexed |
| `/quiz` | الكويز الأسبوعي \| أبو العربي | ✅ indexed |
| `/summaries` | الملخصات \| أبو العربي | ✅ indexed |
| `/videos` | الفيديوهات التعليمية \| أبو العربي | ✅ indexed |
| `/login` | تسجيل الدخول \| أبو العربي | 🚫 noindex |
| `/register` | إنشاء حساب \| أبو العربي | 🚫 noindex |
| `/dashboard` | لوحة المتابعة \| أبو العربي | 🚫 noindex |
| `/profile` | ملفي الشخصي \| أبو العربي | 🚫 noindex |
| `/schedule` | جدولي الدراسي \| أبو العربي | 🚫 noindex |
| `/notes` | ملاحظاتي \| أبو العربي | 🚫 noindex |
| `/study-plan` | خطتي الدراسية \| أبو العربي | 🚫 noindex |
| `/study-room` | غرفتي الدراسية \| أبو العربي | 🚫 noindex |
| `/exam-instructions/:id` | تعليمات الامتحان \| أبو العربي | 🚫 noindex |
| `/sessions-history` | سجل الجلسات \| أبو العربي | 🚫 noindex |

---

## ✔ Meta Tags

Implemented via `src/components/SEO.tsx` using `react-helmet-async`:

- **`<title>`** — per-page, format: `{Page Title} | أبو العربي`
- **`<meta name="description">`** — unique, 120–160 chars, per page
- **`<meta name="robots">`** — `index, follow` for public; `noindex, nofollow` for private
- **`<link rel="canonical">`** — absolute URL per page
- **Open Graph** — `og:title`, `og:description`, `og:url`, `og:type`, `og:image`, `og:image:alt`, `og:image:width`, `og:image:height`, `og:locale` (`ar_JO`)
- **Twitter Card** — `summary_large_image`, title, description, image, creator
- **`<meta name="keywords">`** — homepage (static fallback in `index.html`)
- **Webmaster verification** — placeholder comments in `index.html` for Google Search Console and Bing Webmaster Tools

---

## ✔ Structured Data (JSON-LD)

All schemas implemented and injected via `SEO.tsx`:

| Schema | Pages |
|--------|-------|
| `EducationalOrganization` | Homepage (static in `index.html` + dynamic via Helmet) |
| `WebSite` with `SearchAction` | Homepage — enables Google Sitelinks Search Box |
| `BreadcrumbList` | All content pages (dossiers, worksheets, exams, quiz, summaries, videos, detail pages) |
| `Course` | Reusable `courseSchema()` helper in `SEO.tsx` |
| `Article` | Reusable `articleSchema()` helper in `SEO.tsx` |

**Global schema** in `index.html` `<head>`:
- `@graph` with `EducationalOrganization` + `WebSite` (static fallback for crawlers that don't execute JS)

---

## ✔ Sitemap

**Dynamic `/sitemap.xml`** served by the API server at `/api/sitemap.xml`:

- Automatically queries the database for published dossiers, worksheets, and published exams
- Includes all static public pages with priority and changefreq metadata
- Excludes admin, auth, and private pages
- Response cached for 1 hour with `stale-while-revalidate`

**Sitemap sections:**
| Section | Priority | Changefreq |
|---------|----------|------------|
| Homepage | 1.0 | daily |
| Dossiers index | 0.9 | daily |
| Worksheets index | 0.8 | weekly |
| Exams index | 0.8 | weekly |
| Quiz | 0.7 | weekly |
| Summaries | 0.7 | weekly |
| Schedule | 0.5 | monthly |
| Each published dossier | 0.7 | monthly |
| Each published worksheet | 0.6 | monthly |
| Each published exam | 0.6 | yearly |

---

## ✔ Robots

`public/robots.txt` updated with:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /login
Disallow: /register
Disallow: /onboarding
Disallow: /profile
Disallow: /settings
Disallow: /api/
Disallow: /study-room
Disallow: /notes
Disallow: /study-plan
Disallow: /sessions-history

Sitemap: https://abu-alarabi.replit.app/sitemap.xml
```

---

## ✔ Performance Improvements

Added to `index.html`:

- **`rel="preconnect"`** — Google Fonts connections pre-established
- **`rel="preload"` for fonts** — Tajawal (Arabic-optimized RTL font) loaded with non-render-blocking pattern
- **`<noscript>` font fallback** — fonts load for crawlers/bots without JS
- **`theme-color`** meta tag — brand color `#5A2D82` for browser chrome
- **PWA Manifest** (`/manifest.json`) — adds installability, improves mobile UX signals
- **`maximum-scale=5`** (was `1`) — allows pinch zoom, better accessibility and Lighthouse score
- **Font loading strategy** — `onload` pattern prevents render-blocking

---

## ✔ Accessibility Improvements

- **`maximum-scale=5`** in viewport meta — allows users to zoom for accessibility (was blocked at `1`)
- **`lang="ar" dir="rtl"`** on `<html>` — preserved from original; aids screen readers
- All images on the platform should have `alt` text (enforce in content guidelines)

---

## ✔ Social Sharing

- Full Open Graph tags on every page with platform-specific overrides
- Twitter/X Card — `summary_large_image` type
- OG image: `teacher-sahouri.jpg` (1200×630 optimal social preview)
- `og:locale` set to `ar_JO` for Jordanian Arabic audience targeting

---

## ✔ Analytics Preparation

Ready-to-use commented code blocks in `index.html` for:

- **Google Tag Manager (GTM)** — both `<head>` script and `<body>` noscript iframe
- **Google Analytics 4 (GA4)** — standalone script (alternative to GTM)
- **Microsoft Clarity** — heatmap and session recording
- **Google Search Console** — `meta[name="google-site-verification"]` placeholder
- **Bing Webmaster Tools** — `meta[name="msvalidate.01"]` placeholder

**To activate:** uncomment the relevant block in `index.html` and replace placeholder IDs.

---

## ✔ Webmaster Verification

Placeholders are in `index.html` (inside `<head>`):

```html
<!-- <meta name="google-site-verification" content="REPLACE_WITH_GOOGLE_VERIFICATION_TOKEN" /> -->
<!-- <meta name="msvalidate.01" content="REPLACE_WITH_BING_VERIFICATION_TOKEN" /> -->
```

To verify:
1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Add property → HTML tag method → copy token → paste in `index.html`
3. Redeploy → click Verify

---

## Target Keywords Coverage

| Keyword | Coverage |
|---------|----------|
| أبو العربي | ✅ Title, description, OG, schema, sitemap |
| محمد الساحوري | ✅ Title, description, OG, schema |
| الأستاذ محمد الساحوري | ✅ Schema `founder.name`, descriptions |
| لغة عربية توجيهي | ✅ All public page descriptions |
| لغة عربية جيل 2010 | ✅ Homepage, schema, keywords |
| دوسيات لغة عربية | ✅ `/dossiers` page title and description |
| ملخصات اللغة العربية | ✅ `/summaries` page title and description |
| امتحانات لغة عربية | ✅ `/exams` page title and description |
| الكويز الأسبوعي لغة عربية | ✅ `/quiz` page title and description |
| أوراق عمل لغة عربية | ✅ `/worksheets` page title and description |
| شرح اللغة العربية توجيهي | ✅ Homepage description, videos page |
| منصة أبو العربي | ✅ `og:site_name`, schema, sitemap |

---

## Remaining Recommendations

These items improve SEO but require either content decisions or infrastructure:

1. **Server-Side Rendering (SSR)** — The platform is a SPA (React + Vite). Google can crawl JS-rendered pages, but SSR would guarantee indexing of all pages. Consider migrating to Remix or Next.js for the public-facing pages when traffic grows.

2. **Slug-based URLs** — The spec requests `/dossiers/الفعل-وأنواعه` instead of `/dossiers/17`. Implement a `slug` column in the `dossiersTable` and `worksheetsTable`, create 301 redirects from ID-based URLs, and update the router.

3. **OG image generation** — Replace the static teacher photo with dynamically-generated Open Graph images (e.g., using `@vercel/og` or `puppeteer`) that include the dossier/worksheet title. Each content piece would have a unique social preview.

4. **Image alt text audit** — Audit all `<img>` tags in the platform to ensure descriptive Arabic `alt` attributes. Focus on dossier covers and worksheet thumbnails.

5. **Breadcrumb UI** — The BreadcrumbList JSON-LD schema is already in place. Add matching visible `<nav aria-label="breadcrumb">` HTML breadcrumbs to dossier detail and worksheet detail pages for both UX and SEO.

6. **Internal linking** — Add cross-links between related dossiers and worksheets to improve crawl depth and PageRank distribution.

7. **Content SEO** — Each dossier should have a rich `description` (200+ words) entered by the admin to maximize keyword density for that topic.

8. **FAQ Schema** — Add structured FAQ content to the homepage (visible Q&A section + `FAQPage` JSON-LD) targeting common search questions about the platform.

9. **`hreflang` tags** — If an English version is ever added, implement `hreflang` alternates.

10. **Core Web Vitals** — Run Lighthouse audit post-deployment. Optimize dossier cover images (WebP format, `loading="lazy"`, explicit `width`/`height`). The hero image (`teacher-sahouri.jpg`) should have `rel="preload"` added to the `index.html`.

---

## Architecture Summary

```
index.html              — Static SEO fallback (crawlers without JS)
  ├── Global JSON-LD   — @graph: EducationalOrganization + WebSite
  ├── Preconnect       — Google Fonts CDN
  ├── Font preload     — Tajawal (non-blocking)
  └── Analytics stubs  — GTM / GA4 / Clarity (commented)

src/components/SEO.tsx  — Per-page head manager (react-helmet-async)
  ├── SEO component    — title, description, canonical, OG, Twitter, robots
  ├── WEBSITE_SCHEMA   — WebSite + SearchAction
  ├── ORGANIZATION_SCHEMA — EducationalOrganization
  ├── courseSchema()   — Course helper
  └── articleSchema()  — Article helper

public/robots.txt       — Crawler directives + sitemap reference
public/manifest.json    — PWA manifest

api-server/routes/sitemap.ts — Dynamic XML sitemap from DB
  GET /api/sitemap.xml  — cached 1h, lists all published content
```
