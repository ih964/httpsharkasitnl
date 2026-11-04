/* Only a public offline notice is cached. Never store mail, sessions, APIs, documents or authenticated HTML. */
const CACHE = 'harkas-one-offline-v2';
const OFFLINE = '/admin/one/offline.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(OFFLINE, { cache: 'reload' }))));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('harkas-one-offline-') && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin || !url.pathname.startsWith('/admin/one/')) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(async () => {
    const notice = await caches.match(OFFLINE);
    return notice || new Response('Harkas One heeft internet nodig. Verbind en probeer opnieuw.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
function safeTarget(value) {
  try { const url = new URL(typeof value === 'string' ? value : '/admin/one/', self.location.origin); if (url.origin === self.location.origin && url.pathname.startsWith('/admin/one/')) return url.href; } catch { /* Always fall back to the app. */ }
  return self.location.origin + '/admin/one/';
}
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Malformed payload never prevents a generic notification. */ }
  event.waitUntil(self.registration.showNotification(typeof payload.title === 'string' ? payload.title.slice(0, 100) : 'Harkas One', {
    body: typeof payload.body === 'string' ? payload.body.slice(0, 250) : 'Er staat een nieuwe melding voor je klaar.',
    tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 240) : 'harkas-one',
    data: { url: safeTarget(payload.url) },
    renotify: false,
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = safeTarget(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith('/admin/one/')) {
        try { await client.navigate(url); return await client.focus(); } catch { /* Try another window. */ }
      }
    }
    return self.clients.openWindow(url);
  })());
});
