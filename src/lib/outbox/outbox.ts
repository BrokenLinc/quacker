import { onlineManager } from '@tanstack/react-query';
import { createStore, get, set } from 'idb-keyval';
import { v4 as uuid } from 'uuid';

import { addMessage, applyMessageInsert, type Message } from '@@api/message';

import { isDuplicateSendError, isRetryableSendError } from './sendErrors';

/**
 * Durable send queue.
 *
 * Every outgoing message gets a client-generated id that becomes `messages.id`,
 * so a retry either inserts once or conflicts on the primary key — no duplicate
 * posts, and no guessing whether a pending bubble matches a server row.
 *
 * The queue lives in IndexedDB, so a message typed offline (or lost to an app
 * kill mid-send) still goes out on the next launch.
 */

export type OutboxEntry = {
  /** Client-generated uuid; becomes the row's primary key. */
  id: string;
  groupId: string;
  uid: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  text: string;
  createdAt: number;
  attempts: number;
  /** Permanently rejected — kept visible so the user can retry or discard. */
  failed: boolean;
  isAdminMessage?: boolean;
};

export type NewOutboxEntry = Omit<
  OutboxEntry,
  'id' | 'createdAt' | 'attempts' | 'failed'
>;

const store = createStore('quacker-outbox', 'keyval');
const STORE_KEY = 'entries';

let entries: OutboxEntry[] = [];
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = (): void => {
  for (const listener of listeners) listener();
};

const persist = async (): Promise<void> => {
  try {
    await set(STORE_KEY, entries, store);
  } catch {
    // A full or blocked IndexedDB must not break sending.
  }
};

const commit = (next: OutboxEntry[]): void => {
  entries = next;
  notify();
  void persist();
};

/** Restore the queue from IndexedDB. Safe to call repeatedly. */
export const loadOutbox = async (): Promise<void> => {
  if (hydrated) return;
  if (hydrating) return hydrating;

  hydrating = (async () => {
    try {
      const stored = await get<OutboxEntry[]>(STORE_KEY, store);
      if (Array.isArray(stored) && stored.length) {
        // Anything already in the queue survived a reload mid-send.
        entries = stored;
        notify();
      }
    } catch {
      // ignore
    } finally {
      hydrated = true;
      hydrating = null;
    }
  })();

  return hydrating;
};

export const getOutboxSnapshot = (): OutboxEntry[] => entries;

export const subscribeOutbox = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const removeEntry = (id: string): void => {
  if (!entries.some((entry) => entry.id === id)) return;
  commit(entries.filter((entry) => entry.id !== id));
};

const patchEntry = (id: string, patch: Partial<OutboxEntry>): void => {
  commit(
    entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
  );
};

export const discardOutboxEntry = (id: string): void => removeEntry(id);

/** Convert an entry into the message shape the chat list renders. */
export const outboxEntryToMessage = (entry: OutboxEntry): Message => ({
  id: entry.id,
  uid: entry.uid,
  authorName: entry.isAdminMessage ? 'Yowl Admin' : entry.authorName,
  authorPhotoURL: entry.isAdminMessage ? null : entry.authorPhotoURL,
  time: entry.createdAt,
  text: entry.text,
  groupId: entry.groupId,
  isAnnouncement: false,
  isAdminMessage: Boolean(entry.isAdminMessage),
});

const attempt = async (
  entry: OutboxEntry,
  options: { keepOnRejection: boolean }
): Promise<'sent' | 'retry'> => {
  try {
    await addMessage({
      id: entry.id,
      uid: entry.uid,
      authorName: entry.authorName,
      authorPhotoURL: entry.authorPhotoURL,
      text: entry.text,
      groupId: entry.groupId,
      isAdminMessage: entry.isAdminMessage,
    });
    // Show it as a real message right away rather than waiting for the
    // Realtime echo to come back around.
    applyMessageInsert(outboxEntryToMessage(entry));
    removeEntry(entry.id);
    return 'sent';
  } catch (error) {
    if (isDuplicateSendError(error)) {
      // Duplicate key means the row already landed — merge it the same way a
      // fresh insert would, or the pending bubble disappears with no server copy
      // in the cache until the next refetch.
      applyMessageInsert(outboxEntryToMessage(entry));
      removeEntry(entry.id);
      return 'sent';
    }
    if (isRetryableSendError(error, { online: onlineManager.isOnline() })) {
      patchEntry(entry.id, { attempts: entry.attempts + 1 });
      return 'retry';
    }
    // Rejected outright. During a background flush the entry stays visible with
    // a retry; on the composer's own attempt it is dropped so the text can go
    // back in the input instead of being shown twice.
    if (options.keepOnRejection) {
      patchEntry(entry.id, { attempts: entry.attempts + 1, failed: true });
    } else {
      removeEntry(entry.id);
    }
    throw error;
  }
};

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Retry with backoff after a transient failure.
 *
 * The `online` event fires the instant the interface is back, which is often
 * before a request can actually complete — without this, a send that lost that
 * race would sit at "sending…" until the next app resume.
 */
const scheduleRetry = (attempts: number): void => {
  if (retryTimer !== null || !onlineManager.isOnline()) return;
  const delay = Math.min(2_000 * 2 ** Math.min(attempts, 4), 30_000);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushOutbox();
  }, delay);
};

const cancelRetry = (): void => {
  if (retryTimer === null) return;
  clearTimeout(retryTimer);
  retryTimer = null;
};

/**
 * Try to send everything queued. Stops at the first retryable failure so the
 * queue keeps its order and does not hammer a dead connection.
 */
export const flushOutbox = async (): Promise<void> => {
  if (flushing) return;
  await loadOutbox();
  cancelRetry();
  flushing = true;
  try {
    for (const entry of [...entries]) {
      if (entry.failed) continue;
      if (!onlineManager.isOnline()) break;
      try {
        const result = await attempt(entry, { keepOnRejection: true });
        if (result === 'retry') {
          scheduleRetry(entry.attempts + 1);
          break;
        }
      } catch {
        // Permanent failure is recorded on the entry; keep draining the rest.
      }
    }
  } finally {
    flushing = false;
  }
};

/**
 * Queue a message and try to send it immediately.
 *
 * Resolves as soon as the message is durably queued. Throws only when the
 * server permanently rejects it, which is what lets the composer restore the
 * text and show an error for real problems while staying silent when the
 * network is simply down.
 */
export const sendOrQueueMessage = async (
  input: NewOutboxEntry
): Promise<void> => {
  await loadOutbox();

  const entry: OutboxEntry = {
    ...input,
    id: uuid(),
    createdAt: Date.now(),
    attempts: 0,
    failed: false,
  };
  commit([...entries, entry]);

  if (!onlineManager.isOnline()) return;

  // Stays queued on a retryable failure; the backoff timer and the lifecycle
  // listener both keep trying.
  if ((await attempt(entry, { keepOnRejection: false })) === 'retry') {
    scheduleRetry(1);
  }
};

/** Retry a permanently failed entry (user-initiated). */
export const retryOutboxEntry = async (id: string): Promise<void> => {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;
  patchEntry(id, { failed: false });
  await flushOutbox();
};

/** Drop every queued message — the device changed hands. */
export const clearOutbox = async (): Promise<void> => {
  hydrated = true;
  cancelRetry();
  commit([]);
  await persist();
};

/** Test helper. */
export const resetOutboxForTests = (): void => {
  entries = [];
  hydrated = true;
  hydrating = null;
  cancelRetry();
  listeners.clear();
};
