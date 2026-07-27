self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Yowl', body: 'New message' };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Yowl', {
      body: data.body ?? 'Someone yowled!',
      icon: '/icons/icon-192.png',
      data: data.url,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data ?? '/';
  event.waitUntil(clients.openWindow(url));
});
