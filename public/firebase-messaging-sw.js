// Pulse Web & Firebase Messaging Service Worker Fallback
// Enables native web-push event intercepting and background message notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Mock / Fallback Firebase messaging push listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Pulse Update', body: event.data.text() };
    }
  }

  const title = data.notification?.title || data.title || 'Pulse Live Notification';
  const options = {
    body: data.notification?.body || data.body || 'You have new activity on Pulse.',
    icon: data.notification?.icon || data.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=192&auto=format&fit=crop&q=80',
    badge: data.notification?.badge || data.badge || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&auto=format&fit=crop&q=80',
    data: data.data || {},
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open Pulse' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click router
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
