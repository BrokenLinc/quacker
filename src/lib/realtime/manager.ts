import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@@lib/supabase/client';

/**
 * Reference-counted Realtime channels.
 *
 * `supabase.channel(name)` returns an existing channel by name, and you cannot
 * add `.on()` handlers to one that has already subscribed. Rather than making
 * every hook invent a unique `channelId`, callers subscribe to a logical topic
 * and share one channel; the last unsubscriber tears it down.
 *
 * Teardown is deferred so navigating out of a room and back — or a StrictMode
 * double-mount — reuses the live channel instead of churning the socket.
 */

export type RealtimeTopic = {
  /** Stable logical identity. One channel per key, shared by all subscribers. */
  key: string;
  /** Attach `postgres_changes` handlers. Called once per channel instance. */
  configure: (channel: RealtimeChannel) => void;
  /**
   * Re-sync whatever this topic feeds. Called after a channel is rebuilt, since
   * any event that fired while the socket was down was never delivered.
   */
  resync?: () => void;
};

type Entry = {
  topic: RealtimeTopic;
  channel: RealtimeChannel;
  refs: number;
  status: string;
  generation: number;
  disposeTimer: ReturnType<typeof setTimeout> | null;
};

const TEARDOWN_DELAY_MS = 5_000;

const entries = new Map<string, Entry>();
const statusListeners = new Set<() => void>();

const notifyStatusChange = (): void => {
  for (const listener of statusListeners) listener();
};

const openChannel = (entry: Entry): RealtimeChannel => {
  // Suffix the wire name so a rebuild never collides with a channel that is
  // still being removed (removeChannel resolves asynchronously).
  const channel = supabase.channel(`${entry.topic.key}#${entry.generation}`);
  entry.topic.configure(channel);
  channel.subscribe((status) => {
    if (entries.get(entry.topic.key) !== entry) return;
    entry.status = status;
    notifyStatusChange();
  });
  return channel;
};

/**
 * Join a topic. Returns an unsubscribe function; the channel closes once every
 * subscriber has released it.
 */
export const subscribeTopic = (topic: RealtimeTopic): (() => void) => {
  let entry = entries.get(topic.key);

  if (!entry) {
    entry = {
      topic,
      channel: undefined as unknown as RealtimeChannel,
      refs: 0,
      status: 'INITIAL',
      generation: 0,
      disposeTimer: null,
    };
    entries.set(topic.key, entry);
    entry.channel = openChannel(entry);
  }

  if (entry.disposeTimer) {
    clearTimeout(entry.disposeTimer);
    entry.disposeTimer = null;
  }
  entry.refs += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const current = entries.get(topic.key);
    if (current !== entry) return;
    current.refs -= 1;
    if (current.refs > 0) return;

    current.disposeTimer = setTimeout(() => {
      const latest = entries.get(topic.key);
      if (latest !== current || latest.refs > 0) return;
      entries.delete(topic.key);
      void supabase.removeChannel(latest.channel);
      notifyStatusChange();
    }, TEARDOWN_DELAY_MS);
  };
};

/** Subscribe to aggregate channel-health changes (for connection chrome). */
export const subscribeRealtimeStatus = (listener: () => void): (() => void) => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};

export type RealtimeHealth = 'idle' | 'connecting' | 'connected' | 'degraded';

/** Aggregate health across every active topic. */
export const getRealtimeHealth = (): RealtimeHealth => {
  const active = [...entries.values()].filter((entry) => entry.refs > 0);
  if (!active.length) return 'idle';
  if (active.some((entry) => isBrokenStatus(entry.status))) return 'degraded';
  if (active.every((entry) => entry.status === 'SUBSCRIBED')) return 'connected';
  return 'connecting';
};

const isBrokenStatus = (status: string): boolean =>
  status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED';

/** Mark every channel as needing a rebuild — used before a manual disconnect. */
export const markRealtimeClosed = (): void => {
  for (const entry of entries.values()) entry.status = 'CLOSED';
  notifyStatusChange();
};

/** Drop the websocket. Channels rebuild on the next `refreshRealtime()`. */
export const disconnectRealtime = (): void => {
  if (!entries.size && !supabase.realtime.isConnected()) return;
  markRealtimeClosed();
  supabase.realtime.disconnect();
};

/**
 * Rebuild any channel that is not subscribed and re-sync the data it feeds.
 *
 * A backgrounded PWA has its websocket killed by the OS without any event
 * reaching the page, so on resume the channel looks alive to React but will
 * never deliver another row. Rebuilding plus an explicit resync is what makes
 * returning to the app show messages that arrived while it was away.
 */
export const refreshRealtime = (): void => {
  if (!supabase.realtime.isConnected()) {
    supabase.realtime.connect();
  }

  for (const entry of entries.values()) {
    if (entry.refs <= 0) continue;
    if (entry.status === 'SUBSCRIBED' || entry.status === 'INITIAL') continue;

    const stale = entry.channel;
    entry.generation += 1;
    entry.status = 'INITIAL';
    void supabase.removeChannel(stale);
    entry.channel = openChannel(entry);
    entry.topic.resync?.();
  }

  notifyStatusChange();
};

/** Force a resync of every active topic regardless of channel health. */
export const resyncAllTopics = (): void => {
  for (const entry of entries.values()) {
    if (entry.refs > 0) entry.topic.resync?.();
  }
};

/** Test helper — drops all channels and listeners. */
export const resetRealtimeForTests = (): void => {
  for (const entry of entries.values()) {
    if (entry.disposeTimer) clearTimeout(entry.disposeTimer);
    void supabase.removeChannel(entry.channel);
  }
  entries.clear();
  statusListeners.clear();
};
