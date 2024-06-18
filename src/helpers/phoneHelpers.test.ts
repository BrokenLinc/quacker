import { describe, expect, test } from 'vitest';
import { formatPhone } from './phoneHelper';

describe('phoneHelpers', () => {
  describe('formatPhone', () => {
    test('10-digit', () => {
      expect(formatPhone('3525551234')).toBe('(352) 555-1234');
    });
    test('11-digit', () => {
      expect(formatPhone('35255512349')).toBe('(352) 555-1234 x 9');
    });
    test('12-digit', () => {
      expect(formatPhone('352555123498')).toBe('(352) 555-1234 x 98');
    });
    test('13-digit', () => {
      expect(formatPhone('3525551234987')).toBe('(352) 555-1234 x 987');
    });
    test('14-digit', () => {
      expect(formatPhone('35255512349876')).toBe('(352) 555-1234 x 9876');
    });
    test('empty', () => {
      expect(formatPhone('')).toBe('');
    });
    test('null', () => {
      expect(formatPhone(null)).toBe('');
    });
    test('undefined', () => {
      expect(formatPhone(undefined)).toBe('');
    });
  });
});
