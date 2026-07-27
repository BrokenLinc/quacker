#!/usr/bin/env bash
# Check Android emulator / adb readiness for Maestro Android Chrome / PWA flows.
# Usage: scripts/android-emulator-ready.sh
# Exit 0 if adb sees at least one device/emulator in "device" state.
set -euo pipefail

export PATH="${PATH:+$PATH:}${ANDROID_HOME:+$ANDROID_HOME/platform-tools:}${ANDROID_SDK_ROOT:+$ANDROID_SDK_ROOT/platform-tools:}$HOME/Library/Android/sdk/platform-tools:$HOME/Android/Sdk/platform-tools:/opt/homebrew/bin:/usr/local/bin"

ok() { printf '  ✓ %s\n' "$1"; }
warn() { printf '  ⚠ %s\n' "$1"; }
fail() { printf '  ✗ %s\n' "$1"; }

echo "==> Android emulator readiness"

if ! command -v adb >/dev/null; then
  fail "adb not found"
  echo "    Install Android Studio or SDK platform-tools, then ensure adb is on PATH."
  echo "    Typical: ~/Library/Android/sdk/platform-tools"
  exit 1
fi
ok "adb $(adb version 2>/dev/null | head -1)"

DEVICES="$(adb devices 2>/dev/null | awk 'NR>1 && $2=="device" { print $1 }')"
if [[ -z "$DEVICES" ]]; then
  fail "No device/emulator online"
  if command -v emulator >/dev/null; then
    echo "    Available AVDs:"
    emulator -list-avds 2>/dev/null | sed 's/^/      /' || true
    echo "    Boot one: emulator -avd <name> &"
  else
    warn "emulator binary not on PATH — open Android Studio → Device Manager"
  fi
  echo "    Need a Google Play system image so Chrome (com.android.chrome) is present."
  exit 1
fi

while IFS= read -r serial; do
  [[ -z "$serial" ]] && continue
  ok "device online: $serial"
done <<< "$DEVICES"

if adb shell pm path com.android.chrome >/dev/null 2>&1; then
  ok "Chrome package com.android.chrome installed"
else
  warn "com.android.chrome not found — use a Play Store AVD (not plain AOSP)"
fi

echo ""
echo "Hints:"
echo "  • yarn test:maestro:android  (runner adb-reverses Vite/preview ports → localhost)"
echo "  • PWA install: yarn test:maestro:android:pwa (Install Hork banner; clearState resets dismiss)"
echo "  • Manual reverse: adb reverse tcp:5174 tcp:5174"
exit 0
