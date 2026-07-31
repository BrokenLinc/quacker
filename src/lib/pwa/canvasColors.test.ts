import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COMPOSER_PADDING_CLOSED,
  applyAppHeightVar,
  canvasColorForMode,
  getVisibleViewportHeight,
  isVirtualKeyboardOpen,
  raisedColorForMode,
} from './canvasColors';

function stubWindow(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal('window', {
    visualViewport: { height: 800, offsetTop: 0 },
    innerHeight: 800,
    screen: { height: 800, width: 400 },
    matchMedia: () => ({ matches: false }),
    navigator: { standalone: false },
    ...overrides,
  });
}

function stubDocument(
  root: { style: Record<string, string> } | null = null,
  classListContains = false
) {
  vi.stubGlobal('document', {
    activeElement: { tagName: 'BODY', isContentEditable: false },
    documentElement: {
      classList: {
        contains: (name: string) => classListContains && name === 'standalone',
        add: vi.fn(),
      },
      style: {
        setProperty: vi.fn(),
        getPropertyValue: vi.fn(),
        removeProperty: vi.fn(),
      },
    },
    getElementById: vi.fn(() => root),
  });
}

describe('canvasColorForMode', () => {
  it('returns canvas light/dark hexes', () => {
    expect(canvasColorForMode('light')).toBe('#FAF9FC');
    expect(canvasColorForMode('dark')).toBe('#221D33');
  });
});

describe('raisedColorForMode', () => {
  it('returns raised light/dark hexes', () => {
    expect(raisedColorForMode('light')).toBe('#FFFFFF');
    expect(raisedColorForMode('dark')).toBe('#302A44');
  });
});

describe('visible viewport height', () => {
  beforeEach(() => {
    stubWindow();
    stubDocument();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads height from visualViewport when present', () => {
    expect(getVisibleViewportHeight()).toBe(800);
  });

  it('falls back to window.innerHeight when visualViewport is missing', () => {
    stubWindow({ visualViewport: null, innerHeight: 800 });
    expect(getVisibleViewportHeight()).toBe(800);
  });

  it('does not treat a VV shrink alone as keyboard open (standalone PWA)', () => {
    stubWindow({
      visualViewport: { height: 320, offsetTop: 0 },
      innerHeight: 800,
    });
    stubDocument();
    expect(isVirtualKeyboardOpen()).toBe(false);
    applyAppHeightVar();
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-height',
      '800px'
    );
  });

  it('clears #root overrides when the keyboard is closed (browser)', () => {
    const rootStyle: Record<string, string> = {
      top: '12px',
      bottom: 'auto',
      height: '320px',
    };
    stubDocument({ style: rootStyle });
    applyAppHeightVar();
    expect(rootStyle.top).toBe('');
    expect(rootStyle.bottom).toBe('');
    expect(rootStyle.height).toBe('');
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-composer-pb',
      COMPOSER_PADDING_CLOSED
    );
  });

  it('uses 100vh on #root in standalone (WebKit lying viewport)', () => {
    const rootStyle: Record<string, string> = {
      top: '',
      bottom: '',
      height: '',
    };
    stubWindow({
      innerHeight: 812,
      screen: { height: 874, width: 402 },
      matchMedia: (q: string) => ({ matches: q.includes('standalone') }),
    });
    stubDocument({ style: rootStyle });
    applyAppHeightVar();
    expect(rootStyle.height).toBe('100vh');
    expect(rootStyle.bottom).toBe('auto');
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-height',
      '874px'
    );
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-composer-pb',
      COMPOSER_PADDING_CLOSED
    );
  });

  it('overrides #root when VV shrinks and an editable is focused', () => {
    const rootStyle: Record<string, string> = {
      top: '',
      bottom: '',
      height: '',
    };
    const input = { tagName: 'INPUT', isContentEditable: false };
    stubWindow({
      visualViewport: { height: 320.4, offsetTop: 12 },
      innerHeight: 800,
    });
    vi.stubGlobal('document', {
      activeElement: input,
      documentElement: {
        classList: { contains: () => false, add: vi.fn() },
        style: {
          setProperty: vi.fn(),
          getPropertyValue: vi.fn(),
          removeProperty: vi.fn(),
        },
      },
      getElementById: vi.fn(() => ({ style: rootStyle })),
    });
    expect(isVirtualKeyboardOpen()).toBe(true);
    applyAppHeightVar();
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-height',
      '320px'
    );
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--app-composer-pb',
      '0px'
    );
    expect(rootStyle.top).toBe('12px');
    expect(rootStyle.bottom).toBe('auto');
    expect(rootStyle.height).toBe('320px');
  });
});
