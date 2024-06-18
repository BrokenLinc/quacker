import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  formatDateTime,
  getPreviousDateTime,
  isDateTimeBeforeYesterday,
} from './dateTimeHelpers';

describe('formatDateTime', () => {
  test('2000-01-02 18:52:42Z >> 01/02/2000 01:52:42pm', () => {
    expect(formatDateTime(new Date('2000-01-02 18:52:42Z'))).toEqual(
      '01/02/2000 01:52:42pm'
    );
  });
  test('2020-06-03 07:01:17Z >> 06/03/2020 02:01:17am', () => {
    expect(formatDateTime(new Date('2020-06-03 07:01:17Z'))).toEqual(
      '06/03/2020 02:01:17am'
    );
  });
});
describe('getPreviousDateTime', () => {
  test('2000-02-07 -> 2000-02-06', () => {
    expect(getPreviousDateTime(new Date('2000-02-07'))).toEqual(
      new Date('2000-02-06')
    );
  });
});
describe('isDateTimeBeforeYesterday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 7, 18)); // 18 August, 2023
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  test('way in past', () => {
    expect(isDateTimeBeforeYesterday(new Date(2000, 2, 7))).toBeTruthy();
  });
  test('day before yesterday', () => {
    expect(isDateTimeBeforeYesterday(new Date(2023, 7, 16))).toBeTruthy();
  });
  test('yesterday', () => {
    expect(isDateTimeBeforeYesterday(new Date(2023, 7, 17))).toBeFalsy();
  });
  test('today', () => {
    expect(isDateTimeBeforeYesterday(new Date(2023, 7, 18))).toBeFalsy();
  });
  test('way in future', () => {
    expect(isDateTimeBeforeYesterday(new Date(2100, 2, 7))).toBeFalsy();
  });
  test('null', () => {
    expect(isDateTimeBeforeYesterday(null)).toBeFalsy();
  });
  test('undefined', () => {
    expect(isDateTimeBeforeYesterday(undefined)).toBeFalsy();
  });
});
