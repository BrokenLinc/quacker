#!/usr/bin/env bash
# Run the full Playwright suite against the local Supabase stack.
#
# `yarn verify` sources .env.local, which points at the *remote* dev project, so
# it can only run the smoke subset: the auth fixture seeds sessions with admin
# APIs and writes the session under a storage key derived from the Supabase URL.
# If the built app and the fixture disagree about that URL, every auth-dependent
# spec fails with a sign-in screen. This script pins both to local Supabase.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--no-deprecation"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found — brew install supabase/tap/supabase" >&2
  exit 1
fi

# API_URL / ANON_KEY / SERVICE_ROLE_KEY, straight from the running stack.
if ! STATUS_ENV="$(supabase status -o env 2>/dev/null)"; then
  echo "Local Supabase is not running — start it with \"supabase start\"" >&2
  exit 1
fi
set -a
eval "$STATUS_ENV"
set +a

export VITE_SUPABASE_URL="$API_URL"
export VITE_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

FUNCTIONS_ENV="$ROOT/supabase/functions/.env"
if [[ ! -f "$FUNCTIONS_ENV" ]]; then
  cp "$ROOT/supabase/functions/.env.example" "$FUNCTIONS_ENV"
  echo "Created $FUNCTIONS_ENV — restart local Supabase if auth OTP e2e fails (supabase stop && supabase start)." >&2
fi

PREVIEW_PORT="${PREVIEW_PORT:-4173}"
PREVIEW_PID=""
cleanup() {
  if [[ -n "$PREVIEW_PID" ]]; then
    kill "$PREVIEW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "==> build against local Supabase ($VITE_SUPABASE_URL)"
yarn build

echo "==> preview server"
yarn preview --host 127.0.0.1 --port "$PREVIEW_PORT" &
PREVIEW_PID=$!
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PREVIEW_PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> full e2e suite"
PLAYWRIGHT_BASE_URL="http://127.0.0.1:${PREVIEW_PORT}" \
  yarn test:e2e --reporter=list "$@"
