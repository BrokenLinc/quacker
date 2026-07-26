/** Matches `surface.canvas` → gray.50 / gray.900 in ThemeProvider. */
export const CANVAS_LIGHT = '#FAF9FC';
export const CANVAS_DARK = '#221D33';

export function canvasColorForMode(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? CANVAS_DARK : CANVAS_LIGHT;
}

/**
 * Visible viewport height for the fixed app shell. Uses `visualViewport.height`
 * directly (shrinks with the virtual keyboard) and falls back to
 * `window.innerHeight` when the API is unavailable.
 */
export function getVisibleViewportHeight(): number {
  const vv = window.visualViewport;
  if (!vv) return window.innerHeight;
  return vv.height;
}

/** Publish the visible height as `--app-height` for the fixed shell. */
export function applyAppHeightVar(height = getVisibleViewportHeight()): void {
  if (height > 0) {
    document.documentElement.style.setProperty(
      '--app-height',
      `${Math.round(height)}px`
    );
  }
}
