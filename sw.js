// float — service worker
// Uses relative paths so it works on any GitHub Pages subdirectory

const CACHE_NAME = 'float-v3';

// Relative paths resolve against the SW's own URL automatically
const LOCAL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/db.js',
  './js/periods.js',
  './js/settings.js',
  './js/budget.js',
  './js/transactions.js',
  './js/alerts.js',
  './js/history.js',
  './js/router.js',
  './js/drawer.js',
  './js/ui/dashboard.js',
  './js/ui/transactions.js',
  './js/ui/gig.js',
  './js/ui/history.js',
  './js/ui/settings.js',
  './js/ui/modals.js',
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/fonts/tabler-icons.woff2',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(LOCAL_ASSETS))
      .then(() => caches.open(CACHE_NAME))
      .then(cache => Promise.allSettled(
        CDN_ASSETS.map(url => 
          fetch(url).then(r => cache.put(url, r)).catch(() => {})
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            caches.open(CACHE_NAME)
              .then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => {
          if (e.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
