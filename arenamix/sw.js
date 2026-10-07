/* Network-first so every update you publish reaches the phone; cache is the offline fallback. */
const CACHE = 'arenamix-v57';
const CORE = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'vendor/preact.min.js', 'vendor/three.min.js', 'vendor/GLTFLoader.js', 'vendor/SkeletonUtils.js', 'chars.js', 'grass.js', 'sky.js', 'ball.js', 'vendor/RGBELoader.js', 'stadium.js', 'music.js', 'assets/stadium/stadium.glb', 'assets/stadium/seats.json', 'assets/stadium/goal.glb', 'assets/sky/stadium_bg.jpg', 'assets/sky/stadium_env.hdr', 'assets/grass/color.jpg', 'assets/grass/normal.jpg', 'assets/grass/rough.jpg', 'assets/chars/ty.glb', 'assets/chars/vegas.glb', 'assets/chars/granny.glb', 'assets/chars/anims.json', 'icons/icon-192.png', 'icons/loading-bg.jpg', 'vendor/fonts/rajdhani-500.woff2', 'vendor/fonts/rajdhani-600.woff2', 'vendor/fonts/rajdhani-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // the Unity 3D football is big and handles its own caching: leave it to the browser
  if (new URL(req.url).pathname.includes('/futbol3d/')) return;
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
