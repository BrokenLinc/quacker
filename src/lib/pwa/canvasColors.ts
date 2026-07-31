import { isStandaloneDisplay } from './standalone';

/** Matches `surface.canvas` → gray.50 / gray.900 in ThemeProvider. */
export const CANVAS_LIGHT = '#FAF9FC';
export const CANVAS_DARK = '#221D33';

/**
 * Matches `surface.raised` → white / gray.800.
 * Used for `html`/`body` (and theme-color) so iOS Safari’s keyboard accessory
 * bar / overscroll match composer + header chrome — those UA chrome strips
 * sample the document background, not `#root`.
 */
export const RAISED_LIGHT = '#FFFFFF';
export const RAISED_DARK = '#302A44';

/** Layout vs visual height delta above this ⇒ candidate soft keyboard. */
export const KEYBOARD_OPEN_THRESHOLD_PX = 120;

export const COMPOSER_PADDING_CLOSED =
  'calc(0.75rem + env(safe-area-inset-bottom, 0px))';

export function canvasColorForMode(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? CANVAS_DARK : CANVAS_LIGHT;
}

export function raisedColorForMode(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? RAISED_DARK : RAISED_LIGHT;
}

/**
 * Visible viewport height while the soft keyboard is open. Uses
 * `visualViewport.height` (shrinks with the keyboard); falls back to
 * `window.innerHeight`.
 */
export function getVisibleViewportHeight(): number {
  const vv = window.visualViewport;
  if (!vv) return window.innerHeight;
  return vv.height;
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || typeof el !== 'object') return false;
  const node = el as { tagName?: string; isContentEditable?: boolean };
  const tag = node.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return Boolean(node.isContentEditable);
}

/**
 * Soft keyboard heuristic for iOS Safari / standalone PWA.
 *
 * Require both a large VV shrink **and** a focused editable. Standalone PWAs
 * often report `innerHeight - visualViewport.height > threshold` even with the
 * keyboard closed.
 */
export function isVirtualKeyboardOpen(): boolean {
  const vv = window.visualViewport;
  if (!vv) return false;
  if (window.innerHeight - vv.height <= KEYBOARD_OPEN_THRESHOLD_PX) return false;
  return isEditableTarget(document.activeElement);
}

/**
 * Closed keyboard: fill the real screen. In iOS standalone, `position:fixed;
 * bottom:0` (and dvh / fill-available) stop at the lying viewport — shorter than
 * `screen.height` — leaving a canvas strip under every page (WebKit 254868).
 * Classic `100vh` includes that band; composer pads safe-area once inside it.
 */
function resetRootToLayoutFill(root: HTMLElement | null): void {
  const standalone = isStandaloneDisplay();
  if (standalone) {
    document.documentElement.classList.add('standalone');
  }

  if (root) {
    if (standalone) {
      // Re-assert after keyboard-open overrides (inline top/height).
      root.style.top = '0px';
      root.style.bottom = 'auto';
      root.style.height = '100vh';
    } else {
      root.style.top = '';
      root.style.bottom = '';
      root.style.height = '';
    }
  }

  // Prefer real painted height when standalone 100vh fills past lying innerHeight.
  const appHeight = standalone
    ? `${Math.max(window.innerHeight, window.screen.height)}px`
    : `${window.innerHeight}px`;
  document.documentElement.style.setProperty('--app-height', appHeight);
  document.documentElement.style.setProperty(
    '--app-composer-pb',
    COMPOSER_PADDING_CLOSED
  );
}

/**
 * Publish CSS vars / `#root` geometry for the fixed shell.
 *
 * Keyboard closed: stylesheet / `100vh` fill (standalone). Keyboard open:
 * `visualViewport` top+height, `--app-composer-pb: 0`.
 */
export function applyAppHeightVar(height = getVisibleViewportHeight()): void {
  const vv = window.visualViewport;
  const keyboardOpen = isVirtualKeyboardOpen();
  const root = document.getElementById('root');

  if (!keyboardOpen) {
    resetRootToLayoutFill(root);
    return;
  }

  const offsetPx = Math.round(vv?.offsetTop ?? 0);
  const heightPx = Math.round(height);

  document.documentElement.style.setProperty(
    '--app-height',
    heightPx > 0 ? `${heightPx}px` : '100dvh'
  );
  document.documentElement.style.setProperty('--app-composer-pb', '0px');

  if (root) {
    root.style.top = `${offsetPx}px`;
    root.style.bottom = 'auto';
    if (heightPx > 0) root.style.height = `${heightPx}px`;
  }
}
