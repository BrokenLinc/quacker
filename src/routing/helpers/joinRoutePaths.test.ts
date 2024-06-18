import { describe, expect, test } from 'vitest';
import { joinRoutePaths } from './joinRoutePaths';

describe('joinRoutePaths', () => {
  test('empty strings', () => {
    expect(joinRoutePaths('', '')).toBe('');
  });
  test('two paths', () => {
    expect(joinRoutePaths('/parent', '/child')).toBe('/parent/child');
  });
  test('one path with querystring, one without', () => {
    expect(joinRoutePaths('/parent?p=1', '/child')).toBe('/parent/child?p=1');
  });
  test('one path without querystring, one with', () => {
    expect(joinRoutePaths('/parent', '/child?c=1')).toBe('/parent/child?c=1');
  });
  test('two paths with query-strings', () => {
    expect(joinRoutePaths('/parent?p=1', '/child?c=2')).toBe(
      '/parent/child?p=1&c=2'
    );
  });
  test('complex case', () => {
    expect(joinRoutePaths('/parent/mama?p=1&m=2', '/child/baby?c=3&b=4')).toBe(
      '/parent/mama/child/baby?p=1&m=2&c=3&b=4'
    );
  });
});
