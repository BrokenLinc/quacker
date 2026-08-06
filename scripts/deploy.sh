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

: "${SUPABASE_PROJECT_ID_PROD:?Set SUPABASE_PROJECT_ID_PROD in .env.local}"
: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN in .env.local}"
: "${SUPABASE_DB_PASSWORD_PROD:?Set SUPABASE_DB_PASSWORD_PROD in .env.local}"

echo "==> Linking Supabase production project"
supabase link --project-ref "$SUPABASE_PROJECT_ID_PROD" --password "$SUPABASE_DB_PASSWORD_PROD" --yes

echo "==> Pushing migrations to production"
SUPABASE_DB_PASSWORD="$SUPABASE_DB_PASSWORD_PROD" supabase db push --yes

if [[ -n "${TWILIO_ACCOUNT_SID:-}" && -n "${TWILIO_AUTH_TOKEN:-}" && -n "${TWILIO_VERIFY_SERVICE_SID:-}" ]]; then
  echo "==> Setting Twilio Edge Function secrets (production)"
  # Do NOT set AUTH_ALLOW_TEST_OTP on production — local-only test OTP flag.
  supabase secrets set --project-ref "$SUPABASE_PROJECT_ID_PROD" \
    TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID" \
    TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN" \
    TWILIO_VERIFY_SERVICE_SID="$TWILIO_VERIFY_SERVICE_SID"

  echo "==> Deploying Edge Functions (production)"
  supabase functions deploy auth-send-otp auth-verify-otp notify-new-message \
    suggestion-export suggestion-github-issue \
    --project-ref "$SUPABASE_PROJECT_ID_PROD" \
    --no-verify-jwt
else
  echo "==> Skipping auth Edge Functions deploy (TWILIO_* not set in .env.local)"
  echo "==> Deploying suggestion + notify Edge Functions (production)"
  supabase functions deploy notify-new-message suggestion-export suggestion-github-issue \
    --project-ref "$SUPABASE_PROJECT_ID_PROD" \
    --no-verify-jwt
fi

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "==> Suggestion GitHub webhook secrets (production)"
  scripts/setup-suggestion-github-webhook.sh prod
fi

if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  echo "==> Deploying to Vercel production"
  vercel deploy --prod --token "$VERCEL_TOKEN"
else
  echo "==> Skipping Vercel deploy (VERCEL_TOKEN not set)"
fi

if [[ -n "${VITE_APP_URL:-}" ]]; then
  echo "==> Post-deploy smoke e2e"
  PLAYWRIGHT_BASE_URL="$VITE_APP_URL" yarn test:e2e --config=playwright.smoke.config.ts
fi

echo "==> Deploy complete (production)"
