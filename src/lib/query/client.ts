import { QueryClient } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { createStore, del, get, set } from 'idb-keyval';

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
