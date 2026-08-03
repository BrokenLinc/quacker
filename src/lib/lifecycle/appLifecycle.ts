import { onlineManager } from '@tanstack/react-query';

import { CACHE_OWNER_KEY, clearPersistedCache, queryClient } from '@@lib/query/client';
import { clearPushInbox, drainPushInbox } from '@@lib/notifications/pushInbox';
import { clearOutbox, flushOutbox, loadOutbox } from '@@lib/outbox/outbox';
import {
  disconnectRealtime,
  markRealtimeClosed,
  refreshRealtime,
} from '@@lib/realtime/manager';
import { supabase } from '@@lib/supabase/client';

/**
 * App resume / connectivity orchestration.
 *
 * A backgrounded PWA gets its websocket torn down by the OS with no event
 * reaching the page, so on resume the app looks connected but will never receive
 * another row. Nothing recovered from that before: tapping a notification
 * focused a stale window. This module makes every wake-up path converge on one
 * ordered recovery — refresh the session, rebuild dead channels, drain what the
 * service worker captured, flush queued sends.
 */

/** Below this, a resume is treated as a quick app switch: no full revalidate. */
const SHORT_ABSENCE_MS = 20_000;

/** How long the app may stay hidden before the websocket is dropped. */
const HIDDEN_DISCONNECT_DELAY_MS = 60_000;

let refCount = 0;
let teardown: (() => void) | null = null;
let hiddenAt: number | null = null;
let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
let resuming: Promise<void> | null = null;
/** Longest absence observed while a resume pass is in flight. */
let pendingAbsenceMs: number | null = null;
/** Set once auth has confirmed the durable caches belong to this session. */
let cacheOwnerReady = false;

const clearHiddenTimer = (): void => {
  if (hiddenTimer === null) return;
  clearTimeout(hiddenTimer);
  hiddenTimer = null;
};

/** Never let one slow request hold up the rest of the recovery. */
const SESSION_REFRESH_TIMEOUT_MS = 5_000;

const withTimeout = async (
  work: Promise<unknown>,
  timeoutMs: number
): Promise<void> => {
  await Promise.race([
    work.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
};

const runResume = async (absenceMs: number): Promise<void> => {
  clearHiddenTimer();
  if (!onlineManager.isOnline()) return;

  // Local-first — but the outbox waits until ownership is confirmed so a
  // prior account's queue cannot flush under a new session.
  if (cacheOwnerReady) void flushOutbox();
  void drainPushInbox();

  // A stale JWT would make every resync below 401, so refresh first — but a
  // hung refresh must not strand the reconnect.
  supabase.auth.startAutoRefresh().catch(() => undefined);
  await withTimeout(supabase.auth.getSession(), SESSION_REFRESH_TIMEOUT_MS);

  if (absenceMs > 0) {
    // Status can remain SUBSCRIBED after the OS kills the websocket. Force a
    // rebuild + topic resync so short absences are not left on a zombie channel
    // with queries still inside staleTime.
    markRealtimeClosed();
  }
  refreshRealtime();

  if (absenceMs >= SHORT_ABSENCE_MS) {
    // Long absence: assume we missed events on every surface, not just the
    // channels that reported themselves broken.
    void queryClient.invalidateQueries({ refetchType: 'active' });
  }
};

/**
 * Coalesce overlapping wake-up events into recovery passes, but never drop a
 * later signal entirely — re-run with the longest absence seen while busy.
 */
const scheduleResume = (absenceMs: number): void => {
  if (resuming) {
    pendingAbsenceMs =
      pendingAbsenceMs === null
        ? absenceMs
        : Math.max(pendingAbsenceMs, absenceMs);
    return;
  }

  resuming = runResume(absenceMs).finally(() => {
    resuming = null;
    if (pendingAbsenceMs === null) return;
    const next = pendingAbsenceMs;
    pendingAbsenceMs = null;
    scheduleResume(next);
  });
};

const resume = (): void => {
  const absenceMs = hiddenAt === null ? 0 : Date.now() - hiddenAt;
  hiddenAt = null;
  scheduleResume(absenceMs);
};

const suspend = (): void => {
  if (hiddenAt === null) hiddenAt = Date.now();
  supabase.auth.stopAutoRefresh().catch(() => undefined);
  clearHiddenTimer();
  hiddenTimer = setTimeout(() => {
    hiddenTimer = null;
    disconnectRealtime();
  }, HIDDEN_DISCONNECT_DELAY_MS);
};

const readCacheOwner = (): string | null => {
  try {
    return localStorage.getItem(CACHE_OWNER_KEY);
  } catch {
    return null;
  }
};

const writeCacheOwner = (userId: string | null): void => {
  try {
    if (userId) localStorage.setItem(CACHE_OWNER_KEY, userId);
    else localStorage.removeItem(CACHE_OWNER_KEY);
  } catch {
    // ignore
  }
};

const purgeLocalData = async (): Promise<void> => {
  queryClient.clear();
  await Promise.all([
    clearPersistedCache(),
    clearOutbox(),
    clearPushInbox(),
  ]);
};

const syncCacheOwner = (userId: string | null): void => {
  const owner = readCacheOwner();
  if (owner === userId) {
    // Same account — durable queues are safe to drain now that ownership is
    // confirmed (restore may have just hydrated this user's cache).
    cacheOwnerReady = Boolean(userId);
    if (userId) void loadOutbox().then(() => flushOutbox());
    return;
  }
  writeCacheOwner(userId);
  // Missing owner still means IndexedDB may hold a previous account's rooms
  // (cleared localStorage, incomplete sign-out). Always purge on mismatch —
  // and only mark ready after purge so a concurrent resume cannot flush the
  // prior account's outbox.
  cacheOwnerReady = false;
  void purgeLocalData().then(() => {
    cacheOwnerReady = Boolean(userId);
  });
};

const install = (): (() => void) => {
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') resume();
    else suspend();
  };

  // bfcache restore: `pageshow` is the only reliable signal in some browsers.
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) resume();
  };

  const onOnline = (isOnline: boolean) => {
    if (!isOnline) return;
    // Independent of `resume()` so a coalesced pass in flight cannot swallow it.
    if (cacheOwnerReady) void flushOutbox();
    resume();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pageshow', onPageShow);
  // Page Lifecycle API — Chrome freezes backgrounded tabs and resumes them
  // without a visibilitychange on the way back out. Fired on the document.
  document.addEventListener('resume', resume);
  document.addEventListener('freeze', suspend);
  const unsubscribeOnline = onlineManager.subscribe(onOnline);

  const { data: authSubscription } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_OUT') {
        cacheOwnerReady = false;
        writeCacheOwner(null);
        void purgeLocalData();
        return;
      }
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        syncCacheOwner(session?.user.id ?? null);
      }
    }
  );

  // Outbox flush waits for syncCacheOwner so a prior account's queue cannot
  // run under a new session. Push inbox only merges into already-cached rooms.
  if (document.visibilityState === 'visible') void drainPushInbox();

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pageshow', onPageShow);
    document.removeEventListener('resume', resume);
    document.removeEventListener('freeze', suspend);
    unsubscribeOnline();
    authSubscription.subscription.unsubscribe();
    clearHiddenTimer();
  };
};

/**
 * Install the listeners once for the app's lifetime. Reference-counted so a
 * StrictMode double-mount does not register duplicates.
 */
export const installAppLifecycle = (): (() => void) => {
  refCount += 1;
  if (refCount === 1) teardown = install();

  return () => {
    refCount -= 1;
    if (refCount > 0 || !teardown) return;
    teardown();
    teardown = null;
  };
};

/** Force a recovery pass (used by notification navigation and tests). */
export const resumeAppSync = (): void => resume();
