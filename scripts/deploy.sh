#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load secrets for deploy (agent-only; not committed)
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${SUPABASE_PROJECT_ID:?Set SUPABASE_PROJECT_ID in .env.local}"

echo "==> Linking Supabase project"
supabase link --project-ref "$SUPABASE_PROJECT_ID"

echo "==> Pushing migrations"
supabase db push

if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  echo "==> Deploying to Vercel"
  vercel deploy --prod --token "$VERCEL_TOKEN"
else
  echo "==> Skipping Vercel deploy (VERCEL_TOKEN not set)"
fi

if [[ -n "${VITE_APP_URL:-}" ]]; then
  echo "==> Post-deploy smoke e2e"
  PLAYWRIGHT_BASE_URL="$VITE_APP_URL" yarn test:e2e --config=playwright.smoke.config.ts
fi

echo "==> Deploy complete"
