import { describe, expect, test } from 'vitest';
import {
  addMoney,
  coerceMoneyString,
  divideMoney,
  formatMoney,
  multiplyMoney,
  subtractMoney,
} from './moneyHelpers';

describe('formatMoney', () => {
  describe('formatMoney', () => {
    test('0 -> $0.00', () => {
      expect(formatMoney(0)).toBe('$0.00');
    });
    test('1 -> $1.00', () => {
      expect(formatMoney(1)).toBe('$1.00');
    });
    test('1.23 -> $1.23', () => {
      expect(formatMoney(1.23)).toBe('$1.23');
    });
    test('1243 -> $1,234.00', () => {
      expect(formatMoney(1234)).toBe('$1,234.00');
    });
    test('-1 -> -$1.00', () => {
      expect(formatMoney(-1)).toBe('-$1.00');
    });
    test('null', () => {
      expect(formatMoney(null)).toBe('');
    });
    test('undefined', () => {
      expect(formatMoney(undefined)).toBe('');
    });
    test('fallback', () => {
      expect(formatMoney(undefined, { fallback: 'FALLBACK' })).toBe('FALLBACK');
    });
    test('negativeFormatting: parentheses', () => {
      expect(formatMoney(-1, { negativeFormatting: 'parentheses' })).toBe(
        '($1.00)'
      );
    });
    test('negativeFormatting: remove', () => {
      expect(formatMoney(-1, { negativeFormatting: 'remove' })).toBe('$1.00');
    });
  });
  describe('coerceMoneyString', () => {
    test('null', () => {
      expect(coerceMoneyString(null)).toBe('0.00');
    });
    test('undefined', () => {
      expect(coerceMoneyString(undefined)).toBe('0.00');
    });
    test('empty string', () => {
      expect(coerceMoneyString('')).toBe('0.00');
    });
    test('1', () => {
      expect(coerceMoneyString(1)).toBe('1.00');
    });
    test('1.23', () => {
      expect(coerceMoneyString(1.23)).toBe('1.23');
    });
    test('1.234 (round down)', () => {
      expect(coerceMoneyString(1.234)).toBe('1.23');
    });
    test('1.23 (round up)', () => {
      expect(coerceMoneyString(1.235)).toBe('1.24');
    });
    test('$1,234.56', () => {
      expect(coerceMoneyString('$1,234.56')).toBe('1234.56');
    });
    test('-1', () => {
      expect(coerceMoneyString(-1)).toBe('-1.00');
    });
    test('-1.23', () => {
      expect(coerceMoneyString(-1.23)).toBe('-1.23');
    });
    test('-1.234 (round down)', () => {
      expect(coerceMoneyString(-1.234)).toBe('-1.23');
    });
    test('-1.23 (round up)', () => {
      expect(coerceMoneyString(-1.235)).toBe('-1.24');
    });
    test('-$1,234.56', () => {
      expect(coerceMoneyString('-$1,234.56')).toBe('-1234.56');
    });
  });
  // Copied from API
  describe('addMoney', () => {
    test('add two nulls = 0', () => {
      expect(addMoney(null, null)).toEqual(0);
    });
    test('add 1 and a null = 1', () => {
      expect(addMoney(1, null)).toEqual(1);
    });
    test('add 1 and 3 = 4', () => {
      expect(addMoney(1, 3)).toEqual(4);
    });
    test('add 3.13 and 2.76 = 5.89', () => {
      expect(addMoney(3.13, 2.76)).toEqual(5.89);
    });
    test('add -3 and -2 = -5', () => {
      expect(addMoney(-3, -2)).toEqual(-5);
    });
    test('add string "3" and string "2" = 5', () => {
      expect(addMoney('3', '2')).toEqual(5);
    });
    test('add string ".3" and string "2" = 2.3', () => {
      expect(addMoney('.3', '2')).toEqual(2.3);
    });
  });
  // Copied from API
  describe('subtractMoney', () => {
    test('subtract null - null = 0', () => {
      expect(subtractMoney(null, null)).toEqual(0);
    });
    test('subtract 1 - a null = 1', () => {
      expect(subtractMoney(1, null)).toEqual(1);
    });
    test('subtract 1 - 3 = -2', () => {
      expect(subtractMoney(1, 3)).toEqual(-2);
    });
    test('subtract 3.13 - 2.76 = 0.37', () => {
      expect(subtractMoney(3.13, 2.76)).toEqual(0.37);
    });
    test('subtract -3 - -2 = -1', () => {
      expect(subtractMoney(-3, -2)).toEqual(-1);
    });
    test('subtract string "3" - string "2" = 1', () => {
      expect(subtractMoney('3', '2')).toEqual(1);
    });
    test('subtract string ".3" - string "2" = -1.7', () => {
      expect(subtractMoney('.3', '2')).toEqual(-1.7);
    });
  });
  // Copied from API
  describe('divideMoney', () => {
    test('divide null by null = 0', () => {
      expect(divideMoney(null, null)).toEqual(0);
    });

    test('divide 22 by 15 = 1.47 (1.46666666667)', () => {
      expect(divideMoney(22, 15)).toEqual(1.47);
    });

    test('divide 22 by 14 = 1.57 (1.57142857143)', () => {
      expect(divideMoney(22, 14)).toEqual(1.57);
    });
  });
  // Copied from API
  describe('multiplyMoney', () => {
    test('multiple null by null = 0', () => {
      expect(multiplyMoney(null, null)).toEqual(0);
    });

    test('multiply 22.29 by 2.37 = 52.83 (52.8273)', () => {
      expect(multiplyMoney(22.29, 2.37)).toEqual(52.83);
    });

    test('multiply 22.28 by 2.34 = 52.14 (52.1352)', () => {
      expect(multiplyMoney(22.28, 2.34)).toEqual(52.14);
    });
  });
});
