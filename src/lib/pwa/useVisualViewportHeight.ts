import React from 'react';

import {
  applyVisualViewportVars,
  isKeyboardLikelyOpen,
} from './canvasColors';

/**
 * Keeps CSS `--app-height` / `--app-offset-top` in sync with the visible
 * viewport so the app shell shrinks above the virtual keyboard (esp. iOS
 * Safari / standalone PWA). Resets residual document scroll while the
 * keyboard is open. Falls back to `window.innerHeight` when VV is missing.
 */
export function useVisualViewportHeight(): void {
  React.useEffect(() => {
    let rafId = 0;

    const sync = () => {
      applyVisualViewportVars();
      if (isKeyboardLikelyOpen()) {
        window.scrollTo(0, 0);
      }
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

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (vv) {
        vv.removeEventListener('resize', onChange);
        vv.removeEventListener('scroll', onChange);
      }
      window.removeEventListener('resize', onChange);
    };
  }, []);
}

function findScrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * When the visual viewport shrinks (keyboard), scroll the focused element into
 * view inside the nearest overflow scrollport — never the document, so iOS
 * cannot reintroduce a layout-viewport jump.
 */
export function scrollFocusedIntoView(): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  const target =
    active.closest('.ProseMirror') instanceof HTMLElement
      ? (active.closest('.ProseMirror') as HTMLElement)
      : active;

  requestAnimationFrame(() => {
    const scrollParent = findScrollParent(target);
    if (!scrollParent) {
      // No internal scrollport — avoid document scrollIntoView on iOS.
      return;
    }

    const parentRect = scrollParent.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const padding = 8;

    if (targetRect.bottom > parentRect.bottom - padding) {
      scrollParent.scrollTop += targetRect.bottom - parentRect.bottom + padding;
    } else if (targetRect.top < parentRect.top + padding) {
      scrollParent.scrollTop -= parentRect.top + padding - targetRect.top;
    }
  });
}
