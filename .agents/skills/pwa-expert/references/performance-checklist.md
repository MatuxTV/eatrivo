# Performance Checklist pre PWA

## Core Web Vitals — Detailný sprievodca

### LCP (Largest Contentful Paint) — cieľ: < 2.5s

**Čo to je:** Čas, za ktorý sa zobrazí najväčší viditeľný element na stránke.

**Bežné LCP elementy:** hero image, veľký text blok, video poster, SVG.

**Optimalizácie:**

1. **Preload LCP element**
```html
<!-- Pre obrázok -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

<!-- Pre font používaný v LCP texte -->
<link rel="preload" as="font" href="/fonts/heading.woff2" crossorigin type="font/woff2">
```

2. **Optimalizuj obrázky**
```html
<img
  src="/hero.webp"
  srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 1200px"
  width="1200"
  height="630"
  alt="Hero image"
  fetchpriority="high"
  decoding="async"
>
```

3. **Eliminuj render-blocking zdroje**
```html
<!-- CSS: inline kritické, defer zvyšok -->
<style>/* Inline critical CSS */</style>
<link rel="stylesheet" href="/css/non-critical.css" media="print" onload="this.media='all'">

<!-- JS: defer alebo async -->
<script src="/js/app.js" defer></script>
```

4. **Server-side optimalizácie**
- Použi CDN pre statické assety
- Zapni Brotli/Gzip kompresiu
- Optimalizuj TTFB (server response time < 200ms ideálne)
- HTTP/2 push pre kritické zdroje (ak server podporuje)

---

### INP (Interaction to Next Paint) — cieľ: < 200ms

**Čo to je:** Najdlhšia latencia medzi user interakciou a vizuálnou odpoveďou.

**Optimalizácie:**

1. **Rozbi long tasks**
```javascript
// Zlé — blokuje main thread
function processLargeArray(items) {
  items.forEach(item => heavyComputation(item));
}

// Dobré — yielduj main thread
async function processLargeArray(items) {
  for (let i = 0; i < items.length; i++) {
    heavyComputation(items[i]);
    if (i % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// Ešte lepšie — scheduler.yield() (ak dostupné)
async function processLargeArray(items) {
  for (let i = 0; i < items.length; i++) {
    heavyComputation(items[i]);
    if (i % 100 === 0 && 'scheduler' in window) {
      await scheduler.yield();
    }
  }
}
```

2. **Web Workers pre ťažkú prácu**
```javascript
// worker.js
self.addEventListener('message', (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
});

// main.js
const worker = new Worker('/worker.js');
worker.postMessage(data);
worker.onmessage = (e) => updateUI(e.data);
```

3. **Debounce/throttle input handlers**
```javascript
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

searchInput.addEventListener('input', debounce(handleSearch, 300));
```

4. **Optimalizuj event handlery**
```javascript
// Použi passive listeners pre scroll/touch
element.addEventListener('scroll', handler, { passive: true });
element.addEventListener('touchstart', handler, { passive: true });
```

---

### CLS (Cumulative Layout Shift) — cieľ: < 0.1

**Čo to je:** Miera neočakávaných posunov layoutu počas životnosti stránky.

**Optimalizácie:**

1. **Explicitné rozmery pre médiá**
```html
<img src="photo.jpg" width="800" height="600" alt="...">
<video width="640" height="360"></video>
<iframe width="560" height="315"></iframe>
```

2. **Aspect ratio pre responzívne elementy**
```css
.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

3. **Font loading bez layout shift**
```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  /* Použi size-adjust pre minimalizáciu FOUT */
  size-adjust: 105%;
  ascent-override: 90%;
  descent-override: 20%;
}
```

4. **Rezervuj priestor pre dynamický obsah**
```css
/* Pre reklamy/embedy */
.ad-slot {
  min-height: 250px;
  background: #f0f0f0;
}

/* Pre skeleton loading */
.skeleton {
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

5. **Animácie cez transform, nie layout properties**
```css
/* Zlé — spôsobuje layout shift */
.animate {
  animation: bad 0.3s;
}
@keyframes bad {
  from { height: 0; margin-top: 20px; }
  to { height: 100px; margin-top: 0; }
}

/* Dobré — compositor-only properties */
.animate {
  animation: good 0.3s;
}
@keyframes good {
  from { transform: scaleY(0); opacity: 0; }
  to { transform: scaleY(1); opacity: 1; }
}
```

---

## Ďalšie Performance Optimalizácie

### Resource Hints
```html
<head>
  <!-- Pre kritické 3rd party: preconnect (DNS + TCP + TLS) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://api.example.com">

  <!-- Pre menej kritické: dns-prefetch -->
  <link rel="dns-prefetch" href="https://analytics.example.com">

  <!-- Preload kritické zdroje -->
  <link rel="preload" as="font" href="/fonts/main.woff2" crossorigin type="font/woff2">
  <link rel="preload" as="style" href="/css/critical.css">
  <link rel="preload" as="script" href="/js/app.js">

  <!-- Prefetch pre pravdepodobné ďalšie stránky -->
  <link rel="prefetch" href="/dashboard">

  <!-- Prerender pre vysoko pravdepodobné navigácie -->
  <link rel="prerender" href="/login">
</head>
```

### Lazy Loading
```html
<!-- Obrázky pod fold-om -->
<img src="photo.jpg" loading="lazy" width="800" height="600" alt="...">

<!-- Iframy -->
<iframe src="https://youtube.com/embed/..." loading="lazy"></iframe>
```

```javascript
// Intersection Observer pre custom lazy loading
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      el.src = el.dataset.src;
      observer.unobserve(el);
    }
  });
}, { rootMargin: '200px' }); // Začni načítavať 200px pred viewport-om

document.querySelectorAll('[data-src]').forEach(el => observer.observe(el));
```

### Code Splitting
```javascript
// Dynamic imports pre route-based splitting
const Dashboard = () => import('./pages/Dashboard.js');
const Settings = () => import('./pages/Settings.js');

// Conditional loading
if (user.isAdmin) {
  const AdminPanel = await import('./components/AdminPanel.js');
}
```

### Image Optimization Checklist

1. **Formát:** WebP (90%+ podpora), AVIF (pre cutting-edge)
2. **Responsive:** `srcset` + `sizes` pre správne rozlíšenie
3. **Compression:** Kvalita 75-85% pre WebP, 60-70% pre AVIF
4. **Lazy load:** `loading="lazy"` pre obrázky pod fold-om
5. **Dimenzie:** Vždy `width` + `height` alebo `aspect-ratio`
6. **CDN:** Image CDN s on-the-fly resizing (Cloudinary, imgix, Cloudflare Images)
7. **Fetch priority:** `fetchpriority="high"` pre LCP obrázok

```html
<picture>
  <source srcset="/img/hero.avif" type="image/avif">
  <source srcset="/img/hero.webp" type="image/webp">
  <img src="/img/hero.jpg" width="1200" height="630" alt="Hero" fetchpriority="high">
</picture>
```

### Kompresia
```nginx
# Nginx konfigurácia
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 256;

# Brotli (lepšie kompresné pomery)
brotli on;
brotli_types text/plain text/css application/json application/javascript text/xml application/xml;
brotli_comp_level 6;
```

### HTTP Cache Headers
```nginx
# Statické assety s hash v názve — dlhodobý cache
location ~* \.(js|css|png|jpg|jpeg|gif|webp|avif|ico|svg|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# HTML — vždy revaliduj
location ~* \.html$ {
  add_header Cache-Control "no-cache";
}

# API — bez cache
location /api/ {
  add_header Cache-Control "no-store";
}

# Manifest a SW — krátky cache
location = /manifest.webmanifest {
  add_header Cache-Control "no-cache";
}
location = /sw.js {
  add_header Cache-Control "no-cache";
}
```

## Meranie Performance

### Programaticky
```javascript
// Core Web Vitals
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(metric => sendToAnalytics('LCP', metric));
onINP(metric => sendToAnalytics('INP', metric));
onCLS(metric => sendToAnalytics('CLS', metric));

function sendToAnalytics(name, metric) {
  const data = {
    name,
    value: metric.value,
    rating: metric.rating, // 'good', 'needs-improvement', 'poor'
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType
  };
  // Odošli na analytics endpoint
  navigator.sendBeacon('/analytics', JSON.stringify(data));
}
```

### Performance Observer
```javascript
// Sleduj Long Tasks
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long task detected:', entry.duration, 'ms');
    }
  }
});
observer.observe({ type: 'longtask', buffered: true });
```
