import { describe, expect, test } from 'vitest';
import { getDayAbbreviations } from './dayHelpers';

describe('getDayAbbreviations', () => {
  test('none', () => {
    expect(
      getDayAbbreviations({
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      })
    ).toBe('');
  });
  test('some', () => {
    expect(
      getDayAbbreviations({
        monday: true,
        tuesday: false,
        wednesday: true,
        thursday: false,
        friday: true,
        saturday: false,
        sunday: false,
      })
    ).toBe('M W F');
  });
  test('all', () => {
    expect(
      getDayAbbreviations({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      })
    ).toBe('M Tu W Th F Sa Su');
  });
});
