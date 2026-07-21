/**
 * Automated tests for /sitemap.xml and /robots.txt
 *
 * Run:
 *   pnpm --filter @workspace/api-server exec ts-node src/routes/sitemap.test.ts
 *   OR after server is up:
 *   BASE_URL=http://localhost:8080 node --enable-source-maps dist/index.mjs &
 *   BASE_URL=http://localhost:8080 ts-node src/routes/sitemap.test.ts
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function pass(name: string) {
  results.push({ name, passed: true });
  console.log(`  ✅  ${name}`);
}

function fail(name: string, message: string) {
  results.push({ name, passed: false, message });
  console.error(`  ❌  ${name}: ${message}`);
}

async function runTests() {
  console.log(`\n🔍 Sitemap & robots.txt tests — ${BASE_URL}\n`);

  // ── /api/sitemap.xml ─────────────────────────────────────────────────────
  let sitemapXml = "";
  try {
    const res = await fetch(`${BASE_URL}/api/sitemap.xml`);

    // Test 1: returns 200
    if (res.status === 200) pass("1. GET /api/sitemap.xml returns HTTP 200");
    else fail("1. GET /api/sitemap.xml returns HTTP 200", `got ${res.status}`);

    // Test 2: Content-Type is XML
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/xml")) pass("2. Content-Type is application/xml");
    else fail("2. Content-Type is application/xml", `got '${ct}'`);

    sitemapXml = await res.text();

    // Test 3: not HTML
    if (!sitemapXml.trimStart().startsWith("<html") && !sitemapXml.includes("<!DOCTYPE html>"))
      pass("3. Response is not HTML");
    else fail("3. Response is not HTML", "got HTML document");

    // Test 4: valid XML (starts with XML declaration or <urlset>)
    if (sitemapXml.trimStart().startsWith("<?xml") || sitemapXml.trimStart().startsWith("<urlset"))
      pass("4. Output is valid XML (starts with XML declaration or <urlset>)");
    else fail("4. Output is valid XML", "unexpected root element");

    // Test 5: homepage URL present
    if (sitemapXml.includes("malsahori.com/</loc>") || sitemapXml.includes("malsahori.com/<"))
      pass("5. Homepage URL (malsahori.com/) is included");
    else if (sitemapXml.includes("malsahori.com/"))
      pass("5. Homepage URL (malsahori.com/) is included");
    else fail("5. Homepage URL (malsahori.com/) is included", "URL not found in sitemap");

    // Test 6: no localhost or dev URLs
    if (!sitemapXml.includes("localhost") && !sitemapXml.includes("replit.dev") && !sitemapXml.includes("replit.app"))
      pass("6. No localhost / Replit dev URLs in sitemap");
    else fail("6. No localhost / Replit dev URLs in sitemap", "found dev URL in sitemap output");

    // Test 7: admin routes excluded
    if (!sitemapXml.includes("/admin") && !sitemapXml.includes("/login") && !sitemapXml.includes("/register"))
      pass("7. Admin, login, register routes are excluded");
    else fail("7. Admin, login, register routes are excluded", "private route found in sitemap");

    // Test 8: no duplicate URLs
    const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
    const unique = new Set(urls);
    if (urls.length === unique.size) pass("8. No duplicate URLs in sitemap");
    else fail("8. No duplicate URLs in sitemap", `${urls.length - unique.size} duplicates found`);

    // Test 9: dossiers index page present
    if (sitemapXml.includes("malsahori.com/dossiers"))
      pass("9. /dossiers index page is included");
    else fail("9. /dossiers index page is included", "not found");

    // Test 10: no API routes included
    if (!sitemapXml.includes("/api/"))
      pass("10. /api/ routes are excluded from sitemap");
    else fail("10. /api/ routes are excluded from sitemap", "API route found in sitemap");

  } catch (err: any) {
    fail("GET /api/sitemap.xml", `fetch error: ${err.message}`);
  }

  // ── /api/robots.txt ──────────────────────────────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/api/robots.txt`);

    // Test 11: robots returns 200
    if (res.status === 200) pass("11. GET /api/robots.txt returns HTTP 200");
    else fail("11. GET /api/robots.txt returns HTTP 200", `got ${res.status}`);

    // Test 12: Content-Type is text/plain
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/plain")) pass("12. robots.txt Content-Type is text/plain");
    else fail("12. robots.txt Content-Type is text/plain", `got '${ct}'`);

    const robotsTxt = await res.text();

    // Test 13: sitemap declaration present
    if (robotsTxt.includes("Sitemap:") && robotsTxt.includes("malsahori.com"))
      pass("13. robots.txt references the sitemap at malsahori.com");
    else fail("13. robots.txt references the sitemap", "Sitemap: line missing or uses wrong domain");

    // Test 14: admin is disallowed
    if (robotsTxt.includes("Disallow: /admin"))
      pass("14. robots.txt disallows /admin");
    else fail("14. robots.txt disallows /admin", "Disallow: /admin not found");

  } catch (err: any) {
    fail("GET /api/robots.txt", `fetch error: ${err.message}`);
  }

  // ── Route ordering — SPA does not intercept sitemap ─────────────────────
  // Test 15: response is NOT the SPA index.html
  if (sitemapXml && !sitemapXml.includes("<div id=\"root\">") && !sitemapXml.includes("<!DOCTYPE html>"))
    pass("15. SPA fallback does not intercept sitemap.xml (no HTML in response)");
  else if (!sitemapXml)
    fail("15. SPA fallback does not intercept sitemap.xml", "could not fetch sitemap");
  else
    fail("15. SPA fallback does not intercept sitemap.xml", "SPA HTML found in sitemap response");

  // ── Summary ──────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.passed).length;
  const total  = results.length;
  console.log(`\n${"─".repeat(55)}`);
  console.log(`Results: ${passed}/${total} passed`);
  if (passed === total) {
    console.log("🎉 All tests passed!\n");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. See details above.\n");
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
