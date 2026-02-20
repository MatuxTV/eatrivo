# Service Worker Cache Stratégie — Kompletný sprievodca

## Prehľad stratégií

### 1. Cache First (Cache Falling Back to Network)

**Kedy použiť:** Statické assety, fonty, ikony — veci, ktoré sa nemenia často.

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          // Uložiť novú odpoveď do cache
          const clone = response.clone();
          caches.open('static-v1').then(cache => cache.put(event.request, clone));
          return response;
        })
      )
  );
});
```

**Výhody:** Extrémne rýchle, funguje offline.
**Nevýhody:** Obsah môže byť zastaralý. Vyžaduje cache versioning pre aktualizácie.

---

### 2. Network First (Network Falling Back to Cache)

**Kedy použiť:** API requesty, dynamický obsah, stránky kde čerstvosť je dôležitá.

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Uložiť čerstvú odpoveď do cache
        const clone = response.clone();
        caches.open('dynamic-v1').then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

**Výhody:** Vždy čerstvé dáta keď je sieť dostupná.
**Nevýhody:** Pomalšie (čaká na sieť), offline len ak bolo predtým v cache.

**S timeoutom (odporúčané):**
```javascript
function networkFirstWithTimeout(request, cacheName, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      caches.match(request).then(cached => {
        if (cached) resolve(cached);
      });
    }, timeout);

    fetch(request).then(response => {
      clearTimeout(timeoutId);
      const clone = response.clone();
      caches.open(cacheName).then(cache => cache.put(request, clone));
      resolve(response);
    }).catch(() => {
      clearTimeout(timeoutId);
      caches.match(request).then(cached => {
        cached ? resolve(cached) : reject(new Error('Offline, no cache'));
      });
    });
  });
}
```

---

### 3. Stale-While-Revalidate

**Kedy použiť:** Obrázky, avatary, non-critical CSS/JS — kde okamžitá odozva je dôležitejšia než čerstvosť.

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open('swr-v1').then(cache =>
      cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          cache.put(event.request, response.clone());
          return response;
        });
        return cached || fetchPromise;
      })
    )
  );
});
```

**Výhody:** Okamžitá odpoveď z cache + automatická aktualizácia na pozadí.
**Nevýhody:** Prvý request nemá cache. Obsah je vždy o 1 návštevu pozadu.

---

### 4. Cache Only

**Kedy použiť:** Len pre precached assety, kde vieš, že sú vždy v cache.

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request));
});
```

---

### 5. Network Only

**Kedy použiť:** Analytics, non-GET requesty, real-time dáta.

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
```

---

## Kompletný Service Worker s routing

```javascript
const PRECACHE = 'precache-v1';
const RUNTIME_CACHE = 'runtime-v1';
const API_CACHE = 'api-v1';
const IMAGE_CACHE = 'images-v1';

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/css/app.css',
  '/js/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// === INSTALL ===
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// === ACTIVATE ===
self.addEventListener('activate', (event) => {
  const currentCaches = [PRECACHE, RUNTIME_CACHE, API_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => !currentCaches.includes(name))
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// === FETCH ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignoruj non-GET requesty
  if (request.method !== 'GET') return;

  // Ignoruj chrome-extension a iné neštandardné schémy
  if (!url.protocol.startsWith('http')) return;

  // Ignoruj cross-origin requesty (okrem CDN)
  if (url.origin !== location.origin && !isTrustedCDN(url)) return;

  // === ROUTING ===

  // Navigačné requesty → Network First s offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // API requesty → Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Obrázky → Stale-While-Revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Statické assety → Cache First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Default → Network First
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// === HELPER FUNKCIE ===

function cacheFirst(request, cacheName) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(cacheName).then(cache => cache.put(request, clone));
      }
      return response;
    });
  });
}

function networkFirst(request, cacheName) {
  return fetch(request)
    .then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(cacheName).then(cache => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(response => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
}

function isStaticAsset(url) {
  return /\.(css|js|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|avif|ico)$/i.test(url.pathname);
}

function isTrustedCDN(url) {
  const trustedOrigins = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://cdnjs.cloudflare.com',
    'https://cdn.jsdelivr.net'
  ];
  return trustedOrigins.some(origin => url.href.startsWith(origin));
}
```

## Background Sync

Pre offline formuláre a akcie:

```javascript
// V hlavnej appke — pridaj do queue
async function addToSyncQueue(data) {
  const db = await openDB('sync-queue', 1, {
    upgrade(db) {
      db.createObjectStore('requests', { autoIncrement: true });
    }
  });
  await db.add('requests', {
    url: '/api/submit',
    method: 'POST',
    body: JSON.stringify(data),
    timestamp: Date.now()
  });

  // Registruj sync event
  const reg = await navigator.serviceWorker.ready;
  await reg.sync.register('sync-queue');
}

// V Service Workeri — spracuj queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processQueue());
  }
});

async function processQueue() {
  const db = await openDB('sync-queue', 1);
  const requests = await db.getAll('requests');

  for (const req of requests) {
    try {
      await fetch(req.url, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: req.body
      });
      await db.delete('requests', req.id);
    } catch (err) {
      // Ak zlyhá, sync sa pokúsi znova
      console.error('Sync failed for request:', err);
      break;
    }
  }
}
```

## Cache Versioning Stratégia

```javascript
// Centralizované verzie
const CACHE_VERSIONS = {
  precache: 'precache-v2',    // Zvýš pri zmene statických assetov
  runtime: 'runtime-v1',       // Zvýš pri zmene fetch logiky
  api: 'api-v1',              // Zvýš pri zmene API cache stratégie
  images: 'images-v1'         // Zvýš pri potrebe vyčistiť image cache
};

// Pri aktivácii vymaž všetko, čo nie je v aktuálnych verziách
self.addEventListener('activate', (event) => {
  const valid = new Set(Object.values(CACHE_VERSIONS));
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => !valid.has(n)).map(n => caches.delete(n))
      )
    )
  );
});
```

## Update Flow — Informovanie používateľa

```javascript
// V hlavnej appke
navigator.serviceWorker.register('/sw.js').then(reg => {
  // Kontroluj aktualizácie
  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // Nová verzia je pripravená — informuj používateľa
        showUpdateBanner();
      }
    });
  });
});

function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  banner.innerHTML = `
    <p>Nová verzia je dostupná!</p>
    <button onclick="window.location.reload()">Aktualizovať</button>
  `;
  document.body.appendChild(banner);
}
```
