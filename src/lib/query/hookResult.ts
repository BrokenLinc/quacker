import type { UseQueryResult } from '@tanstack/react-query';

/** Legacy tuple shape shared by every data hook: `[data, loading, error]`. */
export type HookResult<T> = [T | undefined, boolean, Error | undefined];

/**
 * Adapt a query to the tuple shape.
 *
 * Two deliberate semantics:
 * - `loading` is `isPending` (nothing to show), never `isFetching`. Cached data
 *   renders immediately while it revalidates in the background, which is what
 *   removes the skeleton when re-entering a room.
 * - `error` is only surfaced when there is no data. A failed background refetch
 *   keeps showing what we have instead of replacing the screen with an error.
 */
export const asHookResult = <T>(
  query: UseQueryResult<T | null | undefined, Error>,
  enabled = true
): HookResult<T> => {
  const data = query.data ?? undefined;
  return [
    data,
    enabled ? query.isPending : false,
    query.data === undefined ? (query.error ?? undefined) : undefined,
  ];
};
