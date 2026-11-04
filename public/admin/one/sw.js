/* Only a public offline notice is cached. Never store mail, sessions, APIs, documents or authenticated HTML. */
const CACHE = 'harkas-one-offline-v1';
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
