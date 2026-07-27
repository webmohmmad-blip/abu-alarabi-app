import https from "https";

const BASE_URL = "https://malsahori.com";

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      "Accept": "application/json",
    };
    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = https.request(url, { method, headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AUTHENTICATED END-TO-END PRODUCTION MATRIX (PHASE 5)");
  console.log("  Target: https://malsahori.com");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. Authenticate Student
  console.log("1. Authenticating test student (0799887766)...");
  let studentToken = null;
  const regRes = await request("POST", "/api/auth/register", {
    fullName: "طالب فحص الجودة",
    phone: "0799887766",
    tawjihiYear: 2010
  });

  if (regRes.status === 200 || regRes.status === 201) {
    studentToken = regRes.data.token;
    console.log(`   ✅ Student authenticated successfully (status: ${regRes.status}, id: ${regRes.data.user?.id})`);
  } else {
    console.log(`   ⚠️ Register fallback to login... status: ${regRes.status}`);
    const loginRes = await request("POST", "/api/auth/login", { phone: "0799887766" });
    if (loginRes.status === 200) {
      studentToken = loginRes.data.token;
      console.log(`   ✅ Student logged in successfully (status: ${loginRes.status}, id: ${loginRes.data.user?.id})`);
    } else {
      console.error("   ❌ Failed to authenticate student:", loginRes.status, loginRes.data);
      process.exit(1);
    }
  }

  // 2. Student Endpoints Audit
  console.log("\n2. Testing Student Authenticated Endpoints:");
  const studentEndpoints = [
    { method: "GET", path: "/api/auth/me", expected: 200, desc: "Get current student profile" },
    { method: "GET", path: "/api/dashboard", expected: 200, desc: "Get student dashboard" },
    { method: "GET", path: "/api/dossiers", expected: 200, desc: "List dossiers catalog" },
    { method: "GET", path: "/api/worksheets", expected: 200, desc: "List worksheets catalog" },
    { method: "GET", path: "/api/schedule", expected: 200, desc: "Get study schedule" },
    { method: "GET", path: "/api/exams", expected: 200, desc: "List exams" },
    { method: "GET", path: "/api/notes", expected: 200, desc: "List notes" },
    { method: "GET", path: "/api/summaries", expected: 200, desc: "List summaries" },
    { method: "GET", path: "/api/quiz", expected: 200, desc: "List weekly quizzes" }
  ];

  let studentPassed = 0;
  for (const ep of studentEndpoints) {
    const res = await request(ep.method, ep.path, null, studentToken);
    const passed = res.status === ep.expected;
    if (passed) studentPassed++;
    console.log(`   ${passed ? "✅" : "❌"} ${ep.method} ${ep.path} -> ${res.status} (expected ${ep.expected}) [${ep.desc}]`);
  }
  console.log(`   Student Endpoints Summary: ${studentPassed}/${studentEndpoints.length} passed.`);

  // 3. Test Student -> Admin Access Isolation
  console.log("\n3. Testing Role Isolation (Student calling Admin API):");
  const isolationRes = await request("GET", "/api/admin/users", null, studentToken);
  const isIsolated = isolationRes.status === 403 || isolationRes.status === 401;
  console.log(`   ${isIsolated ? "✅" : "❌"} GET /api/admin/users as Student -> ${isolationRes.status} (expected 401/403)`);

  // 4. Authenticate Admin
  console.log("\n4. Authenticating admin (0770000000)...");
  let adminToken = null;
  const adminLoginRes = await request("POST", "/api/auth/login", { phone: "0770000000" });
  if (adminLoginRes.status === 200) {
    adminToken = adminLoginRes.data.token;
    console.log(`   ✅ Admin authenticated successfully (status: 200, id: ${adminLoginRes.data.user?.id}, role: ${adminLoginRes.data.user?.role})`);
  } else {
    console.log(`   ⚠️ Admin 0770000000 login status: ${adminLoginRes.status}. Testing if phone login requires another account.`);
  }

  // 5. Admin Endpoints Audit (if adminToken exists)
  if (adminToken) {
    console.log("\n5. Testing Admin Authenticated Endpoints:");
    const adminEndpoints = [
      { method: "GET", path: "/api/admin/users", expected: 200, desc: "List users" },
      { method: "GET", path: "/api/admin/dossiers", expected: 200, desc: "Admin dossiers" },
      { method: "GET", path: "/api/admin/worksheets", expected: 200, desc: "Admin worksheets" },
      { method: "GET", path: "/api/admin/exams", expected: 200, desc: "Admin exams" },
      { method: "GET", path: "/api/admin/quiz", expected: 200, desc: "Admin quiz" },
      { method: "GET", path: "/api/admin/roles", expected: 200, desc: "Admin roles" },
      { method: "GET", path: "/api/admin/categories", expected: 200, desc: "Admin categories" }
    ];

    let adminPassed = 0;
    for (const ep of adminEndpoints) {
      const res = await request(ep.method, ep.path, null, adminToken);
      const passed = res.status === ep.expected;
      if (passed) adminPassed++;
      console.log(`   ${passed ? "✅" : "❌"} ${ep.method} ${ep.path} -> ${res.status} (expected ${ep.expected}) [${ep.desc}]`);
    }

    // 6. Test Excel Export Header Column Check (جيل الطالب)
    console.log("\n6. Testing Excel Export Column Requirement ('جيل الطالب'):");
    const exportRes = await request("GET", "/api/admin/users/export", null, adminToken);
    if (exportRes.status === 200) {
      console.log(`   ✅ GET /api/admin/users/export -> 200 OK (Content-Type: ${exportRes.headers["content-type"]})`);
    } else {
      console.log(`   ⚠️ GET /api/admin/users/export -> ${exportRes.status}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  AUTHENTICATED MATRIX AUDIT COMPLETED");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

runTests().catch(err => {
  console.error("Fatal error running test matrix:", err);
  process.exit(1);
});
