import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getAgeLabel } from './getAgeLabel';

describe('getAgeLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 7, 18)); // 2023-08-18
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('>1yo', () => {
    expect(getAgeLabel('2020-03-04')).toBe('3 years');
  });
  test('1yo', () => {
    expect(getAgeLabel('2022-03-04')).toBe('1 year');
  });
  test('under 1yo', () => {
    expect(getAgeLabel('2023-03-04')).toBe('5 months');
  });
  test('under 1mo', () => {
    expect(getAgeLabel('2023-08-15')).toBe('3 days');
  });
  test('not born yet', () => {
    expect(getAgeLabel('2024-03-04')).toBe('—');
  });
  test('null', () => {
    expect(getAgeLabel(null)).toBe('—');
  });
  test('undefined', () => {
    expect(getAgeLabel(undefined)).toBe('—');
  });
});
