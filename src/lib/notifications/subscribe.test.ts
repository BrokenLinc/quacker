import { describe, expect, it } from 'vitest';

import { subscriptionMatchesVapid, urlBase64ToUint8Array } from './subscribe';

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

describe('subscriptionMatchesVapid', () => {
  const keyBytes = (() => {
    const bytes = new Uint8Array(65);
    bytes[0] = 0x04;
    for (let i = 1; i < 65; i++) bytes[i] = i;
    return bytes;
  })();

  const subWithKey = (key: ArrayBuffer | null | undefined): PushSubscription =>
    ({
      options: { applicationServerKey: key, userVisibleOnly: true },
    }) as PushSubscription;

  it('returns true when applicationServerKey matches', () => {
    expect(
      subscriptionMatchesVapid(subWithKey(keyBytes.buffer), keyBytes)
    ).toBe(true);
  });

  it('returns false when applicationServerKey differs', () => {
    const other = new Uint8Array(keyBytes);
    other[1] = 0xff;
    expect(subscriptionMatchesVapid(subWithKey(other.buffer), keyBytes)).toBe(
      false
    );
  });

  it('returns null when applicationServerKey is unavailable', () => {
    expect(subscriptionMatchesVapid(subWithKey(null), keyBytes)).toBe(null);
    expect(subscriptionMatchesVapid(subWithKey(undefined), keyBytes)).toBe(
      null
    );
  });
});
