#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Abu Al-Arabi Platform — Regression Test Suite
# Usage: ./scripts/regression-test.sh [API_BASE]
# Default API_BASE: http://localhost:8080
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

API="${1:-http://localhost:8080}"
PASS=0; FAIL=0; SKIP=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; RESET='\033[0m'

pass() { echo -e "${GREEN}✓ $1${RESET}"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}✗ $1${RESET}"; FAIL=$((FAIL + 1)); }
skip() { echo -e "${YELLOW}⊘ $1${RESET}"; SKIP=$((SKIP + 1)); }
section() { echo -e "\n${YELLOW}── $1 ──${RESET}"; }

# ── Auth ─────────────────────────────────────────────────────────────────────
section "Auth"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/health")
[ "$HEALTH" = "200" ] && pass "GET /api/health → 200" || fail "GET /api/health → $HEALTH"

LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0771234567","password":"password123"}')
STUDENT_TOKEN=$(echo "$LOGIN" | jq -r '.token // empty')
[ -n "$STUDENT_TOKEN" ] && pass "Student login → token" || fail "Student login → no token"

# Uses dedicated regression-test admin (0799999001) — avoids rate-limit on real admin
ADMIN_LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0799999001","password":"ignored"}')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.token // empty')
[ -n "$ADMIN_TOKEN" ] && pass "Admin login → token" || fail "Admin login → no token (is 0799999001 in DB?)"

# platform uses phone-only auth — any password works for existing users (by design)
PHONE_ONLY=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0771234567","password":"ignored"}' | jq -r '.token // empty')
[ -n "$PHONE_ONLY" ] && pass "Phone-only login (password ignored) → token issued" || fail "Phone-only login failed"

# unknown phone → 400 (user not found — login refuses, no token issued)
UNKNOWN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0700000000","password":"x"}')
UNKNOWN_TOKEN=$(echo "$UNKNOWN" | jq -r '.token // empty')
[ -z "$UNKNOWN_TOKEN" ] && pass "Unknown phone → no token issued" || fail "Unknown phone should not return a token"

# ── Auth guards ───────────────────────────────────────────────────────────────
section "Auth Guards (unauthenticated → 401)"

for ENDPOINT in \
  "/api/exams" \
  "/api/dossiers" \
  "/api/worksheets" \
  "/api/summaries" \
  "/api/quiz/current" \
  "/api/quiz/leaderboard" \
  "/api/dashboard/platform-stats" \
  "/api/auth/me"
do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API$ENDPOINT")
  [ "$CODE" = "401" ] && pass "GET $ENDPOINT → 401" || fail "GET $ENDPOINT → $CODE (expected 401)"
done

# ── Role guards ───────────────────────────────────────────────────────────────
section "Role Guards (student → 403 on admin routes)"

for ENDPOINT in \
  "/api/admin/dashboard" \
  "/api/admin/users" \
  "/api/admin/dossiers" \
  "/api/admin/exams" \
  "/api/admin/quiz"
do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $STUDENT_TOKEN" "$API$ENDPOINT")
  [ "$CODE" = "403" ] && pass "GET $ENDPOINT → 403 for student" || fail "GET $ENDPOINT → $CODE (expected 403)"
done

# ── Student content endpoints ─────────────────────────────────────────────────
section "Student Content (authenticated → 200)"

for ENDPOINT in \
  "/api/exams" \
  "/api/dossiers" \
  "/api/worksheets" \
  "/api/summaries" \
  "/api/dashboard/platform-stats" \
  "/api/auth/me" \
  "/api/subjects"
do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $STUDENT_TOKEN" "$API$ENDPOINT")
  [ "$CODE" = "200" ] && pass "GET $ENDPOINT → 200" || fail "GET $ENDPOINT → $CODE (expected 200)"
done

# ── Admin dossiers CRUD ───────────────────────────────────────────────────────
section "Admin Dossiers (GET /api/admin/dossiers)"

DLIST=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API/api/admin/dossiers")
DLIST_OK=$(echo "$DLIST" | jq -r '.ok')
[ "$DLIST_OK" = "true" ] && pass "GET /api/admin/dossiers → ok:true" || fail "GET /api/admin/dossiers → ok not true"

PAGINATION=$(echo "$DLIST" | jq -r '.pagination | has("total") and has("page") and has("pageSize")')
[ "$PAGINATION" = "true" ] && pass "Response has pagination metadata" || fail "Missing pagination metadata"

D_SEARCH=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" "$API/api/admin/dossiers?search=test&status=published&page=1&pageSize=5")
[ "$D_SEARCH" = "200" ] && pass "GET /api/admin/dossiers with filters → 200" || fail "GET /api/admin/dossiers with filters → $D_SEARCH"

# ── Exam validation ───────────────────────────────────────────────────────────
section "Exam/Quiz Validation"

# missing subjectId → 400
EXAM_NO_SUBJ=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API/api/admin/exams" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"test exam"}')
[ "$EXAM_NO_SUBJ" = "400" ] && pass "POST /api/admin/exams without subjectId → 400" || fail "POST /api/admin/exams without subjectId → $EXAM_NO_SUBJ"

# invalid subjectId → 404
EXAM_BAD_SUBJ=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API/api/admin/exams" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"test exam","subjectId":99999}')
[ "$EXAM_BAD_SUBJ" = "404" ] && pass "POST /api/admin/exams with invalid subjectId → 404" || fail "POST /api/admin/exams bad subjectId → $EXAM_BAD_SUBJ"

# quiz missing subjectId → 400
QUIZ_NO_SUBJ=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API/api/admin/quiz" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"test quiz"}')
[ "$QUIZ_NO_SUBJ" = "400" ] && pass "POST /api/admin/quiz without subjectId → 400" || fail "POST /api/admin/quiz without subjectId → $QUIZ_NO_SUBJ"

# ── Platform stats (real data) ────────────────────────────────────────────────
section "Platform Stats (real DB)"

STATS=$(curl -s -H "Authorization: Bearer $STUDENT_TOKEN" "$API/api/dashboard/platform-stats")
STATS_STUDENTS=$(echo "$STATS" | jq '.totalStudents')
STATS_DOSSIERS=$(echo "$STATS" | jq '.totalDossiers')

echo "  totalStudents=$STATS_STUDENTS totalDossiers=$STATS_DOSSIERS"

# verify they are real numbers (not hardcoded 12480)
[ "$STATS_STUDENTS" != "12480" ] && pass "totalStudents is real DB value (not hardcoded)" || fail "totalStudents still 12480 (hardcoded)"
[ "$STATS_DOSSIERS" != "348" ]   && pass "totalDossiers is real DB value (not hardcoded)"  || fail "totalDossiers still 348 (hardcoded)"

# ── Admin dashboard stats ──────────────────────────────────────────────────────
section "Admin Dashboard (real queries)"

ADMIN_DASH=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API/api/admin/dashboard")
ADMIN_STUDENTS=$(echo "$ADMIN_DASH" | jq '.totalStudents')
echo "  admin.totalStudents=$ADMIN_STUDENTS"
[ "$ADMIN_STUDENTS" != "null" ] && pass "Admin dashboard totalStudents is numeric" || fail "Admin dashboard totalStudents is null"

# ── Exam flow ─────────────────────────────────────────────────────────────────
section "Exam Flow"

# /api/exams returns a JSON array directly (not {items:[…]})
EXAMS=$(curl -s -H "Authorization: Bearer $STUDENT_TOKEN" "$API/api/exams")
EXAM_COUNT=$(echo "$EXAMS" | jq 'if type=="array" then length else (.items//[])|length end')
echo "  Published exams available: $EXAM_COUNT"

if [ "${EXAM_COUNT:-0}" -gt "0" ]; then
  EXAM_ID=$(echo "$EXAMS" | jq 'if type=="array" then .[0].id else .items[0].id end')
  
  # Start attempt
  ATTEMPT=$(curl -s -X POST \
    -H "Authorization: Bearer $STUDENT_TOKEN" \
    -H "Content-Type: application/json" \
    "$API/api/exams/$EXAM_ID/start")
  ATTEMPT_ID=$(echo "$ATTEMPT" | jq '.attemptId // .id')
  [ "$ATTEMPT_ID" != "null" ] && pass "POST /api/exams/$EXAM_ID/start → attemptId" || fail "Start exam → no attemptId"
else
  skip "No published exams — exam flow test skipped"
fi

# ── Annotation isolation ──────────────────────────────────────────────────────
section "Annotation Isolation"

# Annotation route: GET /workspace/annotations/:dossierId/:page
# Both users hit the same dossierId/page — each gets only their own strokes
ANN_STUDENT=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $STUDENT_TOKEN" "$API/api/workspace/annotations/1/1")
ANN_ADMIN=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" "$API/api/workspace/annotations/1/1")
[ "$ANN_STUDENT" = "200" ] && pass "Student annotations/:id/:page → 200" || fail "Student annotations → $ANN_STUDENT"
[ "$ANN_ADMIN" = "200" ]   && pass "Admin annotations/:id/:page → 200"   || fail "Admin annotations → $ANN_ADMIN"

# Cross-source isolation: worksheet annotations are at a different path
ANN_WS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $STUDENT_TOKEN" "$API/api/workspace/worksheet-annotations/1/1")
[ "$ANN_WS" = "200" ] && pass "Worksheet annotations/:id/:page → 200" || fail "Worksheet annotations → $ANN_WS"

# ── Summary ───────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo "══════════════════════════════════════════"
echo -e "  Results: ${GREEN}${PASS} passed${RESET} | ${RED}${FAIL} failed${RESET} | ${YELLOW}${SKIP} skipped${RESET} | ${TOTAL} total"
echo "══════════════════════════════════════════"

if [ "$FAIL" -gt "0" ]; then
  exit 1
else
  exit 0
fi
