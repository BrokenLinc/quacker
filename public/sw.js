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

      if (groupId) {
        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        const focusedOnGroup = windowClients.some((client) => {
          if (!client.focused) return false;
          try {
            const path = new URL(client.url).pathname;
            return path === `/${groupId}` || path.startsWith(`/${groupId}/`);
          } catch {
            return false;
          }
        });
        if (focusedOnGroup) return;
      }

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
