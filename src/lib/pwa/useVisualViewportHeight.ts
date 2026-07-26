import React from 'react';

import { applyAppHeightVar } from './canvasColors';

/**
 * Keeps the fixed app shell sized for the soft keyboard.
 *
 * `#root` defaults to CSS `inset: 0`. While an editable is focused and the
 * visual viewport has shrunk, JS overrides top/height from `visualViewport`.
 * `scrollTo(0,0)` cancels Safari's focus pan.
 */
export function useVisualViewportHeight(): void {
  React.useEffect(() => {
    let rafId = 0;

    const sync = () => {
      applyAppHeightVar();
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        applyAppHeightVar();
      });
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
    // Focus changes flip the editable+VV keyboard heuristic.
    document.addEventListener('focusin', onChange);
    document.addEventListener('focusout', onChange);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (vv) {
        vv.removeEventListener('resize', onChange);
        vv.removeEventListener('scroll', onChange);
      }
      window.removeEventListener('resize', onChange);
      document.removeEventListener('focusin', onChange);
      document.removeEventListener('focusout', onChange);
    };
  }, []);
}
