#!/usr/bin/env bash
# Run Maestro iOS Safari / Android Chrome / PWA flows with JDK PATH, APP_ID, and APP_URL resolved.
# Usage:
#   yarn test:maestro                         # maestro/ios-safari-login.yaml
#   yarn test:maestro:android                 # maestro/android-chrome-login.yaml
#   yarn test:maestro:android:keyboard
#   APP_URL=http://… yarn test:maestro        # override URL
#   MAESTRO_PORT=5173 yarn test:maestro       # prefer a specific Vite/preview port when probing
#   MAESTRO_PLATFORM=android yarn test:maestro maestro/…
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

# Android SDK platform-tools (adb) — common macOS locations.
for sdk_bin in \
  "${ANDROID_HOME:+$ANDROID_HOME/platform-tools}" \
  "${ANDROID_SDK_ROOT:+$ANDROID_SDK_ROOT/platform-tools}" \
  "$HOME/Library/Android/sdk/platform-tools" \
  "$HOME/Android/Sdk/platform-tools"
do
  if [[ -n "$sdk_bin" && -d "$sdk_bin" ]]; then
    export PATH="$sdk_bin:$PATH"
    break
  fi
done

if ! command -v maestro >/dev/null; then
  echo "maestro not found. Install: brew tap mobile-dev-inc/tap && brew install mobile-dev-inc/tap/maestro" >&2
  exit 1
fi

if ! command -v java >/dev/null; then
  echo "Java not found (Maestro needs JDK 17+). Install: brew install openjdk@17" >&2
  exit 1
fi

detect_platform() {
  if [[ -n "${MAESTRO_PLATFORM:-}" ]]; then
    echo "$MAESTRO_PLATFORM"
    return
  fi
  case "$FLOW" in
    *android*|*/android-*)
      echo "android"
      ;;
    *)
      echo "ios"
      ;;
  esac
}

PLATFORM="$(detect_platform)"

if [[ "$PLATFORM" == "android" ]]; then
  APP_ID="${APP_ID:-com.android.chrome}"
else
  APP_ID="${APP_ID:-com.apple.mobilesafari}"
fi

candidate_ports() {
  local ports=()
  if [[ -n "${MAESTRO_PORT:-}" ]]; then
    ports+=("$MAESTRO_PORT")
  fi
  ports+=(5174 5173 4173)
  printf '%s\n' "${ports[@]}"
}

host_port_up() {
  local port="$1"
  curl -sf -o /dev/null --connect-timeout 1 "http://127.0.0.1:${port}/"
}

adb_device_online() {
  command -v adb >/dev/null || return 1
  adb devices 2>/dev/null | awk 'NR>1 && $2=="device" { found=1 } END { exit found?0:1 }'
}

resolve_app_url_ios() {
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

  local port
  while IFS= read -r port; do
    if curl -sf -o /dev/null --connect-timeout 1 "http://${host}:${port}/"; then
      echo "http://${host}:${port}"
      return
    fi
  done < <(candidate_ports)

  echo "No Vite/preview server reachable on ${host} ports $(candidate_ports | tr '\n' ' ')." >&2
  echo "Start one with: yarn dev -- --host 0.0.0.0 --port 5174" >&2
  echo "Or set APP_URL explicitly." >&2
  exit 1
}

resolve_app_url_android() {
  if [[ -n "${APP_URL:-}" ]]; then
    echo "$APP_URL"
    return
  fi

  if ! command -v adb >/dev/null; then
    echo "adb not found (needed for Android Maestro). Install Android SDK platform-tools." >&2
    echo "Or set APP_URL=http://10.0.2.2:<port> (emulator) / http://<lan-ip>:<port> (device)." >&2
    exit 1
  fi

  if ! adb_device_online; then
    echo "No Android device/emulator online (adb devices)." >&2
    echo "Boot a Play Store AVD, then retry. See scripts/android-emulator-ready.sh" >&2
    exit 1
  fi

  local port
  local found_port=""
  while IFS= read -r port; do
    if host_port_up "$port"; then
      found_port="$port"
      break
    fi
  done < <(candidate_ports)

  if [[ -z "$found_port" ]]; then
    echo "No Vite/preview server reachable on 127.0.0.1 ports $(candidate_ports | tr '\n' ' ')." >&2
    echo "Start one with: yarn dev -- --host 0.0.0.0 --port 5174" >&2
    echo "For PWA install flows prefer: yarn build && yarn preview --host 127.0.0.1 --port 4173" >&2
    echo "Or set APP_URL explicitly." >&2
    exit 1
  fi

  # Prefer adb reverse + localhost so Chrome treats the origin as a secure context.
  if adb reverse "tcp:${found_port}" "tcp:${found_port}" >/dev/null 2>&1; then
    echo "http://localhost:${found_port}"
    return
  fi

  echo "adb reverse failed; falling back to http://10.0.2.2:${found_port} (not a secure context)." >&2
  echo "http://10.0.2.2:${found_port}"
}

if [[ "$PLATFORM" == "android" ]]; then
  APP_URL="$(resolve_app_url_android)"
else
  APP_URL="$(resolve_app_url_ios)"
fi
export APP_URL
export APP_ID

echo "==> Maestro flow: $FLOW"
echo "==> Platform: $PLATFORM"
echo "==> APP_ID=$APP_ID"
echo "==> APP_URL=$APP_URL"
exec maestro test "$FLOW" -e "APP_URL=$APP_URL" -e "APP_ID=$APP_ID" "${@:2}"
