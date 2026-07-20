self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Hork', body: 'New message' };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Hork', {
      body: data.body ?? 'Someone horked!',
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
