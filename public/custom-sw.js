self.addEventListener('install', function(event) {
  const cacheName = 'eatrivo-runtime-v1';
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(['/offline.html']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  const allowedCaches = ['eatrivo-runtime-v1'];
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName.startsWith('eatrivo-runtime-') && !allowedCaches.includes(cacheName)) {
            return caches.delete(cacheName);
          }
          return Promise.resolve(false);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match('/offline.html').then(function(response) {
        return response || Response.error();
      });
    })
  );
});

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/logo/favicon_io/android-chrome-192x192.png',
      badge: '/logo/favicon_io/android-chrome-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url
      },
      actions: [
        { action: 'explore', title: 'View' }
      ]
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
