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
      const payload = {
        type: 'yowl-push',
        title: data.title ?? 'Yowl',
        body: data.body ?? 'Someone yowled!',
        url: targetUrl,
        groupId,
      };

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const focusedClients = windowClients.filter((client) => client.focused);

      // App is open and focused — never show an OS notification; let the page
      // decide whether to toast (e.g. when viewing a different group).
      if (focusedClients.length > 0) {
        for (const client of focusedClients) {
          client.postMessage(payload);
        }
        return;
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: groupId ? `yowl-group-${groupId}` : 'yowl',
        data: targetUrl,
        renotify: true,
      });
    })()
  );
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

      for (const client of windowClients) {
        try {
          const path = new URL(client.url).pathname;
          const targetPath = new URL(url, self.location.origin).pathname;
          if (path === targetPath || client.url.includes(url)) {
            await client.focus();
            if ('navigate' in client) {
              await client.navigate(url);
            }
            return;
          }
        } catch {
          // continue
        }
      }

      if (windowClients[0]) {
        await windowClients[0].focus();
        if ('navigate' in windowClients[0]) {
          await windowClients[0].navigate(url);
          return;
        }
      }

      await self.clients.openWindow(url);
    })()
  );
});
