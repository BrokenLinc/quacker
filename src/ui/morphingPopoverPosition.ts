export type MorphingPopoverAnchor =
  | 'top left'
  | 'top'
  | 'top right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom left'
  | 'bottom'
  | 'bottom right';

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SizeLike = {
  width: number;
  height: number;
};

export type ViewportLike = {
  offsetLeft: number;
  offsetTop: number;
  width: number;
  height: number;
};

export type EdgeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PlaceAndClampResult = {
  left: number;
  top: number;
  maxHeight: number;
  maxWidth: number;
};

/** Map a 9-point anchor to width/height fractions (0 | 0.5 | 1). */
export function anchorFractions(anchor: MorphingPopoverAnchor): {
  x: number;
  y: number;
} {
  switch (anchor) {
    case 'top left':
      return { x: 0, y: 0 };
    case 'top':
      return { x: 0.5, y: 0 };
    case 'top right':
      return { x: 1, y: 0 };
    case 'left':
      return { x: 0, y: 0.5 };
    case 'center':
      return { x: 0.5, y: 0.5 };
    case 'right':
      return { x: 1, y: 0.5 };
    case 'bottom left':
      return { x: 0, y: 1 };
    case 'bottom':
      return { x: 0.5, y: 1 };
    case 'bottom right':
      return { x: 1, y: 1 };
  }
}

export function anchorPoint(
  rect: RectLike,
  anchor: MorphingPopoverAnchor
): { x: number; y: number } {
  const { x: fx, y: fy } = anchorFractions(anchor);
  return {
    x: rect.left + rect.width * fx,
    y: rect.top + rect.height * fy,
  };
}

export function normalizeMargin(
  margin: number | EdgeInsets = 12
): EdgeInsets {
  if (typeof margin === 'number') {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  return margin;
}

/**
 * Read CSS `env(safe-area-inset-*)` via a temporary probe element.
 * Returns zeros when `document` is unavailable (SSR / unit tests).
 */
export function readSafeAreaInsets(): EdgeInsets {
  if (typeof document === 'undefined' || !document.body) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top, 0px);' +
    'padding-right:env(safe-area-inset-right, 0px);' +
    'padding-bottom:env(safe-area-inset-bottom, 0px);' +
    'padding-left:env(safe-area-inset-left, 0px);';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  document.body.removeChild(probe);
  return insets;
}

/**
 * Place the panel so its anchor coincides with the trigger's, then clamp into
 * the viewport. Caps maxHeight/maxWidth when the panel exceeds available space.
 * `margin` may be a scalar or per-edge insets (e.g. safe-area aware).
 */
export function placeAndClamp({
  trigger,
  panelSize,
  anchor,
  viewport,
  margin = 12,
}: {
  trigger: RectLike;
  panelSize: SizeLike;
  anchor: MorphingPopoverAnchor;
  viewport: ViewportLike;
  margin?: number | EdgeInsets;
}): PlaceAndClampResult {
  const m = normalizeMargin(margin);
  const { x: fx, y: fy } = anchorFractions(anchor);
  const pt = anchorPoint(trigger, anchor);

  const availW = Math.max(0, viewport.width - m.left - m.right);
  const availH = Math.max(0, viewport.height - m.top - m.bottom);
  const maxWidth = Math.min(panelSize.width, availW);
  const maxHeight = Math.min(panelSize.height, availH);

  let left = pt.x - maxWidth * fx;
  let top = pt.y - maxHeight * fy;

  const minLeft = viewport.offsetLeft + m.left;
  const minTop = viewport.offsetTop + m.top;
  const maxLeft = viewport.offsetLeft + viewport.width - m.right - maxWidth;
  const maxTop = viewport.offsetTop + viewport.height - m.bottom - maxHeight;

  left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));
  top = Math.min(Math.max(top, minTop), Math.max(minTop, maxTop));

  return { left, top, maxHeight, maxWidth };
}

export function readVisualViewport(): ViewportLike {
  const vv = window.visualViewport;
  if (vv) {
    return {
      offsetLeft: vv.offsetLeft,
      offsetTop: vv.offsetTop,
      width: vv.width,
      height: vv.height,
    };
  }
  return {
    offsetLeft: 0,
    offsetTop: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
