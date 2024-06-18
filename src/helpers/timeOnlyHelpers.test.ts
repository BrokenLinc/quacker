import { describe, expect, test } from 'vitest';
import { formatTimeOnly, getTimeOnlyFromDate } from './timeOnlyHelpers';

describe('timeonlyHelpers', () => {
  describe('formatTimeOnly', () => {
    test('am time', () => {
      expect(formatTimeOnly('03:32:29')).toBe('3:32am');
    });
    test('pm time', () => {
      expect(formatTimeOnly('16:32:29')).toBe('4:32pm');
    });
    test('midnight', () => {
      expect(formatTimeOnly('00:00:00')).toBe('12:00am');
    });
    test('with milliseconds', () => {
      expect(formatTimeOnly('10:04:47.523')).toBe('10:04am');
    });
    test('bad input', () => {
      expect(formatTimeOnly('BAD_INPUT')).toBe('');
    });
  });
});

describe('getTimeOnlyFromDate', () => {
  test('2000-01-02 01:00:00 -> 01:00:00', () => {
    expect(getTimeOnlyFromDate(new Date('2000-01-02 01:00:00'))).toBe(
      '01:00:00'
    );
  });
  test('2000-01-02 23:00:00 -> 23:00:00', () => {
    expect(getTimeOnlyFromDate(new Date('2000-01-02 23:00:00'))).toBe(
      '23:00:00'
    );
  });
});
