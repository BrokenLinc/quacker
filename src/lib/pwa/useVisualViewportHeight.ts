import React from 'react';

import { applyAppHeightVar } from './canvasColors';

/**
 * Keeps the fixed app shell sized for the soft keyboard.
 *
 * Closed: `#root` uses CSS from `index.html` (browser `inset: 0`, standalone
 * `height: 100vh`). Open: VV shrink + focused editable → override top/height.
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
