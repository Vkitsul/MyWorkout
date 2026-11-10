/* Offline support: app shell is served stale-while-revalidate, exercise images cache-first. */
const VERSION = 'mw-v2';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'data.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.window = self;           // data.js assigns to window.*
importScripts('data.js');
const IMAGES = (self.CATALOG || []).flatMap(e => e.img || []);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    // Images are best effort: a missing one must not break the install.
    for (let i = 0; i < IMAGES.length; i += 40) {
      await Promise.allSettled(IMAGES.slice(i, i + 40).map(async url => {
        if (!(await cache.match(url))) await cache.add(url);
      }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.includes('/img/')) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // App shell: network first so updates show up immediately, cache when offline.
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const key = req.mode === 'navigate' ? 'index.html' : req;
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) await cache.put(key, res.clone());
      return res;
    } catch (e) {
      return (await cache.match(key, { ignoreSearch: true })) || new Response('Offline', { status: 503 });
    }
  })());
});
