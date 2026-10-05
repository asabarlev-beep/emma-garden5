// גינת הבית — keeps the app shell available offline. Claude API calls always go to the network.
const CACHE = 'garden-home-v8';
const SHELL = ['./', 'index.html', 'app.js?v=3', 'anthropic-sdk.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for the app's own files (so updates arrive), cache as the offline fallback.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    // 'no-cache' revalidates with GitHub Pages every time, so a new version shows up on the next open
    // instead of after the 10-minute browser cache expires.
    fetch(event.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match('index.html')))
  );
});
