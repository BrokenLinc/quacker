/** Matches `surface.canvas` → gray.50 / gray.900 in ThemeProvider. */
export const CANVAS_LIGHT = '#FAF9FC';
export const CANVAS_DARK = '#221D33';

/** Pixels of height loss / offset treated as "keyboard open". */
export const KEYBOARD_OPEN_THRESHOLD_PX = 50;

export function canvasColorForMode(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? CANVAS_DARK : CANVAS_LIGHT;
}

/**
 * Visible viewport height for the app shell (keyboard-aware when VV exists).
 * Multiplies by `scale` so pinch-zoom does not shrink the shell.
 */
export function getVisibleViewportHeight(): number {
  const vv = window.visualViewport;
  if (!vv) return window.innerHeight;
  return vv.height * (vv.scale || 1);
}

/** iOS scrolls the visual viewport upward when the keyboard opens. */
export function getVisualViewportOffsetTop(): number {
  return window.visualViewport?.offsetTop ?? 0;
}

export function isKeyboardLikelyOpen(
  innerHeight = window.innerHeight,
  visibleHeight = getVisibleViewportHeight(),
  offsetTop = getVisualViewportOffsetTop()
): boolean {
  return (
    offsetTop > 0 || innerHeight - visibleHeight > KEYBOARD_OPEN_THRESHOLD_PX
  );
}

export function applyAppHeightVar(height = getVisibleViewportHeight()): void {
  if (height > 0) {
    document.documentElement.style.setProperty(
      '--app-height',
      `${Math.round(height)}px`
    );
  }
}

export function applyAppOffsetTopVar(
  offsetTop = getVisualViewportOffsetTop()
): void {
  document.documentElement.style.setProperty(
    '--app-offset-top',
    `${Math.round(offsetTop)}px`
  );
}

/** Sync both CSS vars used by the fixed app shell. */
export function applyVisualViewportVars(): void {
  applyAppHeightVar();
  applyAppOffsetTopVar();
}
