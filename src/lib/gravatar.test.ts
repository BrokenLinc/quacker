import { describe, expect, test } from 'vitest';

import {
  getGravatarAvatarUrl,
  getGravatarHash,
  normalizeGravatarEmail,
  resolvePhotoURL,
} from './gravatar';

describe('gravatar', () => {
  test('normalizeGravatarEmail trims and lowercases', () => {
    expect(normalizeGravatarEmail('  User@Example.COM ')).toBe(
      'user@example.com'
    );
  });

  test('getGravatarHash uses SHA256 of normalized email', async () => {
    await expect(getGravatarHash('user@example.com')).resolves.toBe(
      'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514'
    );
  });

  test('getGravatarAvatarUrl builds v3 avatar URL', () => {
    expect(
      getGravatarAvatarUrl(
        'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
        { size: 80, default: '404' }
      )
    ).toBe(
      'https://0.gravatar.com/avatar/b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514?s=80&d=404'
    );
  });

  test('resolvePhotoURL prefers explicit photo URL', async () => {
    await expect(
      resolvePhotoURL('https://example.com/me.jpg', 'user@example.com')
    ).resolves.toBe('https://example.com/me.jpg');
  });

  test('resolvePhotoURL falls back to Gravatar from email', async () => {
    await expect(resolvePhotoURL(null, 'user@example.com')).resolves.toBe(
      'https://0.gravatar.com/avatar/b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514?d=404'
    );
  });
});
