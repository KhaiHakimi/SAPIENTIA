/*
 * Sapientia service worker (plan Sprint 5). It shows push notifications and opens the task when one is tapped. It caches
 * nothing: every page still comes from the server, so a signed-out or changed page is never served stale.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/** Only paths on this site are opened; anything else in a payload goes to the task board instead. */
function safePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/staff';
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Push payload is not JSON', error);
  }
  const title = typeof data.title === 'string' ? data.title : 'Sapientia';
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof data.body === 'string' ? data.body : '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: typeof data.tag === 'string' ? data.tag : undefined,
    lang: 'ms',
    data: { url: safePath(data.url) },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(safePath(event.notification.data && event.notification.data.url), self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (open) {
      await open.focus();
      await open.navigate(target);
      return;
    }
    await self.clients.openWindow(target);
  })());
});
