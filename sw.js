var CACHE = 'read5-v1.0.1';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/app.js',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './data/cards.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) {
        fetch(e.request).then(function (resp) {
          if (resp && resp.ok && new URL(e.request.url).origin === location.origin) {
            var cp = resp.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
          }
        }).catch(function () {});
        return cached;
      }
      return fetch(e.request).then(function (resp) {
        if (resp && resp.ok && new URL(e.request.url).origin === location.origin) {
          var cp = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        }
        return resp;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
