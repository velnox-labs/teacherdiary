// शिक्षक डायरी — service worker. Naya version dene par VERSION badlo.
const VERSION = 'v4';
const SHELL = 'sd-shell-' + VERSION;
const RUNTIME = 'sd-runtime-' + VERSION;
const PRECACHE = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => ![SHELL, RUNTIME].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase Auth / Firestore ke live API calls kabhi cache nahi hote
  if (/(googleapis\.com|firebaseio\.com|identitytoolkit|securetoken)/.test(url.hostname) && !/fonts\./.test(url.hostname)) return;

  // Page: pehle network (taaki update mile), na ho to cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => { const cp = res.clone(); caches.open(SHELL).then((c) => c.put(req, cp)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('./')))
    );
    return;
  }

  // Firebase SDK (gstatic), Google Fonts aur apni static files: cache turant, peeche se refresh
  const ok = url.origin === location.origin || /(gstatic\.com|fonts\.googleapis\.com)$/.test(url.hostname);
  if (!ok) return;
  e.respondWith(
    caches.open(RUNTIME).then((c) =>
      c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
