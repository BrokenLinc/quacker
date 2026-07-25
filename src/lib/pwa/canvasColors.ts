/** Matches `surface.canvas` → gray.50 / gray.900 in ThemeProvider. */
export const CANVAS_LIGHT = '#FAF9FC';
export const CANVAS_DARK = '#221D33';

export function canvasColorForMode(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? CANVAS_DARK : CANVAS_LIGHT;
}

/** Visible viewport height for the app shell (keyboard-aware when VV exists). */
export function getVisibleViewportHeight(): number {
  const vv = window.visualViewport;
  return vv?.height ?? window.innerHeight;
}

export function applyAppHeightVar(height = getVisibleViewportHeight()): void {
  if (height > 0) {
    document.documentElement.style.setProperty(
      '--app-height',
      `${Math.round(height)}px`
    );
  }
}
