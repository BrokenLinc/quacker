import { describe, expect, test } from 'vitest';
import { isDateFieldName } from './convertDateStringsToDates';

describe('isDateFieldName', () => {
  describe('passing values', () => {
    test('myDateTimeUtc', () => {
      expect(isDateFieldName('myDateTimeUtc')).toBeTruthy();
    });
    test('myDoneAt', () => {
      expect(isDateFieldName('myDoneAt')).toBeTruthy();
    });
    test('dateOfSomething', () => {
      expect(isDateFieldName('dateOfSomething')).toBeTruthy();
    });
  });
  describe('failing values (common)', () => {
    test('name', () => {
      expect(isDateFieldName('name')).toBeFalsy();
    });
    test('myDateOnly', () => {
      expect(isDateFieldName('myDateOnly')).toBeFalsy();
    });
    test('myDateTimeOnly', () => {
      expect(isDateFieldName('myDateTimeOnly')).toBeFalsy();
    });
  });
  describe('failing values (typos)', () => {
    test('myDate', () => {
      expect(isDateFieldName('myDate')).toBeFalsy();
    });
    test('myDateUtc', () => {
      expect(isDateFieldName('myDateUtc')).toBeFalsy();
    });
    test('myDateTime', () => {
      expect(isDateFieldName('myDateTime')).toBeFalsy();
    });
    test('myDateTimeUTC', () => {
      expect(isDateFieldName('myDateTimeUTC')).toBeFalsy();
    });
  });
});
