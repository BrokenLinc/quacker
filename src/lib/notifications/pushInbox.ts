import { clear, createStore, entries } from 'idb-keyval';

import { invalidateUnreadCounts } from '@@api/cache';
import { applyMessageInsert, type Message } from '@@api/message';

/**
 * Messages captured by the service worker while the app was backgrounded.
 *
 * The SW writes every push into this store (see `public/sw.js`) using the same
 * database and object-store names idb-keyval uses, so resuming the app can paint
 * what arrived while it was away without waiting for a network round-trip.
 */

const store = createStore('quacker-push-inbox', 'keyval');

/** Wire shape written by the service worker — mirrors a `messages` row. */
export type PushedMessage = {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  text: string;
  createdAt: string;
  isAnnouncement: boolean;
};

const isPushedMessage = (value: unknown): value is PushedMessage => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.groupId === 'string' &&
    typeof v.authorId === 'string' &&
    typeof v.text === 'string'
  );
};

export const pushedMessageToMessage = (pushed: PushedMessage): Message => ({
  id: pushed.id,
  uid: pushed.authorId,
  authorName: pushed.authorName ?? null,
  authorPhotoURL: pushed.authorPhotoURL ?? null,
  time: pushed.createdAt ? new Date(pushed.createdAt).getTime() : Date.now(),
  text: pushed.text,
  groupId: pushed.groupId,
  isAnnouncement: Boolean(pushed.isAnnouncement),
});

/** Merge anything the SW stored into the cache. Returns how many were applied. */
export const drainPushInbox = async (): Promise<number> => {
  try {
    const stored = await entries(store);
    if (!stored.length) return 0;

    let applied = 0;
    for (const [, value] of stored) {
      if (!isPushedMessage(value)) continue;
      applyMessageInsert(pushedMessageToMessage(value));
      applied += 1;
    }

    await clear(store);
    if (applied > 0) invalidateUnreadCounts();
    return applied;
  } catch {
    return 0;
  }
};

/** Discard anything the service worker stashed without applying it. */
export const clearPushInbox = async (): Promise<void> => {
  try {
    await clear(store);
  } catch {
    // ignore
  }
};

/** Merge a push received while the page is alive (no inbox round-trip needed). */
export const applyPushedMessage = (value: unknown): boolean => {
  if (!isPushedMessage(value)) return false;
  applyMessageInsert(pushedMessageToMessage(value));
  return true;
};
