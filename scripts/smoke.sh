#!/usr/bin/env bash
# Post-deploy smoke test. Hits the public + auth'd endpoints and shows pass/fail.
# Usage:
#   bash scripts/smoke.sh                      # tests prod
#   BASE=http://localhost:3000 bash scripts/smoke.sh  # tests local
#   COOKIE='aim.sid=...' bash scripts/smoke.sh # include for auth'd endpoints
set -u

BASE="${BASE:-https://aimarket-pro-production.up.railway.app}"
COOKIE="${COOKIE:-}"

PASS=0
FAIL=0

check() {
  local name="$1"
  local expected="$2"
  shift 2
  local out
  out=$(curl -s -o /dev/null -w "%{http_code}" "$@" 2>/dev/null)
  if [ "$out" = "$expected" ]; then
    echo "  ✓ $name → $out"
    PASS=$((PASS+1))
  else
    echo "  ✗ $name → got $out, expected $expected"
    FAIL=$((FAIL+1))
  fi
}

echo "Smoke testing: $BASE"
echo "---"
echo "Public endpoints (no auth required):"
check "GET /api/health"                        200 "$BASE/api/health"
check "GET /api/me without auth"               401 "$BASE/api/me"
check "POST /api/leads (no body — should 400)" 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/leads"
check "GET / (landing)"                        200 "$BASE/"
check "GET /ad?product=test (public)"          200 "$BASE/ad?product=test"

if [ -n "$COOKIE" ]; then
  echo ""
  echo "Auth'd endpoints (using provided cookie):"
  check "GET /api/me"                          200 -b "$COOKIE" "$BASE/api/me"
  check "GET /api/settings"                    200 -b "$COOKIE" "$BASE/api/settings"
  check "GET /api/preferences"                 200 -b "$COOKIE" "$BASE/api/preferences"
  check "GET /api/instagram/account"           200 -b "$COOKIE" "$BASE/api/instagram/account"
  check "GET /api/instagram/posts"             200 -b "$COOKIE" "$BASE/api/instagram/posts"
  check "GET /api/facebook/page"               200 -b "$COOKIE" "$BASE/api/facebook/page"
  check "GET /api/campaigns"                   200 -b "$COOKIE" "$BASE/api/campaigns"
  check "GET /api/leads"                       200 -b "$COOKIE" "$BASE/api/leads"
  check "GET /api/notifications"               200 -b "$COOKIE" "$BASE/api/notifications"
  check "GET /api/recommendations"             200 -b "$COOKIE" "$BASE/api/recommendations"
  check "GET /api/trends/reddit"               200 -b "$COOKIE" "$BASE/api/trends/reddit"
  check "GET /api/trends/hackernews"           200 -b "$COOKIE" "$BASE/api/trends/hackernews"
  check "GET /api/ml/audience-clusters"        200 -b "$COOKIE" "$BASE/api/ml/audience-clusters"
else
  echo ""
  echo "(skipping auth'd endpoints — set COOKIE env var to include them)"
  echo "  To get your cookie: open DevTools → Application → Cookies → copy aim.sid value"
  echo "  Then run: COOKIE='aim.sid=YOUR_VALUE' bash scripts/smoke.sh"
fi

echo "---"
echo "PASS: $PASS · FAIL: $FAIL"
[ "$FAIL" -eq 0 ]
