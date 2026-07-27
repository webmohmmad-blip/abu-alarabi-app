/**
 * FULL-STACK RELEASE AUDIT — API Contract Test Suite
 * Tests every known API endpoint against production https://malsahori.com
 * Run with: npx tsx scripts/release-audit.mts
 */
import https from "https";

const BASE = "https://malsahori.com";

interface TestResult {
  endpoint: string;
  method: string;
  role: string;
  expectedStatus: number | string;
  actualStatus: number;
  latencyMs: number;
  payloadSize: number;
  pass: boolean;
  note?: string;
}

const results: TestResult[] = [];

function req(
  method: string,
  path: string,
  opts?: { body?: any; token?: string; timeout?: number }
): Promise<{ status: number; headers: any; body: string; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(path, BASE);
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    if (opts?.token) headers["Authorization"] = `Bearer ${opts.token}`;
    if (opts?.body) headers["Content-Type"] = "application/json";

    const r = https.request(
      url.toString(),
      { method, headers, timeout: opts?.timeout ?? 15000 },
      (res) => {
        let body = "";
        res.on("data", (c: Buffer) => (body += c.toString()));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
            latencyMs: Date.now() - start,
          });
        });
      }
    );
    r.on("error", reject);
    r.on("timeout", () => { r.destroy(); reject(new Error("timeout")); });
    if (opts?.body) r.write(JSON.stringify(opts.body));
    r.end();
  });
}

function record(
  endpoint: string,
  method: string,
  role: string,
  expectedStatus: number | string,
  actualStatus: number,
  latencyMs: number,
  payloadSize: number,
  note?: string
) {
  const pass =
    typeof expectedStatus === "number"
      ? actualStatus === expectedStatus
      : actualStatus.toString().startsWith(expectedStatus.toString().replace("xx", ""));
  results.push({ endpoint, method, role, expectedStatus, actualStatus, latencyMs, payloadSize, pass, note });
  const icon = pass ? "✅" : "❌";
  console.log(
    `${icon} ${method.padEnd(6)} ${endpoint.padEnd(50)} role=${role.padEnd(8)} expected=${String(expectedStatus).padEnd(4)} actual=${String(actualStatus).padEnd(4)} ${latencyMs}ms ${note ? `(${note})` : ""}`
  );
}

async function test(
  endpoint: string,
  method: string,
  role: string,
  expectedStatus: number | string,
  opts?: { body?: any; token?: string }
) {
  try {
    const res = await req(method, endpoint, opts);
    let note = "";
    // Check if JSON was returned when expected
    const ct = res.headers["content-type"] || "";
    if (!ct.includes("json") && !ct.includes("xml") && !ct.includes("text")) {
      note = `unexpected content-type: ${ct}`;
    }
    // Check for stack traces in error responses
    if (res.status >= 400 && res.body.includes("at ") && res.body.includes(".ts:")) {
      note = "STACK TRACE EXPOSED IN ERROR RESPONSE";
    }
    record(endpoint, method, role, expectedStatus, res.status, res.latencyMs, res.body.length, note);
    return res;
  } catch (err: any) {
    record(endpoint, method, role, expectedStatus, 0, 0, 0, `ERROR: ${err.message}`);
    return null;
  }
}

async function run() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  FULL-STACK RELEASE AUDIT — API Contract Tests");
  console.log(`  Target: ${BASE}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ────────── HEALTH ──────────
  console.log("\n── HEALTH ─────────────────────────────────────────────────");
  await test("/api/health", "GET", "guest", 200);
  await test("/api/healthz", "GET", "guest", 200);

  // ────────── AUTH ──────────
  console.log("\n── AUTH ───────────────────────────────────────────────────");
  await test("/api/auth/me", "GET", "guest", 401);
  await test("/api/auth/login", "POST", "guest", 400, { body: {} });
  await test("/api/auth/login", "POST", "guest", 400, {
    body: { phone: "invalid" },
  });
  await test("/api/auth/register", "POST", "guest", 400, { body: {} });

  // ────────── PUBLIC HOMEPAGE ──────────
  console.log("\n── PUBLIC HOMEPAGE ────────────────────────────────────────");
  await test("/api/public/homepage", "GET", "guest", 200);
  await test("/api/subjects", "GET", "guest", 200);
  await test("/api/advertisements/active", "GET", "guest", 200);

  // ────────── DOSSIERS ──────────
  console.log("\n── DOSSIERS ──────────────────────────────────────────────");
  await test("/api/dossiers", "GET", "guest", 200);
  await test("/api/dossiers?limit=5", "GET", "guest", 200);
  await test("/api/dossiers/1", "GET", "guest", 200);
  await test("/api/dossiers/999999", "GET", "guest", 404);
  await test("/api/dossiers/invalid", "GET", "guest", 400);

  // ────────── WORKSHEETS ──────────
  console.log("\n── WORKSHEETS ────────────────────────────────────────────");
  await test("/api/worksheets", "GET", "guest", 200);
  await test("/api/worksheets?limit=20", "GET", "guest", 200);
  await test("/api/worksheets?limit=invalid", "GET", "guest", 200);
  await test("/api/worksheets?limit=9999", "GET", "guest", 200);
  await test("/api/worksheets/1", "GET", "guest", 200);
  await test("/api/worksheets/999999", "GET", "guest", 404);

  // ────────── EXAMS (unauthenticated) ──────────
  console.log("\n── EXAMS (unauthenticated) ───────────────────────────────");
  await test("/api/exams", "GET", "guest", 401);
  await test("/api/exams/1", "GET", "guest", 401);
  await test("/api/exams/1/start", "POST", "guest", 401);

  // ────────── STUDENT-ONLY APIs (unauthenticated) ──────────
  console.log("\n── STUDENT APIs (unauth — should 401) ───────────────────");
  await test("/api/dashboard", "GET", "guest", 401);
  await test("/api/study-plan", "GET", "guest", 401);
  await test("/api/notes", "GET", "guest", 401);
  await test("/api/sessions", "GET", "guest", 401);
  await test("/api/statistics", "GET", "guest", 401);
  await test("/api/notifications", "GET", "guest", 401);
  await test("/api/schedule/slots", "GET", "guest", 401);
  await test("/api/summaries", "GET", "guest", 401);
  await test("/api/flashcards", "GET", "guest", 401);

  // ────────── ADMIN APIs (unauthenticated — should 401) ──────────
  console.log("\n── ADMIN APIs (unauth — should 401) ─────────────────────");
  await test("/api/admin/dashboard", "GET", "guest", 401);
  await test("/api/admin/users", "GET", "guest", 401);
  await test("/api/admin/users/export", "GET", "guest", 401);
  await test("/api/admin/dossiers", "GET", "guest", 401);
  await test("/api/admin/worksheets", "GET", "guest", 401);
  await test("/api/admin/exams", "GET", "guest", 401);
  await test("/api/admin/roles", "GET", "guest", 401);
  await test("/api/admin/settings", "GET", "guest", 401);
  await test("/api/admin/quiz", "GET", "guest", 401);
  await test("/api/admin/categories", "GET", "guest", 401);
  await test("/api/admin/advertisements", "GET", "guest", 401);

  // ────────── STORAGE (unauthenticated) ──────────
  console.log("\n── STORAGE (unauth) ─────────────────────────────────────");
  await test("/api/storage/presign", "POST", "guest", 401);

  // ────────── SEO ──────────
  console.log("\n── SEO ──────────────────────────────────────────────────");
  await test("/robots.txt", "GET", "guest", 200);
  await test("/sitemap.xml", "GET", "guest", 200);

  // ────────── HOMEPAGE SETTINGS (unauth) ──────────
  console.log("\n── HOMEPAGE SETTINGS (unauth) ────────────────────────────");
  await test("/api/homepage-settings", "GET", "guest", 200);

  // ────────── COMMENTS (unauth) ──────────
  console.log("\n── COMMENTS ──────────────────────────────────────────────");
  await test("/api/comments/dossier/1", "GET", "guest", 200);

  // ────────── NON-EXISTENT ROUTES ──────────
  console.log("\n── NON-EXISTENT ROUTES ──────────────────────────────────");
  await test("/api/nonexistent", "GET", "guest", 404);
  await test("/api/admin/nonexistent", "GET", "guest", 401); // admin middleware blocks first

  // ════════════════════════════════════════════════════════════
  //   SUMMARY
  // ════════════════════════════════════════════════════════════
  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("  RESULTS SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const total = results.length;

  console.log(`Total: ${total}  |  Passed: ${passed}  |  Failed: ${failed}\n`);

  if (failed > 0) {
    console.log("── FAILURES ─────────────────────────────────────────────");
    for (const r of results.filter((r) => !r.pass)) {
      console.log(
        `  ❌ ${r.method} ${r.endpoint} [role=${r.role}] expected=${r.expectedStatus} actual=${r.actualStatus} ${r.note ? `— ${r.note}` : ""}`
      );
    }
  }

  // Latency report
  const sorted = [...results].sort((a, b) => b.latencyMs - a.latencyMs);
  console.log("\n── TOP 10 SLOWEST ───────────────────────────────────────");
  for (const r of sorted.slice(0, 10)) {
    console.log(`  ${r.latencyMs}ms  ${r.method} ${r.endpoint}`);
  }

  // Payload size report
  const bigPayloads = [...results].sort((a, b) => b.payloadSize - a.payloadSize);
  console.log("\n── TOP 5 LARGEST PAYLOADS ───────────────────────────────");
  for (const r of bigPayloads.slice(0, 5)) {
    console.log(`  ${(r.payloadSize / 1024).toFixed(1)}KB  ${r.method} ${r.endpoint}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════\n");
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Audit runner crashed:", err);
  process.exit(1);
});
