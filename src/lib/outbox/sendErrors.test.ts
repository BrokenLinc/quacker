import { describe, expect, it } from 'vitest';

import { isDuplicateSendError, isRetryableSendError } from './sendErrors';

const online = { online: true };
const offline = { online: false };

describe('isDuplicateSendError', () => {
  it('recognizes a unique violation', () => {
    expect(isDuplicateSendError({ code: '23505' })).toBe(true);
  });

  it('ignores other failures', () => {
    expect(isDuplicateSendError({ code: '42501' })).toBe(false);
    expect(isDuplicateSendError(new Error('Failed to fetch'))).toBe(false);
    expect(isDuplicateSendError(undefined)).toBe(false);
  });
});

describe('isRetryableSendError', () => {
  it('queues everything while offline', () => {
    expect(isRetryableSendError({ code: '42501' }, offline)).toBe(true);
  });

  it('queues transport failures', () => {
    expect(isRetryableSendError(new TypeError('Failed to fetch'), online)).toBe(
      true
    );
    expect(
      isRetryableSendError({ message: 'NetworkError when attempting' }, online)
    ).toBe(true);
    expect(isRetryableSendError({ message: 'Load failed' }, online)).toBe(true);
    expect(isRetryableSendError({ message: 'request timed out' }, online)).toBe(
      true
    );
  });

  it('queues server-side failures worth another attempt', () => {
    expect(isRetryableSendError({ status: 503 }, online)).toBe(true);
    expect(isRetryableSendError({ status: 429 }, online)).toBe(true);
    expect(isRetryableSendError({ code: '500' }, online)).toBe(true);
  });

  it('does not queue a request the server refused', () => {
    // RLS rejection — silenced member. Retrying can never succeed.
    expect(isRetryableSendError({ code: '42501' }, online)).toBe(false);
    expect(isRetryableSendError({ status: 400 }, online)).toBe(false);
    expect(isRetryableSendError({ code: '23505' }, online)).toBe(false);
  });

  it('does not queue an unrecognized failure', () => {
    expect(isRetryableSendError(new Error('something odd'), online)).toBe(false);
    expect(isRetryableSendError(undefined, online)).toBe(false);
  });
});
