import React from 'react';

import { applyAppHeightVar } from './canvasColors';

/**
 * Keeps CSS `--app-height` in sync with the visible viewport so the fixed app
 * shell shrinks above the virtual keyboard (esp. iOS Safari / standalone PWA).
 *
 * The shell is `position: fixed; top: 0; height: var(--app-height)`, so it never
 * needs a translate offset. iOS still pans the layout viewport when an input
 * focuses; we cancel that by resetting document scroll on every viewport change
 * and on blur. Falls back to `window.innerHeight` when VV is missing.
 */
export function useVisualViewportHeight(): void {
  React.useEffect(() => {
    let rafId = 0;

    const sync = () => {
      window.scrollTo(0, 0);
      applyAppHeightVar();
    };

    const onChange = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        sync();
      });
    };

    sync();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', onChange);
      vv.addEventListener('scroll', onChange);
    }
    window.addEventListener('resize', onChange);
    document.addEventListener('focusout', onChange);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (vv) {
        vv.removeEventListener('resize', onChange);
        vv.removeEventListener('scroll', onChange);
      }
      window.removeEventListener('resize', onChange);
      document.removeEventListener('focusout', onChange);
    };
  }, []);
}
