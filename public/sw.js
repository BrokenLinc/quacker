self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Quacker', body: 'New message' };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Quacker', {
      body: data.body ?? 'Someone quacked!',
      icon: '/vite.svg',
      data: data.url,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data ?? '/';
  event.waitUntil(clients.openWindow(url));
});
