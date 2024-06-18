import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getAgeInYears } from './getAgeInYears';

describe('getAgeInYears', () => {
  describe('non leap year', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2023, 7, 18)); // 18 August, 2023
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    test('typical case', () => {
      expect(getAgeInYears('2021-03-04')).toBe(2);
    });
    test('under 1yo', () => {
      expect(getAgeInYears('2023-03-04')).toBe(0);
    });
    test('leap year birthday', () => {
      expect(getAgeInYears('2020-02-29')).toBe(3);
    });
  });

  describe('leap year', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 1, 29)); // 29 February, 2024
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    test('typical case', () => {
      expect(getAgeInYears('2021-03-04')).toBe(2);
    });
    test('under 1yo', () => {
      expect(getAgeInYears('2023-03-04')).toBe(0);
    });
    test('leap year birthday', () => {
      expect(getAgeInYears('2020-02-29')).toBe(4);
    });
  });
});
