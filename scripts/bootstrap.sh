#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--no-deprecation"
mkdir -p .yarn-global

echo "==> Installing dependencies"
yarn install --frozen-lockfile 2>/dev/null || yarn install

if [[ ! -f .env.local ]]; then
  echo "==> Creating .env.local from .env.example"
  cp .env.example .env.local
  echo "    Fill in Supabase values in .env.local before connecting to cloud."
fi

if command -v supabase &>/dev/null; then
  echo "==> Starting local Supabase (if not already running)"
  supabase start 2>/dev/null || true
else
  echo "==> supabase CLI not found — install via: brew install supabase/tap/supabase"
  echo "    Or enable the Supabase Cursor Plugin (see docs/system-requirements.md)"
fi

echo "==> Checking system requirements"
scripts/check-requirements.sh || true

echo "==> Bootstrap complete. Run: yarn dev"
