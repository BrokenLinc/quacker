import { QueryClient } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { createStore, del, get, set } from 'idb-keyval';

import { supabase } from '@@lib/supabase/client';

/**
 * Single shared cache. Query state survives unmounts, so leaving a room and
 * coming back paints from memory instead of refetching behind a skeleton.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Long enough that a quick tab-away does not refetch, short enough that
      // a real resume revalidates.
      staleTime: 30_000,
      // Cached rooms and messages stay usable across a week of cold starts.
      gcTime: 7 * 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
  },
});

const CACHE_STORE_NAME = 'quacker-query-cache';
const CACHE_KEY = 'client';

/**
 * Which account the durable caches belong to. Rooms, messages and the send queue
 * now outlive the session, so they must never hydrate under a different account.
 */
export const CACHE_OWNER_KEY = 'quacker:cache-owner';

const readCacheOwner = (): string | null => {
  try {
    return localStorage.getItem(CACHE_OWNER_KEY);
  } catch {
    return null;
  }
};

/** Bump to discard every persisted cache after an incompatible shape change. */
export const PERSIST_BUSTER = 'v1';

/** How long persisted data may be restored before it is thrown away. */
export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * IndexedDB persister. Written by hand rather than via the async-storage
 * persister so structured data goes in as-is — no JSON round-trip for what can
 * be a few hundred messages.
 */
const cacheStore = createStore(CACHE_STORE_NAME, 'keyval');

/**
 * Drop the durable cache. Rooms and messages persist across launches, so this
 * has to run whenever the device changes hands (sign-out or a different user).
 */
export const clearPersistedCache = async (): Promise<void> => {
  try {
    await del(CACHE_KEY, cacheStore);
  } catch {
    // ignore
  }
};

export const createIdbPersister = (): Persister => {
  const store = cacheStore;

  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(CACHE_KEY, client, store);
      } catch {
        // A full or blocked IndexedDB must never break the app.
      }
    },
    restoreClient: async () => {
      try {
        const owner = readCacheOwner();
        const { data } = await supabase.auth.getSession();
        const sessionUserId = data.session?.user.id ?? null;
        // Refuse to hydrate without a matching owner + session. Otherwise a
        // prior account's rooms can paint before auth finishes owner sync.
        if (!owner || !sessionUserId || owner !== sessionUserId) {
          await del(CACHE_KEY, store);
          return undefined;
        }
        return await get<PersistedClient>(CACHE_KEY, store);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(CACHE_KEY, store);
      } catch {
        // ignore
      }
    },
  };
};
