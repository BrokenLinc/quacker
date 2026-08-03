/// <reference lib="webworker" />

/* Yowl service worker — offline app shell, Web Push delivery, and push inbox. */

import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const SHELL_URL = '/index.html';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Take over the page that installed us so the first visit already benefits from
// runtime caching. This does not reload anything: an *update* only takes control
// after the user accepts the prompt and posts SKIP_WAITING below.
clientsClaim();

// Every route is client-rendered, so any navigation can be answered by the
// precached shell. Assets and the SW itself must fall through to the network so
// a stale shell cannot shadow a new build.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(SHELL_URL), {
    denylist: [/^\/assets\//, /^\/sw\.js$/, /^\/manifest\.webmanifest$/],
  })
);

// Remote avatars are content-addressed by an email hash, so they can be served
// from cache indefinitely; the cap is there to keep the cache bounded.
registerRoute(
  ({ url }) => url.hostname.endsWith('gravatar.com'),
  new CacheFirst({
    cacheName: 'yowl-avatars',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 128,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  // Sent by the in-app update prompt when the user accepts the new version.
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

const INBOX_DB = 'quacker-push-inbox';
const INBOX_STORE = 'keyval';

/**
 * Minimal IndexedDB access matching idb-keyval's layout (open without an
 * explicit version, one object store, `put(value, key)`), so the app can read
 * this store with idb-keyval. See src/lib/notifications/pushInbox.ts.
 */
const withInboxStore = <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => T
): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(INBOX_DB);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INBOX_STORE)) {
        db.createObjectStore(INBOX_STORE);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INBOX_STORE)) {
        db.close();
        resolve(undefined);
        return;
      }
      const tx = db.transaction(INBOX_STORE, mode);
      const result = run(tx.objectStore(INBOX_STORE));
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });

/**
 * Stash a pushed message so the app can paint it the moment it resumes —
 * before any network round-trip, and even if the socket died while suspended.
 */
const recordInboxMessage = async (message: unknown): Promise<void> => {
  const id = (message as { id?: unknown } | null)?.id;
  if (typeof id !== 'string') return;
  try {
    await withInboxStore('readwrite', (store) => store.put(message, id));
  } catch {
    // The inbox is an optimization; a failure just means a slower resume.
  }
};

type PushData = {
  title?: string;
  body?: string;
  url?: string;
  groupId?: string | null;
  message?: unknown;
};

self.addEventListener('push', (event: PushEvent) => {
  const data: PushData = event.data?.json() ?? {
    title: 'Yowl',
    body: 'New message',
    url: '/',
    groupId: null,
  };

  event.waitUntil(
    (async () => {
      const groupId = data.groupId ?? null;
      const targetUrl = data.url ?? (groupId ? `/${groupId}` : '/');
      const message = data.message ?? null;

      await recordInboxMessage(message);

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const hasFocusedClient = windowClients.some((client) => client.focused);

      // Tell every live client, focused or not, so a backgrounded-but-alive page
      // has the message in its cache before the user switches back. The
      // `focused` flag lets the page decide whether to toast.
      for (const client of windowClients) {
        client.postMessage({
          type: 'yowl-push',
          title: data.title ?? 'Yowl',
          body: data.body ?? 'Someone yowled!',
          url: targetUrl,
          groupId,
          message,
          focused: Boolean(client.focused),
        });
      }

      // App is open and focused — never show an OS notification; let the page
      // decide whether to toast (e.g. when viewing a different group).
      if (hasFocusedClient) return;

      await self.registration.showNotification(data.title ?? 'Yowl', {
        body: data.body ?? 'Someone yowled!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: groupId ? `yowl-group-${groupId}` : 'yowl',
        data: targetUrl,
        // Re-alert for a second message in the same room instead of silently
        // replacing the previous notification.
        renotify: true,
      } as NotificationOptions);
    })()
  );
});

/**
 * Ask an open client to route in-app. `client.navigate()` reloads the document,
 * which throws away the warm cache and shows skeletons — exactly the stall you
 * notice when tapping a notification. Falls back to navigation only when no
 * client answers.
 */
const requestClientNavigation = (client: WindowClient, url: string) =>
  new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    try {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => finish(event.data?.ok === true);
      client.postMessage({ type: 'yowl-navigate', url }, [channel.port2]);
      setTimeout(() => finish(false), 700);
    } catch {
      finish(false);
    }
  });

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url: string = event.notification.data ?? '/';

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      let targetPath = url;
      try {
        targetPath = new URL(url, self.location.origin).pathname;
      } catch {
        // keep url as-is
      }

      // Prefer a client already on the room, then any other client.
      const ordered = [...windowClients].sort((a, b) => {
        const score = (client: WindowClient) => {
          try {
            return new URL(client.url).pathname === targetPath ? 0 : 1;
          } catch {
            return 1;
          }
        };
        return score(a) - score(b);
      });

      for (const client of ordered) {
        try {
          await client.focus();
        } catch {
          // Focus can be refused; still try to hand off the route.
        }
        if (await requestClientNavigation(client, url)) return;
        try {
          await client.navigate(url);
          return;
        } catch {
          // fall through to the next client
        }
      }

      await self.clients.openWindow(url);
    })()
  );
});
