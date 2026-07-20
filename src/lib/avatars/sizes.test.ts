import { describe, expect, test } from 'vitest';

import { avatarSizeToPx } from './sizes';

describe('avatarSizeToPx', () => {
  test('maps Chakra size tokens to pixels', () => {
    expect(avatarSizeToPx('xs')).toBe(24);
    expect(avatarSizeToPx('sm')).toBe(32);
    expect(avatarSizeToPx('md')).toBe(48);
    expect(avatarSizeToPx('lg')).toBe(64);
    expect(avatarSizeToPx('xl')).toBe(128);
    expect(avatarSizeToPx('2xl')).toBe(256);
  });

  test('passes through numeric sizes', () => {
    expect(avatarSizeToPx(40)).toBe(40);
  });

  test('defaults unknown sizes to md', () => {
    expect(avatarSizeToPx('unknown')).toBe(48);
  });
});
