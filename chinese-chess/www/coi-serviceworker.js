// COI Service Worker — adds COOP/COEP for cross-origin isolation (SharedArrayBuffer)
var CACHE = 'coi-v1';

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(['/']).catch(function() {});
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
      })
    ])
  );
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;
  if (url.indexOf('coi-serviceworker') !== -1) return;
  event.respondWith(
    caches.match(event.request).then(function(r) { return r || fetch(event.request); }).then(function(r) {
      var h = new Headers(r.headers);
      h.set('Cross-Origin-Embedder-Policy', 'require-corp');
      if (event.request.mode === 'navigate') h.set('Cross-Origin-Opener-Policy', 'same-origin');
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
    }).catch(function() { return fetch(event.request); }).catch(function() {
      return new Response('', { status: 503 });
    })
  );
});
