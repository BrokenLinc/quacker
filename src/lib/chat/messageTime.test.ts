import { describe, expect, test, vi, afterEach } from 'vitest';

import {
  formatAuthorLabel,
  formatMessageDayLabel,
  formatMessageTime,
  localDayKey,
} from './messageTime';

describe('formatMessageTime', () => {
  test('formats en-US 12h clock without space before am/pm', () => {
    const ms = new Date(2024, 5, 15, 17, 15, 0).getTime();
    const label = formatMessageTime(ms, 'en-US');
    expect(label.toLowerCase()).toBe('5:15pm');
  });
});

describe('localDayKey', () => {
  test('returns YYYY-MM-DD in local time', () => {
    const d = new Date(2024, 7, 23, 15, 0, 0);
    expect(localDayKey(d.getTime())).toBe('2024-08-23');
  });
});

describe('formatMessageDayLabel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns Today for the current local day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 7, 23, 18, 0, 0));
    expect(formatMessageDayLabel(new Date(2024, 7, 23, 9, 0, 0).getTime())).toBe(
      'Today'
    );
  });

  test('returns Yesterday for the previous local day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 7, 23, 18, 0, 0));
    expect(
      formatMessageDayLabel(new Date(2024, 7, 22, 9, 0, 0).getTime())
    ).toBe('Yesterday');
  });

  test('returns long locale date for older days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 7, 25, 12, 0, 0));
    const label = formatMessageDayLabel(
      new Date(2024, 7, 23, 9, 0, 0).getTime(),
      Date.now(),
      'en-US'
    );
    expect(label).toBe('Friday, August 23');
  });
});

describe('formatAuthorLabel', () => {
  test('shows default phone name without suffix', () => {
    expect(formatAuthorLabel('···0100', '0100')).toEqual({
      name: '···0100',
      last4Suffix: null,
    });
  });

  test('appends last4 when name is customized', () => {
    expect(formatAuthorLabel('Alex', '0100')).toEqual({
      name: 'Alex',
      last4Suffix: '0100',
    });
  });

  test('falls back to Someone without suffix when empty', () => {
    expect(formatAuthorLabel(null, '0100')).toEqual({
      name: 'Someone',
      last4Suffix: null,
    });
  });

  test('omits suffix when phone last4 unknown', () => {
    expect(formatAuthorLabel('Alex', null)).toEqual({
      name: 'Alex',
      last4Suffix: null,
    });
  });
});
