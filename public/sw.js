/* NxGenSports Service Worker — Push Notifications */

const CACHE_NAME = 'nxgen-v1';

// Install — cache nothing by default, just activate
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'NxGenSports', body: event.data ? event.data.text() : 'New notification' };
  }

  const title   = data.title || 'NxGenSports';
  const options = {
    body:    data.body  || 'You have a new message',
    icon:    data.icon  || '/logo192.png',
    badge:   '/logo192.png',
    tag:     data.conversation_id || 'nxgen-message',
    renotify: true,
    data:    { url: '/Messages', conversation_id: data.conversation_id },
    actions: [{ action: 'open', title: 'Open' }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/Messages';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'navigate', url: targetUrl });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
