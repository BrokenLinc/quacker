import { onlineManager } from '@tanstack/react-query';

import { clearPersistedCache, queryClient } from '@@lib/query/client';
import { clearPushInbox, drainPushInbox } from '@@lib/notifications/pushInbox';
import { clearOutbox, flushOutbox, loadOutbox } from '@@lib/outbox/outbox';
import { disconnectRealtime, refreshRealtime } from '@@lib/realtime/manager';
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

  // Both are local-first and must not queue behind the network work below.
  void flushOutbox();
  void drainPushInbox();

  // A stale JWT would make every resync below 401, so refresh first — but a
  // hung refresh must not strand the reconnect.
  supabase.auth.startAutoRefresh().catch(() => undefined);
  await withTimeout(supabase.auth.getSession(), SESSION_REFRESH_TIMEOUT_MS);

  // Rebuilds channels that died while suspended and resyncs what they feed.
  refreshRealtime();

  if (absenceMs >= SHORT_ABSENCE_MS) {
    // Long absence: assume we missed events on every surface, not just the
    // channels that reported themselves broken.
    void queryClient.invalidateQueries({ refetchType: 'active' });
  }
};

/** Coalesce overlapping wake-up events into a single recovery pass. */
const resume = (): void => {
  const absenceMs = hiddenAt === null ? 0 : Date.now() - hiddenAt;
  hiddenAt = null;
  if (resuming) return;
  resuming = runResume(absenceMs).finally(() => {
    resuming = null;
  });
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

/**
 * Which account the durable caches belong to. Rooms, messages and the send queue
 * now outlive the session, so they must never survive into a different account on
 * a shared device.
 */
const CACHE_OWNER_KEY = 'quacker:cache-owner';

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
  if (owner === userId) return;
  writeCacheOwner(userId);
  if (owner !== null) void purgeLocalData();
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
    void flushOutbox();
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
        writeCacheOwner(null);
        void purgeLocalData();
        return;
      }
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        syncCacheOwner(session?.user.id ?? null);
      }
    }
  );

  void loadOutbox().then(() => flushOutbox());
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
