#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

PREVIEW_PORT="${PREVIEW_PORT:-4173}"
PREVIEW_PID=""

cleanup() {
  if [[ -n "$PREVIEW_PID" ]]; then
    kill "$PREVIEW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

is_local_supabase_url() {
  local url="${1:-}"
  [[ "$url" =~ ^https?://(127\.0\.0\.1|localhost)(:54321)?(/|$) ]]
}

supabase_reachable() {
  local url="${1:-}"
  local key="${2:-}"
  [[ -n "$url" && -n "$key" ]] && curl -sf "${url}/auth/v1/health" \
    -H "apikey: ${key}" \
    -H "Authorization: Bearer ${key}" \
    >/dev/null 2>&1
}

echo "==> lint + unit tests (parallel)"
FAIL=0
yarn lint &
LINT_PID=$!
yarn test &
UNIT_PID=$!
wait "$LINT_PID" || FAIL=1
wait "$UNIT_PID" || FAIL=1
[[ "$FAIL" -eq 0 ]]

echo "==> build"
export VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-http://127.0.0.1:54321}"
export VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}"
yarn build

if [[ "${SKIP_E2E:-}" == 1 ]]; then
  echo "==> e2e skipped (SKIP_E2E=1)"
  echo "==> verify passed"
  exit 0
fi

echo "==> preview server for e2e"
yarn preview --host 127.0.0.1 --port "$PREVIEW_PORT" &
PREVIEW_PID=$!
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PREVIEW_PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> e2e tests"
SB_URL="${VITE_SUPABASE_URL:-}"
SB_KEY="${VITE_SUPABASE_ANON_KEY:-}"
E2E_ARGS=(--reporter=list)

FULL_E2E=false
if [[ "${VERIFY_E2E:-}" == full ]]; then
  FULL_E2E=true
elif [[ "${CI:-}" == true ]] && supabase_reachable "$SB_URL" "$SB_KEY"; then
  FULL_E2E=true
elif is_local_supabase_url "$SB_URL" && supabase_reachable "$SB_URL" "$SB_KEY"; then
  FULL_E2E=true
fi

if [[ "$FULL_E2E" == true ]]; then
  echo "    Local Supabase or CI — running full e2e suite"
  PLAYWRIGHT_BASE_URL="http://127.0.0.1:${PREVIEW_PORT}" yarn test:e2e "${E2E_ARGS[@]}"
else
  echo "    Remote Supabase — running smoke e2e only (full suite in CI; VERIFY_E2E=full to override)"
  PLAYWRIGHT_BASE_URL="http://127.0.0.1:${PREVIEW_PORT}" yarn test:e2e tests/e2e/a11y-home.spec.ts "${E2E_ARGS[@]}"
fi

echo "==> verify passed"
