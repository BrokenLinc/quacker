import { describe, expect, test } from 'vitest';
import { getFullName } from './getFullName';
import { list } from './stringHelpers';

describe('stringHelpers', () => {
  describe('list', () => {
    test('2 items', () => {
      expect(list(['apples', 'oranges'])).toBe('apples & oranges');
    });
    test('3 items', () => {
      expect(list(['apples', 'oranges', 'bananas'])).toBe(
        'apples, oranges & bananas'
      );
    });
    test('no items', () => {
      expect(list([])).toBe('');
    });
  });

  describe('getFullName', () => {
    test('empty', () => {
      expect(getFullName({ firstName: '', lastName: '' })).toBe('');
    });
    test('first last', () => {
      expect(
        getFullName({ firstName: 'Hollywood', lastName: 'Buzzworth' })
      ).toBe('Hollywood Buzzworth');
    });
    test('first middle last', () => {
      expect(
        getFullName({
          firstName: 'Hollywood',
          middleName: 'Bee',
          lastName: 'Buzzworth',
        })
      ).toBe('Hollywood Bee Buzzworth');
    });
    test('last, first', () => {
      expect(
        getFullName(
          {
            firstName: 'Hollywood',
            lastName: 'Buzzworth',
          },
          {
            lastNameFirst: true,
          }
        )
      ).toBe('Buzzworth, Hollywood');
    });
    test('last, first middle', () => {
      expect(
        getFullName(
          {
            firstName: 'Hollywood',
            middleName: 'Bee',
            lastName: 'Buzzworth',
          },
          {
            lastNameFirst: true,
          }
        )
      ).toBe('Buzzworth, Hollywood Bee');
    });
  });
});
