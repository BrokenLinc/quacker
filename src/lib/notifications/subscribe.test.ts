import { describe, expect, it } from 'vitest';

import { urlBase64ToUint8Array } from './subscribe';

describe('urlBase64ToUint8Array', () => {
  it('decodes a 65-byte uncompressed VAPID public key', () => {
    // 65-byte 0x04 || X || Y fixture (not a real key)
    const bytes = new Uint8Array(65);
    bytes[0] = 0x04;
    for (let i = 1; i < 65; i++) bytes[i] = i;
    const b64url = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const out = urlBase64ToUint8Array(b64url);
    expect(out.byteLength).toBe(65);
    expect(out[0]).toBe(0x04);
    expect(out[64]).toBe(64);
  });
});
