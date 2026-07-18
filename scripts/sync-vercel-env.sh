#!/usr/bin/env bash
# Sync Vercel env vars for Preview (dev Supabase) and Production (prod Supabase).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — see .env.example"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

: "${VERCEL_TOKEN:?Set VERCEL_TOKEN in .env.local}"
: "${VITE_SUPABASE_URL_PROD:?Set VITE_SUPABASE_URL_PROD in .env.local}"
: "${VITE_SUPABASE_ANON_KEY_PROD:?Set VITE_SUPABASE_ANON_KEY_PROD in .env.local}"
: "${VITE_APP_URL:?Set VITE_APP_URL in .env.local}"

sync_env() {
  local name="$1"
  local value="$2"
  local target="$3"
  printf '%s' "$value" | npx vercel env add "$name" "$target" --force --token "$VERCEL_TOKEN"
}

echo "==> Vercel Preview (dev Supabase)"
sync_env VITE_SUPABASE_URL "$VITE_SUPABASE_URL" preview
sync_env VITE_SUPABASE_ANON_KEY "$VITE_SUPABASE_ANON_KEY" preview

echo "==> Vercel Production (prod Supabase)"
sync_env VITE_SUPABASE_URL "$VITE_SUPABASE_URL_PROD" production
sync_env VITE_SUPABASE_ANON_KEY "$VITE_SUPABASE_ANON_KEY_PROD" production
sync_env VITE_APP_URL "$VITE_APP_URL" production

echo "==> Vercel env sync complete"
