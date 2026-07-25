import React from 'react';

import { applyAppHeightVar } from './canvasColors';

/**
 * Keeps CSS `--app-height` in sync with the visible viewport so the app shell
 * shrinks above the virtual keyboard (esp. iOS Safari / standalone PWA).
 * Falls back to `window.innerHeight` when Visual Viewport API is unavailable.
 */
export function useVisualViewportHeight(): void {
  React.useEffect(() => {
    applyAppHeightVar();

    const vv = window.visualViewport;
    const onChange = () => applyAppHeightVar();

    if (vv) {
      vv.addEventListener('resize', onChange);
      vv.addEventListener('scroll', onChange);
    }
    window.addEventListener('resize', onChange);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', onChange);
        vv.removeEventListener('scroll', onChange);
      }
      window.removeEventListener('resize', onChange);
    };
  }, []);
}

/**
 * When the visual viewport shrinks (keyboard), scroll the focused element into
 * view inside the nearest scrollport. Call from a focused composer host.
 */
export function scrollFocusedIntoView(): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  const target =
    active.closest('.ProseMirror') instanceof HTMLElement
      ? (active.closest('.ProseMirror') as HTMLElement)
      : active;
  requestAnimationFrame(() => {
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}
