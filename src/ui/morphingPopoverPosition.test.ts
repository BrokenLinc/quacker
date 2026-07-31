import { describe, expect, test } from 'vitest';
import {
  anchorFractions,
  anchorPoint,
  placeAndClamp,
} from './morphingPopoverPosition';

const viewport = {
  offsetLeft: 0,
  offsetTop: 0,
  width: 400,
  height: 600,
};

describe('morphingPopoverPosition', () => {
  test('anchorFractions maps 9-point anchors', () => {
    expect(anchorFractions('top left')).toEqual({ x: 0, y: 0 });
    expect(anchorFractions('center')).toEqual({ x: 0.5, y: 0.5 });
    expect(anchorFractions('bottom right')).toEqual({ x: 1, y: 1 });
    expect(anchorFractions('right')).toEqual({ x: 1, y: 0.5 });
  });

  test('anchorPoint uses trigger rect + fractions', () => {
    expect(
      anchorPoint({ left: 100, top: 50, width: 40, height: 20 }, 'center')
    ).toEqual({ x: 120, y: 60 });
    expect(
      anchorPoint({ left: 100, top: 50, width: 40, height: 20 }, 'top left')
    ).toEqual({ x: 100, y: 50 });
  });

  test('center overlap when panel fits', () => {
    const trigger = { left: 180, top: 280, width: 40, height: 40 };
    const panelSize = { width: 220, height: 200 };
    const result = placeAndClamp({
      trigger,
      panelSize,
      anchor: 'center',
      viewport,
      margin: 12,
    });
    // Trigger center (200, 300) aligns with panel center.
    expect(result.left).toBe(200 - 110);
    expect(result.top).toBe(300 - 100);
    expect(result.maxWidth).toBe(220);
    expect(result.maxHeight).toBe(200);
  });

  test('top left overlap when panel fits', () => {
    const trigger = { left: 100, top: 80, width: 32, height: 32 };
    const result = placeAndClamp({
      trigger,
      panelSize: { width: 200, height: 150 },
      anchor: 'top left',
      viewport,
      margin: 12,
    });
    expect(result.left).toBe(100);
    expect(result.top).toBe(80);
  });

  test('clamps when near top-left edge', () => {
    const result = placeAndClamp({
      trigger: { left: 4, top: 4, width: 24, height: 24 },
      panelSize: { width: 220, height: 200 },
      anchor: 'center',
      viewport,
      margin: 12,
    });
    expect(result.left).toBe(12);
    expect(result.top).toBe(12);
  });

  test('clamps when near bottom-right edge', () => {
    const result = placeAndClamp({
      trigger: { left: 370, top: 560, width: 24, height: 24 },
      panelSize: { width: 220, height: 200 },
      anchor: 'center',
      viewport,
      margin: 12,
    });
    expect(result.left).toBe(400 - 12 - 220);
    expect(result.top).toBe(600 - 12 - 200);
  });

  test('panel larger than viewport caps size and pins to margin', () => {
    const result = placeAndClamp({
      trigger: { left: 100, top: 100, width: 40, height: 40 },
      panelSize: { width: 500, height: 800 },
      anchor: 'center',
      viewport,
      margin: 12,
    });
    expect(result.maxWidth).toBe(400 - 24);
    expect(result.maxHeight).toBe(600 - 24);
    expect(result.left).toBe(12);
    expect(result.top).toBe(12);
  });

  test('respects visualViewport offset', () => {
    const result = placeAndClamp({
      trigger: { left: 50, top: 200, width: 20, height: 20 },
      panelSize: { width: 100, height: 80 },
      anchor: 'top left',
      viewport: {
        offsetLeft: 0,
        offsetTop: 100,
        width: 390,
        height: 400,
      },
      margin: 12,
    });
    // Ideal top is 200; minTop is 112 — no clamp needed on top.
    expect(result.top).toBe(200);
    expect(result.left).toBe(50);
  });
});
