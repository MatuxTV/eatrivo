---
name: pwa-optimizer
description: >
  Sub-agent pre Antigravity zameraný na optimalizáciu a implementáciu Progressive Web Apps (PWA).
  Použij tento skill vždy, keď sa pracuje s PWA funkcionalitou — vrátane Service Workerov,
  Web App Manifestov, offline režimu, cache stratégií, push notifikácií, instalovateľnosti,
  performance auditu, Lighthouse skóre, alebo keď používateľ spomína "PWA", "service worker",
  "offline", "manifest.json", "instalovateľná appka", "cache stratégia", "workbox",
  "app shell", "precaching", "background sync", alebo akúkoľvek optimalizáciu webovej aplikácie
  pre mobilné zariadenia. Trigger aj keď niekto chce zmeniť existujúcu webovku na PWA,
  alebo keď sa rieši performance a loading speed. Tento skill je POVINNÝ pre každý PWA-related
  task v rámci Antigravity projektov.
---

# PWA Optimizer — Antigravity Sub-Agent

Tento skill je špecializovaný sub-agent pre Antigravity framework. Jeho úlohou je zabezpečiť,
že každá PWA implementácia spĺňa produkčné štandardy, je správne optimalizovaná a prejde
auditom bez problémov.

## Kedy sa aktivuje

Tento agent sa zapája do KAŽDÉHO tasku, ktorý sa dotýka:
- Vytvorenia novej PWA alebo konverzie existujúcej webovej aplikácie na PWA
- Service Worker implementácie alebo úpravy
- Cache stratégií (Cache First, Network First, Stale-While-Revalidate, atď.)
- Web App Manifestu (manifest.json / manifest.webmanifest)
- Offline funkcionality
- Push notifikácií
- Background Sync / Periodic Background Sync
- Instalovateľnosti (A2HS — Add to Home Screen)
- Performance optimalizácie (Core Web Vitals, Lighthouse audit)
- App Shell architektúry

## Workflow — Krok za krokom

### 1. AUDIT — Analýza aktuálneho stavu

Pred akoukoľvek zmenou najprv urob analýzu. Prečítaj `references/audit-checklist.md`.

**Čo kontrolovať:**
- Existuje `manifest.webmanifest` alebo `manifest.json`? Je kompletný?
- Existuje Service Worker? Aká je jeho stratégia?
- Sú správne nastavené ikony (192x192, 512x512, maskable)?
- Je `<meta name="theme-color">` a `<link rel="manifest">` v HTML?
- Existuje offline fallback stránka?
- Aké sú Core Web Vitals (LCP, FID/INP, CLS)?
- Je HTTPS aktívne? (PWA vyžaduje HTTPS)
- Sú nastavené správne HTTP cache headers?

### 2. MANIFEST — Web App Manifest

Prečítaj `references/manifest-spec.md` pre kompletné pokyny.

**Povinné polia:**
```json
{
  "name": "Názov Aplikácie",
  "short_name": "Krátky Názov",
  "description": "Popis aplikácie",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "any",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [],
  "categories": [],
  "lang": "sk",
  "dir": "ltr"
}
```

**Časté chyby, ktorým sa vyhni:**
- Chýbajúca maskable ikona (Android ju vyžaduje pre pekné zobrazenie)
- `start_url` neodpovedá `scope`
- `short_name` presahuje 12 znakov
- Chýbajúce `screenshots` (pre Richer Install UI)
- `display` nastavené na `browser` namiesto `standalone` alebo `fullscreen`

### 3. SERVICE WORKER — Implementácia

Prečítaj `references/service-worker-strategies.md` pre detaily cache stratégií.

**Základná štruktúra Service Workera:**

```javascript
// sw.js
const CACHE_NAME = 'app-v1';
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/css/app.css',
  '/js/app.js',
  '/icons/icon-192x192.png'
];

// Install — precache kľúčových zdrojov
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate — vyčisti staré cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — stratégia podľa typu requestu
self.addEventListener('fetch', (event) => {
  // Pozri references/service-worker-strategies.md pre výber stratégie
});
```

**Registrácia v HTML:**
```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.error('SW registration failed:', err));
    });
  }
</script>
```

### 4. CACHE STRATÉGIE — Výber správneho prístupu

| Typ obsahu | Odporúčaná stratégia | Prečo |
|---|---|---|
| App Shell (HTML, CSS, JS) | Cache First | Rýchly štart, aktualizácia na pozadí |
| API dáta | Network First | Čerstvé dáta, fallback na cache |
| Obrázky | Stale-While-Revalidate | Okamžité zobrazenie, tiché obnovenie |
| Fonty | Cache First (long-lived) | Nemenia sa často |
| Dynamický obsah | Network Only + offline fallback | Vždy čerstvé, alebo offline stránka |

### 5. OFFLINE EXPERIENCE

Každá PWA MUSÍ mať zmysluplný offline zážitok:

- **Offline fallback stránka** — minimálne `/offline.html` s brandingom
- **Cached content** — kľúčové stránky dostupné offline
- **Offline indikátor** — UI element informujúci o offline stave
- **Queue for sync** — formuláre a akcie čakajúce na obnovenie spojenia

```javascript
// Detekcia online/offline stavu
window.addEventListener('online', () => {
  document.body.classList.remove('offline');
  // Sync queued actions
});

window.addEventListener('offline', () => {
  document.body.classList.add('offline');
  // Show offline indicator
});
```

### 6. PERFORMANCE OPTIMALIZÁCIA

Prečítaj `references/performance-checklist.md` pre kompletný zoznam.

**Core Web Vitals ciele:**
- **LCP** (Largest Contentful Paint): < 2.5s
- **INP** (Interaction to Next Paint): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1

**Kľúčové optimalizácie:**
- Preload kritické zdroje: `<link rel="preload">`
- Lazy loading obrázkov: `loading="lazy"`
- Code splitting a dynamic imports
- Kompresia (Brotli > Gzip)
- Optimalizácia obrázkov (WebP/AVIF, správne rozmery)
- Eliminovanie render-blocking zdrojov
- Efektívne využitie `<link rel="preconnect">` a `<link rel="dns-prefetch">`
- Font display: `font-display: swap`

### 7. PUSH NOTIFIKÁCIE (voliteľné)

```javascript
// Žiadosť o povolenie
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    // Odošli subscription na server
    await sendSubscriptionToServer(subscription);
  }
}
```

**Pravidlá:**
- NIKDY nepýtaj povolenie hneď pri prvej návšteve
- Vysvetli používateľovi PREČO chceš posielať notifikácie
- Poskytni jednoduchý spôsob odhlásenia
- Notifikácie musia byť relevantné a hodnotné

### 8. VALIDÁCIA A KONTROLA

Po každej implementácii spusti tieto kontroly:

**Automatické kontroly (scripts/):**
```bash
# Spusti kompletný PWA audit
node scripts/pwa-audit.js --url https://example.com

# Validuj manifest
node scripts/validate-manifest.js manifest.webmanifest

# Kontrola Service Workera
node scripts/check-sw.js
```

**Manuálny checklist:**
- [ ] Manifest je linkovaný v `<head>` a obsahuje všetky povinné polia
- [ ] Service Worker sa registruje a funguje
- [ ] Appka funguje offline (aspoň fallback stránka)
- [ ] Ikony 192x192 a 512x512 existujú a sú správne
- [ ] Maskable ikona je prítomná
- [ ] `theme-color` meta tag je nastavený
- [ ] HTTPS je aktívne
- [ ] Appka je instalovateľná (A2HS prompt funguje)
- [ ] Žiadne console errory pri offline režime
- [ ] Cache sa správne invaliduje pri novej verzii
- [ ] Lighthouse PWA skóre je 100
- [ ] Core Web Vitals sú v zelených hodnotách

### 9. WORKBOX INTEGRÁCIA (pre pokročilé projekty)

Pre komplexnejšie projekty je odporúčaný Workbox:

```javascript
// sw.js s Workbox
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache statické zdroje
precacheAndRoute(self.__WB_MANIFEST);

// Cache stratégie pre rôzne typy obsahu
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
    ],
  })
);
```

## Antigravity-Špecifické pravidlá

Keďže tento skill je sub-agent pre Antigravity:

1. **Konzistencia s Antigravity stackom** — Rešpektuj existujúci tech stack projektu
2. **Inkrementálny prístup** — Neprepisuj celú appku, pridávaj PWA vrstvy postupne
3. **Backwards compatibility** — PWA funkcie sú progressive enhancement, nie breaking change
4. **Monitoring** — Navrhni metriky na sledovanie PWA performance po nasadení
5. **Dokumentácia** — Každá zmena musí byť zdokumentovaná v kontexte projektu

## Čo NIKDY nerobiť

- Neregistruj Service Worker na stránke, ktorá nemá HTTPS
- Nepoužívaj `cache.addAll()` s príliš veľkým množstvom URL (max ~50 pre precache)
- Neignoruj cache versioning — vždy maj stratégiu pre invalidáciu
- Nepoužívaj `importScripts()` v Service Workeri bez fallbacku
- Neignoruj offline stav — používateľ musí vždy vedieť, že je offline
- Nenastavuj príliš agresívne caching na API endpointy
- Nepýtaj push notification permission bez kontextu
- Neignoruj `maskable` ikony — na Android vyzerajú bez nich zle
- Nepoužívaj starú `applicationCache` (AppCache) — je deprecated
