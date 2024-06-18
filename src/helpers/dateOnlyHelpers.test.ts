import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  convertDateOnlyToJSDate,
  formatDateOnly,
  formatDateOnlyAbbr,
  getDateOnlyFromDate,
  getPreviousDateOnly,
  isDateOnlyAnniversaryToday,
  isDateOnlyBeforeYesterday,
} from './dateOnlyHelpers';

describe('convertDateOnlyToJSDate', () => {
  test('2000-01-02 -> 2000-01-02 05:00:00Z', () => {
    expect(convertDateOnlyToJSDate('2000-01-02')).toEqual(
      new Date('2000-01-02 05:00:00Z')
    );
  });
});
describe('formatDateOnly', () => {
  test('2000-01-02 -> 01/02/2000', () => {
    expect(formatDateOnly('2000-01-02')).toBe('01/02/2000');
  });
});
describe('formatDateOnlyAbbr', () => {
  test('2000-01-02 -> Jan 2', () => {
    expect(formatDateOnlyAbbr('2000-01-02')).toBe('Jan 2');
  });
});
describe('getDateOnlyFromDate', () => {
  test('2000-01-02 01:00:00 -> 2000-01-02', () => {
    expect(getDateOnlyFromDate(new Date('2000-01-02 01:00:00'))).toBe(
      '2000-01-02'
    );
  });
  test('2000-01-02 23:00:00 -> 2000-01-02', () => {
    expect(getDateOnlyFromDate(new Date('2000-01-02 23:00:00'))).toBe(
      '2000-01-02'
    );
  });
});
describe('getPreviousDateOnly', () => {
  test('2000-02-07 -> 2000-02-06', () => {
    expect(getPreviousDateOnly('2000-02-07')).toBe('2000-02-06');
  });
});
describe('isDateOnlyBeforeYesterday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 7, 18)); // 18 August, 2023
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  test('way in past', () => {
    expect(isDateOnlyBeforeYesterday('2000-02-07')).toBeTruthy();
  });
  test('day before yesterday', () => {
    expect(isDateOnlyBeforeYesterday('2023-08-16')).toBeTruthy();
  });
  test('yesterday', () => {
    expect(isDateOnlyBeforeYesterday('2023-08-17')).toBeFalsy();
  });
  test('today', () => {
    expect(isDateOnlyBeforeYesterday('2023-08-18')).toBeFalsy();
  });
  test('way in future', () => {
    expect(isDateOnlyBeforeYesterday('2100-02-07')).toBeFalsy();
  });
  test('empty string', () => {
    expect(isDateOnlyBeforeYesterday('')).toBeFalsy();
  });
  test('null', () => {
    expect(isDateOnlyBeforeYesterday(null)).toBeFalsy();
  });
  test('undefined', () => {
    expect(isDateOnlyBeforeYesterday(undefined)).toBeFalsy();
  });
});
describe('isDateOnlyAnniversaryToday', () => {
  test('same day, timeless', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 7, 18)); // 18 August, 2023
    expect(isDateOnlyAnniversaryToday('2023-08-18')).toBeTruthy();
    vi.useRealTimers();
  });
  test('same day, 11pm', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 7, 18, 23)); // 18 August, 2023 11:00 PM
    expect(isDateOnlyAnniversaryToday('2023-08-18')).toBeTruthy();
    vi.useRealTimers();
  });
  test('same day, 1am', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 7, 18, 1)); // 18 August, 2023 1:00 AM
    expect(isDateOnlyAnniversaryToday('2023-08-18')).toBeTruthy();
    vi.useRealTimers();
  });
  test('different day, timeless', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 7, 18)); // 18 August
    expect(isDateOnlyAnniversaryToday('2024-02-03')).toBeFalsy();
    vi.useRealTimers();
  });
  test('different day, 11pm', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 7, 18, 23)); // 18 August, 2023 11:00 PM
    expect(isDateOnlyAnniversaryToday('2023-08-19')).toBeFalsy();
    vi.useRealTimers();
  });
  test('different day, 1am', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 7, 18, 1)); // 18 August, 2023 1:00 AM
    expect(isDateOnlyAnniversaryToday('2023-08-17')).toBeFalsy();
    vi.useRealTimers();
  });
  test('null', () => {
    vi.useFakeTimers();
    expect(isDateOnlyAnniversaryToday(null)).toBeFalsy();
    vi.useRealTimers();
  });
  test('undefined', () => {
    vi.useFakeTimers();
    expect(isDateOnlyAnniversaryToday()).toBeFalsy();
    vi.useRealTimers();
  });
});
