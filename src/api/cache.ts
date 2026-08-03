import { queryClient } from '@@lib/query/client';

import { queryKeys } from './queryKeys';

/**
 * Cache invalidation used by mutations and by resume/reconnect. Replaces the
 * old `quacker:*-changed` window events — every mounted hook reads the same
 * cache, so invalidating a key is enough to refresh all of them.
 */

/** Room list membership changed (create / join / leave / delete). */
export const invalidateGroups = (): void => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.groupsRoot });
  void queryClient.invalidateQueries({ queryKey: queryKeys.membershipRoot });
  void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCountsRoot });
};

export const invalidateUnreadCounts = (): void => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCountsRoot });
};

export const invalidateGroupMembers = (groupId: string): void => {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.groupMembers(groupId),
  });
};

export const invalidateGroupSilences = (groupId: string): void => {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.groupSilences(groupId),
  });
};

export const invalidateGroup = (groupId: string): void => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
};

/** Everything a signed-in user sees. Used when a session appears or changes. */
export const invalidateUserScopedQueries = (): void => {
  invalidateGroups();
  void queryClient.invalidateQueries({ queryKey: queryKeys.messagesRoot });
};

/**
 * Explicit user-initiated retries. These replace `window.location.reload()` —
 * reloading discards the warm cache and puts the user back through a cold start
 * to recover from what is usually a single failed request.
 */
export const retryRoom = (groupId: string): void => {
  void queryClient.refetchQueries({ queryKey: queryKeys.group(groupId) });
  void queryClient.refetchQueries({ queryKey: queryKeys.membershipRoot });
};

export const retryMessages = (groupId: string): void => {
  void queryClient.refetchQueries({ queryKey: queryKeys.messages(groupId) });
};

export const retryGroups = (): void => {
  void queryClient.refetchQueries({ queryKey: queryKeys.groupsRoot });
};

export const retryGroupMembers = (groupId: string): void => {
  void queryClient.refetchQueries({ queryKey: queryKeys.groupMembers(groupId) });
  void queryClient.refetchQueries({ queryKey: queryKeys.groupSilences(groupId) });
};
