/* Yowl service worker — Web Push delivery and push inbox. */

const INBOX_DB = 'quacker-push-inbox';
const INBOX_STORE = 'keyval';

/**
 * Minimal IndexedDB access matching idb-keyval's layout (open without an
 * explicit version, one object store, `put(value, key)`), so the app can read
 * this store with idb-keyval. See src/lib/notifications/pushInbox.ts.
 */
const withInboxStore = (mode, run) =>
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
const recordInboxMessage = async (message) => {
  if (!message || typeof message.id !== 'string') return;
  try {
    await withInboxStore('readwrite', (store) => store.put(message, message.id));
  } catch {
    // The inbox is an optimization; a failure just means a slower resume.
  }
};

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {
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
        renotify: true,
      });
    })()
  );
});

/**
 * Ask an open client to route in-app. `client.navigate()` reloads the document,
 * which throws away the warm cache and shows skeletons — exactly the stall you
 * notice when tapping a notification. Falls back to navigation only when no
 * client answers.
 */
const requestClientNavigation = (client, url) =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data ?? '/';

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
        const score = (client) => {
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
        if ('navigate' in client) {
          try {
            await client.navigate(url);
            return;
          } catch {
            // fall through to the next client
          }
        }
      }

      await self.clients.openWindow(url);
    })()
  );
});
