/* Network-first so every update you publish reaches the phone; cache is the offline fallback. */
const CACHE = 'arenamix-v22';
const CORE = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'vendor/preact.min.js', 'vendor/three.min.js', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    // A navigation Request can't be copied with options, so page loads are fetched by URL.
    (req.mode === 'navigate' ? fetch(req.url, { cache: 'no-store' })
      : new URL(req.url).origin === location.origin ? fetch(new Request(req, { cache: 'no-store' })) : fetch(req)).then((res) => {
      if (res.ok && (new URL(req.url).origin === location.origin || req.url.includes('fonts.g'))) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
