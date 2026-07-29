#!/usr/bin/env bash
# Seed Edge Function secrets + Vault secrets for notify_message_insert trigger.
# Usage: scripts/setup-notify-webhook.sh [dev|prod]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

TARGET="${1:-dev}"
if [[ "$TARGET" == "prod" ]]; then
  REF="${SUPABASE_PROJECT_ID_PROD:?Set SUPABASE_PROJECT_ID_PROD}"
else
  REF="${SUPABASE_PROJECT_ID:?Set SUPABASE_PROJECT_ID}"
fi

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN}"
: "${VAPID_PUBLIC_KEY:?Generate VAPID keys first}"
: "${VAPID_PRIVATE_KEY:?Generate VAPID keys first}"

if [[ -z "${NOTIFY_WEBHOOK_SECRET:-}" ]]; then
  NOTIFY_WEBHOOK_SECRET="$(openssl rand -hex 24)"
  echo "Generated NOTIFY_WEBHOOK_SECRET — add to .env.local:"
  echo "NOTIFY_WEBHOOK_SECRET=${NOTIFY_WEBHOOK_SECRET}"
fi

HOOK_URL="https://${REF}.supabase.co/functions/v1/notify-new-message"

echo "==> Edge Function secrets on ${TARGET} (${REF})"
curl -sS -X POST "https://api.supabase.com/v1/projects/${REF}/secrets" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c 'import json,os; print(json.dumps([{"name":"VAPID_PUBLIC_KEY","value":os.environ["VAPID_PUBLIC_KEY"]},{"name":"VAPID_PRIVATE_KEY","value":os.environ["VAPID_PRIVATE_KEY"]},{"name":"NOTIFY_WEBHOOK_SECRET","value":os.environ["NOTIFY_WEBHOOK_SECRET"]}]))')"
echo

echo "==> Vault secrets for DB trigger"
export HOOK_URL NOTIFY_WEBHOOK_SECRET
curl -sS -X POST "https://api.supabase.com/v1/projects/${REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c '
import json, os
url = os.environ["HOOK_URL"]
secret = os.environ["NOTIFY_WEBHOOK_SECRET"]
sql = """do $$
begin
  if not exists (select 1 from vault.secrets where name = '"'"'notify_webhook_url'"'"') then
    perform vault.create_secret(%r, '"'"'notify_webhook_url'"'"', '"'"'Edge notify-new-message URL'"'"');
  end if;
  if not exists (select 1 from vault.secrets where name = '"'"'notify_webhook_secret'"'"') then
    perform vault.create_secret(%r, '"'"'notify_webhook_secret'"'"', '"'"'x-webhook-secret for notify'"'"');
  end if;
end;
$$;""" % (url, secret)
print(json.dumps({"query": sql}))
')"
echo

echo "==> Done for ${TARGET}"
echo "Ensure VITE_VAPID_PUBLIC_KEY matches VAPID_PUBLIC_KEY; yarn sync:vercel-env"
