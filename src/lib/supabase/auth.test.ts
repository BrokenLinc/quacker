import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

import {
  appUserHasChosenDisplayName,
  hasChosenDisplayName,
  isPhoneFallbackDisplayName,
  isSuperAdminPhone,
  phoneDigits,
} from './auth';

const userWithName = (display_name: string | undefined): User =>
  ({
    id: 'u1',
    user_metadata: display_name === undefined ? {} : { display_name },
  }) as User;

describe('isPhoneFallbackDisplayName', () => {
  it('matches ···1234 style names', () => {
    expect(isPhoneFallbackDisplayName('···0100')).toBe(true);
    expect(isPhoneFallbackDisplayName('···9999')).toBe(true);
  });

  it('rejects real names and empty', () => {
    expect(isPhoneFallbackDisplayName('Fox')).toBe(false);
    expect(isPhoneFallbackDisplayName('···12')).toBe(false);
    expect(isPhoneFallbackDisplayName(null)).toBe(false);
    expect(isPhoneFallbackDisplayName(undefined)).toBe(false);
  });
});

describe('hasChosenDisplayName', () => {
  it('is false when metadata is missing or phone fallback', () => {
    expect(hasChosenDisplayName(null)).toBe(false);
    expect(hasChosenDisplayName(userWithName(undefined))).toBe(false);
    expect(hasChosenDisplayName(userWithName('···0100'))).toBe(false);
  });

  it('is true for a real display name', () => {
    expect(hasChosenDisplayName(userWithName('Fox'))).toBe(true);
  });
});

describe('phoneDigits / isSuperAdminPhone', () => {
  it('normalizes phones to digits', () => {
    expect(phoneDigits('+13522622098')).toBe('13522622098');
    expect(phoneDigits('3522622098')).toBe('3522622098');
    expect(phoneDigits(null)).toBe(null);
  });

  it('matches SuperAdmin with or without plus', () => {
    expect(isSuperAdminPhone('+13522622098')).toBe(true);
    expect(isSuperAdminPhone('13522622098')).toBe(true);
    expect(isSuperAdminPhone('+12025550100')).toBe(false);
    expect(isSuperAdminPhone(null)).toBe(false);
  });
});

describe('appUserHasChosenDisplayName', () => {
  it('treats phone fallback AppUser names as not chosen', () => {
    expect(
      appUserHasChosenDisplayName({
        uid: 'u1',
        email: null,
        phone: '+12025550199',
        displayName: '···0199',
        photoURL: null,
      })
    ).toBe(false);
  });

  it('treats real names as chosen', () => {
    expect(
      appUserHasChosenDisplayName({
        uid: 'u1',
        email: null,
        phone: '+12025550199',
        displayName: 'Fox',
        photoURL: null,
      })
    ).toBe(true);
  });
});
