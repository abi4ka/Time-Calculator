// Service Worker for Time Calculator PWA
const CACHE_NAME = 'time-calculator-v7';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './style.css?v=2.2',
    './script.js',
    './script.js?v=2.2',
    './manifest.json',
    './assets/icons/icon.svg',
    './assets/icons/192.png',
    './assets/icons/512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Only handle requests for same origin
    if (url.origin !== self.location.origin) return;

    // Network-First strategy: always fetch fresh assets when online, fallback to cache when offline
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
