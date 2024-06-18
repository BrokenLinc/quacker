import { describe, expect, test } from 'vitest';
import {
  formatDateTimeOnly,
  getDateOnlyFromDateTimeOnly,
  getTimeOnlyFromDateTimeOnly,
} from './dateTimeOnlyHelpers';

describe('formatDateTimeOnly', () => {
  test('2000-01-02 00:00:00', () => {
    expect(formatDateTimeOnly('2000-01-02 00:00:00')).toBe(
      '01/02/2000 12:00am'
    );
  });
  test('2000-01-02 16:32:55', () => {
    expect(formatDateTimeOnly('2000-01-02 16:32:55')).toBe('01/02/2000 4:32pm');
  });
});

describe('getDateOnlyFromDateTimeOnly', () => {
  test('2000-01-02 00:00:00', () => {
    expect(getDateOnlyFromDateTimeOnly('2000-01-02 00:00:00')).toBe(
      '2000-01-02'
    );
  });
});

describe('getTimeOnlyFromDateTimeOnly', () => {
  test('2000-01-02 00:00:00', () => {
    expect(getTimeOnlyFromDateTimeOnly('2000-01-02 00:00:00')).toBe('00:00:00');
  });
});
