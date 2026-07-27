/**
 * Automated tests for /api/worksheets endpoint
 * Run with:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' artifacts/api-server/src/routes/worksheets.test.ts
 */
import http from "http";
import https from "https";

const BASE_URL = process.env.BASE_URL || "https://malsahori.com";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchUrl(path: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === "https:" ? https : http;

    const req = client.get(url.toString(), (res: http.IncomingMessage) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => {
        resolve({ status: res.statusCode || 0, headers: res.headers, body });
      });
    });

    req.on("error", (err: Error) => reject(err));
    req.end();
  });
}

async function runTests() {
  console.log(`\n🔍 Worksheets API tests — ${BASE_URL}\n`);

  // Test 1: GET /api/worksheets returns 200
  try {
    const res = await fetchUrl("/api/worksheets");
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const json = JSON.parse(res.body);
    assert(Array.isArray(json.items), "Expected items array in response");
    assert(typeof json.total === "number", "Expected total count in response");
    results.push({ name: "GET /api/worksheets returns 200 OK with valid items array", passed: true });
  } catch (err: any) {
    results.push({ name: "GET /api/worksheets returns 200 OK with valid items array", passed: false, error: err.message });
  }

  // Test 2: GET /api/worksheets?limit=20 returns 200
  try {
    const res = await fetchUrl("/api/worksheets?limit=20");
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const json = JSON.parse(res.body);
    assert(json.limit === 20, `Expected limit 20, got ${json.limit}`);
    results.push({ name: "GET /api/worksheets?limit=20 returns 200 with limit 20", passed: true });
  } catch (err: any) {
    results.push({ name: "GET /api/worksheets?limit=20 returns 200 with limit 20", passed: false, error: err.message });
  }

  // Test 3: Invalid limit parameter is handled safely (no 500 error)
  try {
    const res = await fetchUrl("/api/worksheets?limit=invalid");
    assert(res.status === 200, `Expected status 200 for invalid limit fallback, got ${res.status}`);
    const json = JSON.parse(res.body);
    assert(json.limit === 12, `Expected default limit 12 for invalid parameter, got ${json.limit}`);
    results.push({ name: "Invalid limit parameter falls back safely to default limit 12", passed: true });
  } catch (err: any) {
    results.push({ name: "Invalid limit parameter falls back safely to default limit 12", passed: false, error: err.message });
  }

  // Test 4: Upper bound limit check (max 50)
  try {
    const res = await fetchUrl("/api/worksheets?limit=9999");
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const json = JSON.parse(res.body);
    assert(json.limit <= 50, `Expected limit capped at 50, got ${json.limit}`);
    results.push({ name: "Limit parameter is capped at maximum 50", passed: true });
  } catch (err: any) {
    results.push({ name: "Limit parameter is capped at maximum 50", passed: false, error: err.message });
  }

  // Summary
  console.log("── Test Summary ──────────────────────────────────────────");
  let passedCount = 0;
  for (const r of results) {
    if (r.passed) {
      console.log(`  ✅ ${r.name}`);
      passedCount++;
    } else {
      console.log(`  ❌ ${r.name}`);
      console.log(`     Error: ${r.error}`);
    }
  }

  console.log(`\nResults: ${passedCount}/${results.length} passed.\n`);
  if (passedCount < results.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
