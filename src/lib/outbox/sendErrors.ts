/**
 * Pure classification of message-send failures. Kept dependency-free so it is
 * unit-testable in the node vitest environment.
 *
 * A retryable failure keeps the message queued and silent — the user sees a
 * "queued" bubble and it sends itself when connectivity returns. A permanent
 * failure (RLS rejection, malformed row) must surface immediately so the user
 * can act on it.
 */

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  status?: unknown;
};

const asErrorLike = (error: unknown): ErrorLike =>
  error && typeof error === 'object' ? (error as ErrorLike) : {};

const textOf = (error: unknown): string => {
  const { message, details } = asErrorLike(error);
  const parts = [
    typeof message === 'string' ? message : '',
    typeof details === 'string' ? details : '',
    error instanceof Error ? error.message : '',
  ];
  return parts.join(' ').toLowerCase();
};

/** Postgres unique-violation — the row already landed, so treat it as sent. */
export const isDuplicateSendError = (error: unknown): boolean =>
  asErrorLike(error).code === '23505';

const TRANSPORT_PATTERNS = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'network error',
  'load failed',
  'fetch failed',
  'timeout',
  'timed out',
  'aborted',
  'connection closed',
  'socket hang up',
];

/** Whether a failed send should stay queued for a later attempt. */
export const isRetryableSendError = (
  error: unknown,
  options: { online: boolean }
): boolean => {
  if (!options.online) return true;
  if (isDuplicateSendError(error)) return false;

  const { code, status } = asErrorLike(error);

  const numericStatus =
    typeof status === 'number'
      ? status
      : typeof code === 'string' && /^\d{3}$/.test(code)
        ? Number(code)
        : null;
  if (numericStatus !== null) {
    return numericStatus === 408 || numericStatus === 429 || numericStatus >= 500;
  }

  // A Postgres / PostgREST error code means the server understood and refused.
  if (typeof code === 'string' && code.length > 0) return false;

  const text = textOf(error);
  return TRANSPORT_PATTERNS.some((pattern) => text.includes(pattern));
};
