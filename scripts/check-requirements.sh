#!/usr/bin/env bash
# Agent- and human-readable system requirements check for Quacker.
# Exit 0 when all required items are present; 1 if any required item is missing.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REQUIRED_MISSING=0
RECOMMENDED_MISSING=0

ok() { echo "  ✓ $1"; }
miss() { echo "  ✗ $1"; echo "    → $2"; REQUIRED_MISSING=$((REQUIRED_MISSING + 1)); }
warn() { echo "  ⚠ $1"; echo "    → $2"; RECOMMENDED_MISSING=$((RECOMMENDED_MISSING + 1)); }
info() { echo "  · $1"; }

have_cmd() { command -v "$1" &>/dev/null; }

echo "==> Quacker system requirements"
echo

echo "Core (required)"
if have_cmd node; then
  ok "Node.js $(node -v)"
else
  miss "Node.js not found" "Install Node 22 LTS: https://nodejs.org/ (CI uses 22)"
fi

if have_cmd yarn; then
  ok "Yarn $(yarn -v 2>/dev/null | head -1)"
else
  miss "Yarn not found" "npm install -g yarn"
fi

if have_cmd git; then
  ok "Git $(git --version | sed 's/git version //')"
else
  miss "Git not found" "Install Xcode CLT or https://git-scm.com/"
fi

echo
echo "CLI tools (required for full agent autonomy)"
if have_cmd supabase; then
  ok "Supabase CLI $(supabase --version 2>/dev/null | head -1)"
else
  warn "Supabase CLI not found" "brew install supabase/tap/supabase — or use Supabase Cursor Plugin MCP for remote ops"
fi

if have_cmd gh; then
  if gh auth status &>/dev/null; then
    ok "GitHub CLI (authenticated)"
  else
    warn "GitHub CLI not authenticated" "Run: gh auth login"
  fi
else
  warn "GitHub CLI (gh) not found" "brew install gh && gh auth login — needed for gh secret set"
fi

if have_cmd vercel; then
  ok "Vercel CLI $(vercel --version 2>/dev/null | head -1)"
elif have_cmd npx; then
  info "Vercel CLI not global — agent can use: npx vercel"
else
  warn "Vercel CLI unavailable" "npm i -g vercel — or use Vercel Cursor Plugin MCP"
fi

echo
echo "Local e2e (required on developer/agent machine)"
if [[ "$(uname -s)" == "Darwin" ]] && [[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
  ok "Google Chrome $(/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version 2>/dev/null | sed 's/Google Chrome //')"
else
  if have_cmd google-chrome || have_cmd chromium || have_cmd chromium-browser; then
    ok "Chromium-based browser found"
  else
    warn "Google Chrome not found" "Install Chrome — Playwright uses channel: 'chrome' locally (see .cursor/rules/playwright-chrome.mdc)"
  fi
fi

echo
echo "Local stack (optional — only for supabase start)"
if have_cmd docker && docker info &>/dev/null 2>&1; then
  ok "Docker running (local supabase start available)"
elif have_cmd docker; then
  info "Docker installed but not running — optional; only needed for local supabase start"
else
  info "Docker not installed — optional; use remote Supabase + Supabase MCP (see docs/system-requirements.md)"
fi

echo
echo "Repository (.gitignore)"
for path in supabase/.temp supabase/.branches; do
  if git check-ignore -q "${path}/probe" 2>/dev/null; then
    ok "${path}/ gitignored"
  else
    warn "${path}/ not gitignored" "Add Supabase CLI paths to .gitignore — see .cursor/rules/supabase.mdc"
  fi
done

echo
echo "Secrets (.env.local)"
if [[ ! -f .env.local ]]; then
  miss ".env.local missing" "cp .env.example .env.local and fill values — see docs/prerequisites.md"
else
  ok ".env.local exists"
  # shellcheck disable=SC1091
  set -a && source .env.local && set +a
  for var in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_PROJECT_ID SUPABASE_ACCESS_TOKEN; do
    if [[ -n "${!var:-}" ]]; then
      ok "$var set (dev)"
    else
      miss "$var not set in .env.local" "See docs/environments.md"
    fi
  done
  for var in VITE_SUPABASE_URL_PROD VITE_SUPABASE_ANON_KEY_PROD SUPABASE_SERVICE_ROLE_KEY_PROD SUPABASE_PROJECT_ID_PROD SUPABASE_DB_PASSWORD_PROD VITE_APP_URL; do
    if [[ -n "${!var:-}" ]]; then
      ok "$var set (prod)"
    else
      warn "$var not set" "Needed for yarn deploy — see docs/environments.md"
    fi
  done
  for var in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
    if [[ -n "${!var:-}" ]]; then
      ok "$var set"
    else
      warn "$var not set" "Needed for deploy — see docs/environments.md"
    fi
  done
  for var in TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_VERIFY_SERVICE_SID; do
    if [[ -n "${!var:-}" ]]; then
      ok "$var set (Twilio Verify)"
    else
      warn "$var not set" "Needed for SMS auth Edge Functions — see .env.example"
    fi
  done
fi

echo
echo "Cursor MCP plugins (agent: verify with GetMcpTools)"
echo "  · Supabase: server plugin-supabase-supabase — apply_migration, generate_typescript_types, get_advisors"
echo "  · Vercel:   server plugin-vercel-vercel — deploy, env, project ops (or fall back to vercel CLI + VERCEL_TOKEN)"
echo "  · If serverStatus is needsAuth: call mcp_auth for that server, then retry"
echo "  · Full list: docs/system-requirements.md"

echo
if [[ $REQUIRED_MISSING -gt 0 ]]; then
  echo "==> Result: $REQUIRED_MISSING required item(s) missing"
  exit 1
fi

if [[ $RECOMMENDED_MISSING -gt 0 ]]; then
  echo "==> Result: core OK; $RECOMMENDED_MISSING recommended item(s) missing (agent may be blocked on deploy/CI secrets/local e2e)"
  exit 0
fi

echo "==> Result: all checks passed"
exit 0
