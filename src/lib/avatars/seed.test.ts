import { describe, expect, test } from 'vitest';

import { getAvatarSeed } from './index';

describe('getAvatarSeed', () => {
  test('prefers uid over other fields', () => {
    expect(
      getAvatarSeed({
        uid: 'user-123',
        phone: '+15551234567',
        email: 'user@example.com',
        name: 'Alice',
      })
    ).toBe('user-123');
  });

  test('falls back to phone, email, then name', () => {
    expect(getAvatarSeed({ phone: '+15551234567', email: 'a@b.com' })).toBe(
      '+15551234567'
    );
    expect(getAvatarSeed({ email: 'a@b.com', name: 'Alice' })).toBe('a@b.com');
    expect(getAvatarSeed({ name: 'Alice' })).toBe('Alice');
  });

  test('returns empty string when no identifiers', () => {
    expect(getAvatarSeed({})).toBe('');
  });
});
