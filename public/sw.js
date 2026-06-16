// Push-only service worker. Deliberately NOT a caching/PWA worker — it does no
// precaching or fetch interception (that's what served stale chunks before).
// Its only jobs: show a notification on push, and focus/open the chat on click.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'New message';
  const origin = self.location.origin;
  const url = data.url || '/letters';
  const options = {
    body: data.body || '',
    icon: origin + '/logo/icon-192.png',
    badge: origin + '/logo/badge-96.png',
    tag: data.tag || url || 'message',
    renotify: true,
    data: { url },
  };
  event.waitUntil(
    (async () => {
      // Skip the popup if the app is already open, focused, and viewing this
      // exact conversation — the message is already on screen via realtime, so
      // a notification would just be noise. (userVisibleOnly permits skipping
      // while a client window is visible.)
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const viewingThisChat = windows.some((c) => {
        try {
          return (
            c.visibilityState === 'visible' &&
            c.focused &&
            new URL(c.url).pathname === url
          );
        } catch {
          return false;
        }
      });
      if (viewingThisChat) return;
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/letters';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing tab and route it to the chat if one is open.
        for (const client of clients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(url);
            return;
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
