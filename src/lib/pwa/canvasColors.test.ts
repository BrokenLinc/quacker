import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyAppHeightVar,
  applyAppOffsetTopVar,
  applyVisualViewportVars,
  canvasColorForMode,
  getVisibleViewportHeight,
  getVisualViewportOffsetTop,
  isKeyboardLikelyOpen,
} from './canvasColors';

describe('canvasColorForMode', () => {
  it('returns canvas light/dark hexes', () => {
    expect(canvasColorForMode('light')).toBe('#FAF9FC');
    expect(canvasColorForMode('dark')).toBe('#221D33');
  });
});

describe('visual viewport helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      visualViewport: { height: 640, offsetTop: 0, scale: 1 },
      innerHeight: 800,
    });
    vi.stubGlobal('document', {
      documentElement: {
        style: {
          setProperty: vi.fn(),
          getPropertyValue: vi.fn(),
          removeProperty: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads height from visualViewport when present', () => {
    expect(getVisibleViewportHeight()).toBe(640);
    applyAppHeightVar();
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-height',
      '640px'
    );
  });

  it('scale-corrects height so pinch-zoom does not shrink the shell', () => {
    vi.stubGlobal('window', {
      visualViewport: { height: 320, offsetTop: 0, scale: 2 },
      innerHeight: 800,
    });
    expect(getVisibleViewportHeight()).toBe(640);
    applyAppHeightVar();
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-height',
      '640px'
    );
  });

  it('falls back to window.innerHeight when visualViewport is missing', () => {
    vi.stubGlobal('window', {
      visualViewport: null,
      innerHeight: 800,
    });
    expect(getVisibleViewportHeight()).toBe(800);
    applyAppHeightVar();
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-height',
      '800px'
    );
  });

  it('publishes --app-offset-top from visualViewport.offsetTop', () => {
    vi.stubGlobal('window', {
      visualViewport: { height: 500, offsetTop: 120, scale: 1 },
      innerHeight: 800,
    });
    expect(getVisualViewportOffsetTop()).toBe(120);
    applyAppOffsetTopVar();
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-offset-top',
      '120px'
    );
  });

  it('applyVisualViewportVars sets both CSS vars', () => {
    vi.stubGlobal('window', {
      visualViewport: { height: 500, offsetTop: 80, scale: 1 },
      innerHeight: 800,
    });
    applyVisualViewportVars();
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-height',
      '500px'
    );
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-offset-top',
      '80px'
    );
  });

  it('detects keyboard via offsetTop or height delta', () => {
    expect(isKeyboardLikelyOpen(800, 800, 0)).toBe(false);
    expect(isKeyboardLikelyOpen(800, 800, 40)).toBe(true);
    expect(isKeyboardLikelyOpen(800, 500, 0)).toBe(true);
    expect(isKeyboardLikelyOpen(800, 780, 0)).toBe(false);
  });
});
