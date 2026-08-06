/**
 * Central query key factory. Roots are plain string prefixes so callers can
 * invalidate a whole family (`['groups']`) without knowing the user id.
 */
export const queryKeys = {
  groupsRoot: ['groups'] as const,
  groups: (userId: string | undefined) => ['groups', userId ?? null] as const,

  groupRoot: ['group'] as const,
  group: (groupId: string) => ['group', groupId] as const,

  groupBySlug: (slug: string) => ['groupBySlug', slug] as const,

  groupMembersRoot: ['groupMembers'] as const,
  groupMembers: (groupId: string) => ['groupMembers', groupId] as const,

  groupSilencesRoot: ['groupSilences'] as const,
  groupSilences: (groupId: string) => ['groupSilences', groupId] as const,

  membershipRoot: ['membership'] as const,
  membership: (groupId: string, userId: string) =>
    ['membership', groupId, userId] as const,

  messagesRoot: ['messages'] as const,
  messages: (groupId: string) => ['messages', groupId] as const,

  unreadCountsRoot: ['unreadCounts'] as const,
  unreadCounts: (userId: string | undefined) =>
    ['unreadCounts', userId ?? null] as const,

  pushEnabled: (userId: string | undefined) =>
    ['pushEnabled', userId ?? null] as const,

  suggestionsRoot: ['suggestions'] as const,
  suggestions: (userId: string | undefined) =>
    ['suggestions', userId ?? null] as const,
  suggestion: (suggestionId: string, userId: string | undefined) =>
    ['suggestion', suggestionId, userId ?? null] as const,

  suggestionCommentsRoot: ['suggestionComments'] as const,
  suggestionComments: (suggestionId: string) =>
    ['suggestionComments', suggestionId] as const,
};

/**
 * Query families worth keeping in IndexedDB so a cold start (or a notification
 * tap) paints real content instead of skeletons. Everything else — auth,
 * one-shot lookups, preference reads — stays memory-only.
 */
export const PERSISTED_QUERY_ROOTS: readonly string[] = [
  'groups',
  'group',
  'groupMembers',
  'membership',
  'messages',
  'unreadCounts',
];

/** True when a query key belongs to a persisted family. */
export const isPersistedQueryKey = (key: readonly unknown[]): boolean =>
  typeof key[0] === 'string' && PERSISTED_QUERY_ROOTS.includes(key[0]);
