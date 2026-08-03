import type { Message } from './message';

/**
 * Pure helpers for incremental message sync. Kept dependency-free so they are
 * unit-testable in the node vitest environment.
 *
 * Messages are append-only (no UPDATE/DELETE policy on `public.messages`), so a
 * warm sync only needs rows newer than what is already cached. `created_at` has
 * no strict ordering guarantee against concurrent inserts, so every delta
 * re-reads a short overlap window and dedupes by `id`.
 */

/** Re-read this far back from the newest cached message on a delta fetch. */
export const MESSAGE_SYNC_OVERLAP_MS = 2_000;

/** Upper bound on cached messages per room, so IndexedDB stays small. */
export const MESSAGE_CACHE_MAX = 200;

/** Chronological (oldest first) with a stable tiebreak for equal timestamps. */
export const sortMessages = (messages: Message[]): Message[] =>
  [...messages].sort((a, b) =>
    a.time === b.time ? a.id.localeCompare(b.id) : a.time - b.time
  );

/** Merge server rows into cached ones, deduped by id — incoming wins. */
export const mergeMessages = (
  existing: Message[],
  incoming: Message[]
): Message[] => {
  if (!incoming.length) return sortMessages(existing);

  const byId = new Map<string, Message>();
  for (const message of existing) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);

  return sortMessages([...byId.values()]);
};

/** Keep only the newest `max` messages. */
export const trimMessages = (messages: Message[], max: number): Message[] =>
  messages.length <= max ? messages : messages.slice(messages.length - max);

/** Timestamp of the newest cached message, or null when nothing is cached. */
export const latestMessageTime = (
  messages: Message[] | undefined
): number | null => {
  if (!messages?.length) return null;
  let latest = messages[0].time;
  for (const message of messages) {
    if (message.time > latest) latest = message.time;
  }
  return latest;
};

/**
 * Lower bound for a delta fetch, or null when a cold fetch is needed.
 * Includes the overlap window so rows committed out of clock order are not lost.
 */
export const deltaSinceMs = (
  messages: Message[] | undefined,
  overlapMs: number = MESSAGE_SYNC_OVERLAP_MS
): number | null => {
  const latest = latestMessageTime(messages);
  return latest === null ? null : latest - overlapMs;
};

/**
 * A delta that filled its page may have skipped rows between the overlap window
 * and the newest page, so the cache has to be rebuilt from scratch.
 */
export const deltaHasGap = (received: number, limit: number): boolean =>
  received >= limit;
