import { describe, expect, test } from 'vitest';
import { getFullName } from './getFullName';

describe('getFullName', () => {
  test('first and last', () => {
    expect(
      getFullName({
        firstName: 'John',
        lastName: 'Doe',
      })
    ).toBe('John Doe');
  });
  test('first, middle, and last', () => {
    expect(
      getFullName({
        firstName: 'John',
        middleName: 'Jacob',
        lastName: 'Doe',
      })
    ).toBe('John Jacob Doe');
  });
  test('first', () => {
    expect(
      getFullName({
        firstName: 'John',
        lastName: '',
      })
    ).toBe('John');
  });
  test('last', () => {
    expect(
      getFullName({
        firstName: '',
        lastName: 'Doe',
      })
    ).toBe('Doe');
  });
  test('empty', () => {
    expect(
      getFullName({
        firstName: '',
        lastName: '',
      })
    ).toBe('');
  });
});
