/**
 * SEO — per-page head manager
 * Wraps react-helmet-async to inject title, meta, canonical, OG, Twitter, and JSON-LD.
 * The app root must be wrapped in <HelmetProvider> (see main.tsx).
 */
import { Helmet } from "react-helmet-async";

export const SITE_URL =
  (import.meta as any).env?.VITE_SITE_URL?.replace(/\/$/, "") ??
  "https://malsahori.com";

export const SITE_NAME   = "أبو العربي";
export const DEFAULT_TITLE = "أبو العربي | المنصة التعليمية المتخصصة في اللغة العربية";
export const DEFAULT_DESC =
  "تعلم اللغة العربية مع الأستاذ محمد الساحوري (أبو العربي). دوسيات، أوراق عمل، امتحانات محوسبة، كويزات، وخطط دراسية لطلاب التوجيهي الأردني.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/teacher-sahouri.jpg`;

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SEOProps {
  /** Page-specific title — appended with " | أبو العربي" */
  title: string;
  /** 120–160 char description */
  description?: string;
  /** Absolute canonical URL — defaults to current path */
  canonical?: string;
  /** Absolute OG image URL */
  ogImage?: string;
  /** Set true for auth/private pages */
  noindex?: boolean;
  /**
   * JSON-LD schema objects — injected as one or more <script type="application/ld+json">
   * Pass an array to inject multiple schemas.
   */
  schema?: Record<string, unknown> | Record<string, unknown>[];
  /** Breadcrumb trail for BreadcrumbList schema (auto-generated if provided) */
  breadcrumbs?: BreadcrumbItem[];
}

function buildBreadcrumbSchema(breadcrumbs: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function SEO({
  title,
  description = DEFAULT_DESC,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
  schema,
  breadcrumbs,
}: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const desc = description.slice(0, 160);

  const schemas: Record<string, unknown>[] = [];
  if (schema) {
    if (Array.isArray(schema)) schemas.push(...schema);
    else schemas.push(schema);
  }
  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(buildBreadcrumbSchema(breadcrumbs));
  }

  const activePath = typeof window !== "undefined" ? window.location.pathname : "/";
  const targetCanonical = canonical ?? activePath;
  const canonicalUrl = targetCanonical.startsWith("http")
    ? targetCanonical
    : `${SITE_URL}${targetCanonical.startsWith("/") ? targetCanonical : `/${targetCanonical}`}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type"        content="website" />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:locale"      content="ar_JO" />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url"         content={canonicalUrl} />
      <meta property="og:image"        content={ogImage} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt"    content={`${SITE_NAME} — ${title}`} />

      {/* Twitter / X */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={ogImage} />
      <meta name="twitter:creator"     content="@mohammad.alsahori" />

      {/* JSON-LD structured data */}
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}

// ── Pre-built schema helpers ──────────────────────────────────────────────────

export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESC,
  inLanguage: "ar",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/dossiers?search={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  alternateName: ["Abu Al-Arabi", "أبو العربي", "منصة محمد الساحوري"],
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  image: `${SITE_URL}/teacher-sahouri.jpg`,
  description:
    "منصة تعليمية متخصصة في اللغة العربية لطلاب التوجيهي في الأردن، بإشراف الأستاذ محمد الساحوري.",
  founder: {
    "@type": "Person",
    name: "محمد الساحوري",
    alternateName: "Mohammad Alsahori",
    jobTitle: "أستاذ اللغة العربية",
    sameAs: [
      "https://www.facebook.com/alsahori.arabic",
      "https://www.instagram.com/mohammad.alsahori",
    ],
  },
  teaches: "اللغة العربية",
  audience: {
    "@type": "EducationalAudience",
    educationalRole: "student",
    audienceType: "طلاب التوجيهي الأردن جيل 2010",
  },
  sameAs: [
    "https://www.facebook.com/alsahori.arabic",
    "https://www.instagram.com/mohammad.alsahori",
  ],
};

export function courseSchema(opts: {
  name: string;
  description: string;
  url: string;
  provider?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: opts.name,
    description: opts.description,
    url: opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`,
    provider: {
      "@type": "Organization",
      name: opts.provider ?? SITE_NAME,
      sameAs: SITE_URL,
    },
    inLanguage: "ar",
    educationalLevel: "الثانوية العامة",
    teaches: "اللغة العربية",
  };
}

export function articleSchema(opts: {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    url: opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`,
    inLanguage: "ar",
    author: {
      "@type": "Person",
      name: "محمد الساحوري",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
    },
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
  };
}
