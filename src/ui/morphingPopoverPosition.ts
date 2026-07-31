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

/**
 * Place the panel so its anchor coincides with the trigger's, then clamp into
 * the viewport. Caps maxHeight/maxWidth when the panel exceeds available space.
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
  margin?: number;
}): PlaceAndClampResult {
  const { x: fx, y: fy } = anchorFractions(anchor);
  const pt = anchorPoint(trigger, anchor);

  const availW = Math.max(0, viewport.width - margin * 2);
  const availH = Math.max(0, viewport.height - margin * 2);
  const maxWidth = Math.min(panelSize.width, availW);
  const maxHeight = Math.min(panelSize.height, availH);

  let left = pt.x - maxWidth * fx;
  let top = pt.y - maxHeight * fy;

  const minLeft = viewport.offsetLeft + margin;
  const minTop = viewport.offsetTop + margin;
  const maxLeft = viewport.offsetLeft + viewport.width - margin - maxWidth;
  const maxTop = viewport.offsetTop + viewport.height - margin - maxHeight;

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
