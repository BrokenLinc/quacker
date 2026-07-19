import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isIosSafari, isStandaloneDisplay } from './useInstallPrompt';

describe('isStandaloneDisplay', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    vi.stubGlobal('navigator', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when display-mode is standalone', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(isStandaloneDisplay()).toBe(true);
  });

  it('returns true for legacy iOS standalone navigator flag', () => {
    vi.stubGlobal('navigator', { standalone: true });
    expect(isStandaloneDisplay()).toBe(true);
  });
});

describe('isIosSafari', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    vi.stubGlobal('document', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects iPhone Safari', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    expect(isIosSafari()).toBe(true);
  });

  it('detects iPadOS using its Mac user agent', () => {
    vi.stubGlobal('navigator', {
      maxTouchPoints: 5,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15',
    });
    expect(isIosSafari()).toBe(true);
  });

  it('does not detect desktop macOS from DOM touch event support', () => {
    vi.stubGlobal('document', { ontouchend: null });
    vi.stubGlobal('navigator', {
      maxTouchPoints: 0,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15',
    });
    expect(isIosSafari()).toBe(false);
  });

  it('returns false when already installed', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      standalone: true,
    });
    expect(isIosSafari()).toBe(false);
  });
});
