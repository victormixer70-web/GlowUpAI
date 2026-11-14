/* Code (pages, screens, scripts) is network-first so every update you publish reaches the phone at once.
   The heavy files (characters, stadium, pictures, fonts, libraries) come from the phone's copy: they used to be
   downloaded again on every launch (about 26 MB). Each release changes CACHE, which throws the old copies away,
   so a changed asset is fetched again after an update: always bump CACHE when an asset changes. */
const CACHE = 'arenamix-v330';
const CORE = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'vendor/preact.min.js', 'vendor/three.min.js', 'vendor/GLTFLoader.js', 'vendor/SkeletonUtils.js', 'chars.js', 'gear.js', 'posters.js', 'hero.js', 'progress.js', 'results.js', 'daily.js', 'sfx.js', 'online.js', 'social.js', 'teams.js', 'mystad.js', 'vendor/peerjs.min.js', 'grass.js', 'sky.js', 'ball.js', 'vendor/RGBELoader.js', 'stadium.js', 'music.js', 'ui-fx.js', 'juice.js', 'i18n.js', 'i18n-en.js', 'assets/stadium/stadium.glb', 'assets/stadium/seats.json', 'assets/stadium/goal.glb', 'assets/sky/stadium_bg.jpg', 'assets/sky/stadium_env.hdr', 'assets/grass/color.jpg', 'assets/grass/normal.jpg', 'assets/grass/rough.jpg', 'assets/chars/anims.json', 'assets/ball/starball.webp?v=1', 'icons/logo-192.png', 'privacidad.html', 'icons/loading-bg3.jpg', 'icons/ld-ball.webp?v=1', 'assets/lobby_bg.jpg', 'assets/bg_estadio.jpg', 'assets/bg_tribuna.jpg', 'assets/bg_trofeos.jpg', 'assets/grain.png', 'vendor/fonts/luckiestguy-latin.woff2', 'vendor/fonts/russoone-latin.woff2', 'vendor/fonts/lilitaone-latin.woff2', 'vendor/fonts/rajdhani-500.woff2', 'vendor/fonts/rajdhani-600.woff2', 'vendor/fonts/rajdhani-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // the Unity 3D football is big and handles its own caching: leave it to the browser
  if (new URL(req.url).pathname.includes('/futbol3d/')) return;
  const u = new URL(req.url);
  const heavy = u.origin === location.origin && req.mode !== 'navigate' && /\/(assets|vendor|icons|brand)\/|\.(glb|hdr|jpg|jpeg|png|webp|woff2|json|mp3|ogg)$/.test(u.pathname) && (u.pathname.includes('/vendor/') || !/\.(js|html)$/.test(u.pathname)) || req.url.includes('fonts.g');
  if (heavy) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
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
