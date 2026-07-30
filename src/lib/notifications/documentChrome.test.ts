import { describe, expect, it } from 'vitest';

import {
  buildDocumentTitle,
  formatUnreadCount,
  sumUnreadCounts,
} from './documentChrome';

describe('formatUnreadCount', () => {
  it('returns the number as a string under 100', () => {
    expect(formatUnreadCount(1)).toBe('1');
    expect(formatUnreadCount(99)).toBe('99');
  });

  it('caps at 99+', () => {
    expect(formatUnreadCount(100)).toBe('99+');
    expect(formatUnreadCount(999)).toBe('99+');
  });
});

describe('sumUnreadCounts', () => {
  it('sums per-group counts', () => {
    expect(sumUnreadCounts({ a: 1, b: 2, c: 3 })).toBe(6);
  });

  it('returns 0 for an empty map', () => {
    expect(sumUnreadCounts({})).toBe(0);
  });
});

describe('buildDocumentTitle', () => {
  it('uses the app name alone when idle', () => {
    expect(
      buildDocumentTitle({
        pageLabel: null,
        unreadTotal: 0,
        chirpOverride: null,
      })
    ).toBe('Yowl');
  });

  it('includes the page label', () => {
    expect(
      buildDocumentTitle({
        pageLabel: 'Home',
        unreadTotal: 0,
        chirpOverride: null,
      })
    ).toBe('Home - Yowl');
  });

  it('prefixes unread total', () => {
    expect(
      buildDocumentTitle({
        pageLabel: 'Home',
        unreadTotal: 3,
        chirpOverride: null,
      })
    ).toBe('(3) Home - Yowl');
    expect(
      buildDocumentTitle({
        pageLabel: null,
        unreadTotal: 12,
        chirpOverride: null,
      })
    ).toBe('(12) Yowl');
  });

  it('caps unread prefix at 99+', () => {
    expect(
      buildDocumentTitle({
        pageLabel: null,
        unreadTotal: 120,
        chirpOverride: null,
      })
    ).toBe('(99+) Yowl');
  });

  it('prefers chirp override over unread and page label', () => {
    expect(
      buildDocumentTitle({
        pageLabel: 'Home',
        unreadTotal: 5,
        chirpOverride: '🦆 Ada yowled!',
      })
    ).toBe('🦆 Ada yowled!');
  });
});
