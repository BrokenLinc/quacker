import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyAppHeightVar,
  canvasColorForMode,
  getVisibleViewportHeight,
} from './canvasColors';

describe('canvasColorForMode', () => {
  it('returns canvas light/dark hexes', () => {
    expect(canvasColorForMode('light')).toBe('#FAF9FC');
    expect(canvasColorForMode('dark')).toBe('#221D33');
  });
});

describe('visible viewport height', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      visualViewport: { height: 640 },
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

  it('shrinks with the keyboard (uses raw VV height, no scale)', () => {
    vi.stubGlobal('window', {
      visualViewport: { height: 320 },
      innerHeight: 800,
    });
    expect(getVisibleViewportHeight()).toBe(320);
    applyAppHeightVar();
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-height',
      '320px'
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

  it('rounds fractional heights', () => {
    vi.stubGlobal('window', {
      visualViewport: { height: 639.6 },
      innerHeight: 800,
    });
    applyAppHeightVar();
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-height',
      '640px'
    );
  });
});
