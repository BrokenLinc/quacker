#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PREVIEW_PORT="${PREVIEW_PORT:-4173}"
PREVIEW_PID=""

cleanup() {
  if [[ -n "$PREVIEW_PID" ]]; then
    kill "$PREVIEW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "==> lint"
yarn lint

echo "==> build"
export VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-http://127.0.0.1:54321}"
export VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}"
yarn build

echo "==> unit tests"
yarn test

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
if curl -sf "http://127.0.0.1:54321/rest/v1/" -H "apikey: $VITE_SUPABASE_ANON_KEY" >/dev/null 2>&1; then
  PLAYWRIGHT_BASE_URL="http://127.0.0.1:${PREVIEW_PORT}" yarn test:e2e
else
  echo "    Supabase not running — running a11y-home only (full suite in CI)"
  PLAYWRIGHT_BASE_URL="http://127.0.0.1:${PREVIEW_PORT}" yarn test:e2e tests/e2e/a11y-home.spec.ts
fi

echo "==> verify passed"
