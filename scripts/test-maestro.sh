#!/usr/bin/env bash
# Run Maestro iOS Safari / PWA flows with JDK PATH and LAN APP_URL resolved.
# Usage:
#   yarn test:maestro              # maestro/ios-safari-login.yaml
#   yarn test:maestro:pwa          # maestro/ios-pwa-install-login.yaml
#   APP_URL=http://… yarn test:maestro   # override URL
#   MAESTRO_PORT=5173 yarn test:maestro  # prefer a specific Vite port when probing
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FLOW="${1:-maestro/ios-safari-login.yaml}"

# Homebrew OpenJDK is keg-only — put it on PATH so Maestro can find Java.
for jdk in \
  /opt/homebrew/opt/openjdk@17/bin \
  /usr/local/opt/openjdk@17/bin \
  /opt/homebrew/opt/openjdk/bin \
  /usr/local/opt/openjdk/bin
do
  if [[ -d "$jdk" ]]; then
    export PATH="$jdk:$PATH"
    break
  fi
done
export PATH="${PATH:+$PATH:}$HOME/.maestro/bin:/opt/homebrew/bin:/usr/local/bin"

if ! command -v maestro >/dev/null; then
  echo "maestro not found. Install: brew tap mobile-dev-inc/tap && brew install mobile-dev-inc/tap/maestro" >&2
  exit 1
fi

if ! command -v java >/dev/null; then
  echo "Java not found (Maestro needs JDK 17+). Install: brew install openjdk@17" >&2
  exit 1
fi

resolve_app_url() {
  if [[ -n "${APP_URL:-}" ]]; then
    echo "$APP_URL"
    return
  fi

  local host=""
  host="$(ipconfig getifaddr en0 2>/dev/null || true)"
  if [[ -z "$host" ]]; then
    host="$(ipconfig getifaddr en1 2>/dev/null || true)"
  fi
  if [[ -z "$host" ]]; then
    echo "Could not detect LAN IP (en0/en1). Set APP_URL=http://<host-ip>:<port> and retry." >&2
    echo "Vite must listen on the LAN: yarn dev -- --host 0.0.0.0" >&2
    exit 1
  fi

  local ports=()
  if [[ -n "${MAESTRO_PORT:-}" ]]; then
    ports+=("$MAESTRO_PORT")
  fi
  ports+=(5174 5173 4173)

  local port
  for port in "${ports[@]}"; do
    if curl -sf -o /dev/null --connect-timeout 1 "http://${host}:${port}/"; then
      echo "http://${host}:${port}"
      return
    fi
  done

  echo "No Vite/preview server reachable on ${host} ports ${ports[*]}." >&2
  echo "Start one with: yarn dev -- --host 0.0.0.0 --port 5174" >&2
  echo "Or set APP_URL explicitly." >&2
  exit 1
}

APP_URL="$(resolve_app_url)"
export APP_URL

echo "==> Maestro flow: $FLOW"
echo "==> APP_URL=$APP_URL"
exec maestro test "$FLOW" -e "APP_URL=$APP_URL" "${@:2}"
