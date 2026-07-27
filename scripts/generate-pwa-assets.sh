#!/usr/bin/env bash
# Regenerate PWA icons, iOS splash screens, favicon.ico, and og-image.png
# from public/icon.svg, icon-maskable.svg, and yowl-logo.svg.
# Requires ImageMagick (`magick`).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v magick >/dev/null 2>&1; then
  echo "error: ImageMagick \`magick\` not found (brew install imagemagick)" >&2
  exit 1
fi

PUBLIC="$ROOT/public"
ICONS="$PUBLIC/icons"
SPLASH="$PUBLIC/splash"
ICON_SVG="$PUBLIC/icon.svg"
MASK_SVG="$PUBLIC/icon-maskable.svg"
LOGO_SVG="$PUBLIC/yowl-logo.svg"

LIGHT="#FAF9FC"
DARK="#221D33"

mkdir -p "$ICONS" "$SPLASH"

echo "==> app icons"
magick -background none "$ICON_SVG" -resize 192x192 "$ICONS/icon-192.png"
magick -background none "$ICON_SVG" -resize 512x512 "$ICONS/icon-512.png"
magick -background none "$MASK_SVG" -resize 512x512 "$ICONS/icon-maskable-512.png"
magick -background none "$ICON_SVG" -resize 180x180 "$PUBLIC/apple-touch-icon.png"

echo "==> favicon.ico"
magick -background none "$ICON_SVG" -define icon:auto-resize=16,32,48 \
  "$PUBLIC/favicon.ico"

echo "==> og-image.png (1200x630)"
magick -size 1200x630 "xc:${LIGHT}" \
  \( -background none "$LOGO_SVG" -resize 480x \) \
  -gravity center -compose over -composite \
  "$PUBLIC/og-image.png"

# name|px_w|px_h|css_w|css_h|dpr
# Portrait splash targets used by apple-touch-startup-image media queries.
SPLASH_SPECS=(
  "iphone-15-pro-max|1290|2796|430|932|3"
  "iphone-15-pro|1179|2556|393|852|3"
  "iphone-14-plus|1284|2778|428|926|3"
  "iphone-14|1170|2532|390|844|3"
  "iphone-x|1125|2436|375|812|3"
  "iphone-xs-max|1242|2688|414|896|3"
  "iphone-xr|828|1792|414|896|2"
  "iphone-8-plus|1242|2208|414|736|3"
  "iphone-8|750|1334|375|667|2"
  "ipad-pro-129|2048|2732|1024|1366|2"
  "ipad-pro-11|1668|2388|834|1194|2"
  "ipad-air|1640|2360|820|1180|2"
  "ipad-mini|1536|2048|768|1024|2"
)

make_splash() {
  local name="$1" w="$2" h="$3" bg="$4" out="$5"
  local shorter icon_px
  if (( w < h )); then shorter=$w; else shorter=$h; fi
  icon_px=$(( shorter * 22 / 100 ))
  magick -size "${w}x${h}" "xc:${bg}" \
    \( "$ICONS/icon-512.png" -resize "${icon_px}x${icon_px}" \) \
    -gravity center -compose over -composite \
    "$out"
}

echo "==> splash screens (light + dark)"
for spec in "${SPLASH_SPECS[@]}"; do
  IFS='|' read -r name w h _css_w _css_h _dpr <<<"$spec"
  make_splash "$name" "$w" "$h" "$LIGHT" "$SPLASH/${name}-light.png"
  make_splash "$name" "$w" "$h" "$DARK" "$SPLASH/${name}-dark.png"
  echo "  ${name} ${w}x${h}"
done

echo "==> done"
echo "Wire apple-touch-startup-image links in index.html if device list changed."
