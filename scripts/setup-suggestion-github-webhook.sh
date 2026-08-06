#!/usr/bin/env bash
# Seed Edge Function secrets + Vault secrets for notify_suggestion_insert trigger.
# Usage: scripts/setup-suggestion-github-webhook.sh [dev|prod]
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
: "${GITHUB_TOKEN:?Set GITHUB_TOKEN in .env.local}"

GITHUB_REPO="${GITHUB_REPO:-BrokenLinc/quacker}"
# Prod may use VITE_APP_URL / yowl.us. Dev must not inherit that — issue links would
# point at production while the suggestion only exists on quacker-dev.
if [[ "$TARGET" == "prod" ]]; then
  PUBLIC_APP_URL="${PUBLIC_APP_URL:-${VITE_APP_URL:-https://yowl.us}}"
else
  if [[ -n "${PUBLIC_APP_URL_DEV:-}" ]]; then
    PUBLIC_APP_URL="$PUBLIC_APP_URL_DEV"
  elif [[ -n "${PUBLIC_APP_URL:-}" && "${PUBLIC_APP_URL}" != "https://yowl.us" ]]; then
    : # explicit non-prod PUBLIC_APP_URL (may match a preview VITE_APP_URL)
  else
    echo "Set PUBLIC_APP_URL_DEV (or a non-prod PUBLIC_APP_URL) in .env.local for ${TARGET} suggestion detail links." >&2
    echo "(Do not reuse https://yowl.us — that is production. Preview VITE_APP_URL is fine if PUBLIC_APP_URL matches it.)" >&2
    exit 1
  fi
fi

if [[ -z "${SUGGESTION_GITHUB_WEBHOOK_SECRET:-}" ]]; then
  SUGGESTION_GITHUB_WEBHOOK_SECRET="$(openssl rand -hex 24)"
  echo "Generated SUGGESTION_GITHUB_WEBHOOK_SECRET — add to .env.local:"
  echo "SUGGESTION_GITHUB_WEBHOOK_SECRET=${SUGGESTION_GITHUB_WEBHOOK_SECRET}"
  if grep -q '^SUGGESTION_GITHUB_WEBHOOK_SECRET=' .env.local 2>/dev/null; then
    # Replace empty/stale assignment from .env.example copies — append would leave a blank key.
    SUGGESTION_GITHUB_WEBHOOK_SECRET="$SUGGESTION_GITHUB_WEBHOOK_SECRET" python3 -c '
import os, pathlib
path = pathlib.Path(".env.local")
secret = os.environ["SUGGESTION_GITHUB_WEBHOOK_SECRET"]
text = path.read_text()
lines = text.splitlines(keepends=True)
out = []
replaced = False
for line in lines:
  if line.startswith("SUGGESTION_GITHUB_WEBHOOK_SECRET=") and not replaced:
    nl = "\n" if line.endswith("\n") else ""
    out.append(f"SUGGESTION_GITHUB_WEBHOOK_SECRET={secret}{nl}")
    replaced = True
  else:
    out.append(line)
path.write_text("".join(out))
'
    echo "(updated SUGGESTION_GITHUB_WEBHOOK_SECRET in .env.local)"
  else
    printf '\nSUGGESTION_GITHUB_WEBHOOK_SECRET=%s\n' "$SUGGESTION_GITHUB_WEBHOOK_SECRET" >> .env.local
    echo "(appended to .env.local)"
  fi
fi

HOOK_URL="https://${REF}.supabase.co/functions/v1/suggestion-github-issue"

echo "==> Edge Function secrets on ${TARGET} (${REF})"
export GITHUB_TOKEN GITHUB_REPO PUBLIC_APP_URL SUGGESTION_GITHUB_WEBHOOK_SECRET
curl -sS -X POST "https://api.supabase.com/v1/projects/${REF}/secrets" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c 'import json,os; print(json.dumps([
    {"name":"GITHUB_TOKEN","value":os.environ["GITHUB_TOKEN"]},
    {"name":"GITHUB_REPO","value":os.environ["GITHUB_REPO"]},
    {"name":"PUBLIC_APP_URL","value":os.environ["PUBLIC_APP_URL"]},
    {"name":"SUGGESTION_GITHUB_WEBHOOK_SECRET","value":os.environ["SUGGESTION_GITHUB_WEBHOOK_SECRET"]},
  ]))')"
echo

echo "==> Vault secrets for DB trigger"
export HOOK_URL SUGGESTION_GITHUB_WEBHOOK_SECRET
curl -sS -X POST "https://api.supabase.com/v1/projects/${REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c '
import json, os
url = os.environ["HOOK_URL"]
secret = os.environ["SUGGESTION_GITHUB_WEBHOOK_SECRET"]
sql = """do $$
begin
  if not exists (select 1 from vault.secrets where name = '"'"'suggestion_github_webhook_url'"'"') then
    perform vault.create_secret(%r, '"'"'suggestion_github_webhook_url'"'"', '"'"'Edge suggestion-github-issue URL'"'"');
  else
    perform vault.update_secret(
      (select id from vault.secrets where name = '"'"'suggestion_github_webhook_url'"'"' limit 1),
      %r
    );
  end if;
  if not exists (select 1 from vault.secrets where name = '"'"'suggestion_github_webhook_secret'"'"') then
    perform vault.create_secret(%r, '"'"'suggestion_github_webhook_secret'"'"', '"'"'x-webhook-secret for suggestion GitHub'"'"');
  else
    perform vault.update_secret(
      (select id from vault.secrets where name = '"'"'suggestion_github_webhook_secret'"'"' limit 1),
      %r
    );
  end if;
end;
$$;""" % (url, url, secret, secret)
print(json.dumps({"query": sql}))
')"
echo

echo "==> Done for ${TARGET}"
echo "Deploy suggestion-github-issue + suggestion-export with --no-verify-jwt"
