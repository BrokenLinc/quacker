#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

transforms=(
  accordion alert alertdialog avatar breadcrumb button card checkbox
  collapsible divider drawer editable form-control icon-button icons image
  link list menu modal number-input pin-input popover portal progress
  radio-group range-slider select show-hide skeleton slider spinner stack
  stats steps table tabs tag tooltip transitions
  as-props boolean-props casing-props color-palette color-transform disclosure
  gradient-props nested-styles spacing-props stack-props style-props
  circular-progress color-mode forwardref hooks nextjs-package stack-divider
  storybook style-config theme-tokens system-props
)

for t in "${transforms[@]}"; do
  echo "=== $t ==="
  ./node_modules/.bin/chakra-codemod transform -f "$t" src 2>&1 | tail -3 || true
done
