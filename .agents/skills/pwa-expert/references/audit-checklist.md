# PWA Audit Checklist — Kompletný zoznam

Tento dokument je referenčný materiál pre sub-agenta. Použi ho pri každom PWA audite.

## 1. Instalovateľnosť

### Manifest validácia
- [ ] `manifest.webmanifest` alebo `manifest.json` existuje
- [ ] `<link rel="manifest" href="/manifest.webmanifest">` je v `<head>`
- [ ] `name` je vyplnené (max 45 znakov)
- [ ] `short_name` je vyplnené (max 12 znakov — ideálne pod 10)
- [ ] `start_url` je definovaná a funkčná
- [ ] `display` je `standalone`, `fullscreen`, alebo `minimal-ui`
- [ ] `background_color` je nastavená
- [ ] `theme_color` je nastavená a konzistentná s `<meta name="theme-color">`
- [ ] `scope` je správne nastavený
- [ ] `description` je vyplnený
- [ ] `orientation` je nastavená ak je relevantná

### Ikony
- [ ] Ikona 192x192 PNG existuje
- [ ] Ikona 512x512 PNG existuje
- [ ] Aspoň jedna ikona s `"purpose": "maskable"` existuje
- [ ] Maskable ikona má bezpečnú zónu (obsah v strede 80% plochy)
- [ ] SVG ikona (ak je k dispozícii) pre lepšie škálovanie
- [ ] Favicon.ico existuje (fallback pre staršie prehliadače)
- [ ] Apple Touch Icon existuje: `<link rel="apple-touch-icon" href="...">`

### Screenshots (pre Richer Install UI)
- [ ] Aspoň 1 screenshot pre mobile (portrait)
- [ ] Aspoň 1 screenshot pre desktop (landscape) ak je relevantné
- [ ] `form_factor` je nastavený na každom screenshote

## 2. Service Worker

### Registrácia
- [ ] SW sa registruje úspešne
- [ ] Registrácia je v `window.addEventListener('load', ...)` pre performance
- [ ] Scope SW pokrýva celú aplikáciu
- [ ] SW sa aktualizuje správne (verziovanie cache)
- [ ] `skipWaiting()` a `clients.claim()` sú implementované správne
- [ ] Error handling pri registrácii existuje

### Lifecycle
- [ ] Install event: precache kľúčových zdrojov
- [ ] Activate event: vyčistenie starých caches
- [ ] Fetch event: správna cache stratégia podľa typu obsahu
- [ ] Update flow: nová verzia sa aplikuje správne

### Cache Management
- [ ] Každý cache má unikátny názov s verziou
- [ ] Staré caches sa mažú pri aktivácii
- [ ] Precache zoznam nie je príliš veľký (< 50 položiek)
- [ ] Runtime cache má expiration limity
- [ ] Cache size je monitorovaný (max ~50MB na origin)

## 3. Offline Experience

### Základné požiadavky
- [ ] Offline fallback stránka existuje a je v cache
- [ ] App Shell je dostupný offline
- [ ] Offline stav je vizuálne indikovaný používateľovi
- [ ] Žiadne unhandled errory pri offline režime v konzole
- [ ] Formuláre majú offline queue / background sync

### Pokročilé
- [ ] Kľúčový obsah je dostupný offline (nie len shell)
- [ ] IndexedDB pre offline dáta (ak je relevantné)
- [ ] Background Sync pre odložené akcie
- [ ] Periodic Background Sync pre čerstvý obsah (ak je relevantné)

## 4. Performance (Core Web Vitals)

### LCP — Largest Contentful Paint (cieľ: < 2.5s)
- [ ] Hlavný obrázok/text sa zobrazí do 2.5s
- [ ] `<link rel="preload">` pre LCP element
- [ ] Obrázky sú optimalizované (WebP/AVIF)
- [ ] Fonty majú `font-display: swap`
- [ ] Žiadne render-blocking CSS/JS pred LCP elementom

### INP — Interaction to Next Paint (cieľ: < 200ms)
- [ ] Event handlery sú rýchle (< 50ms)
- [ ] Ťažká práca je v Web Workeroch
- [ ] `requestAnimationFrame` pre vizuálne aktualizácie
- [ ] Debounce/throttle na input handlers
- [ ] Žiadne long tasks (> 50ms) blokujúce main thread

### CLS — Cumulative Layout Shift (cieľ: < 0.1)
- [ ] Obrázky majú explicitné `width` a `height`
- [ ] Fonty nespôsobujú layout shift (FOUT/FOIT je minimalizovaný)
- [ ] Dynamický obsah neposúva existujúci obsah
- [ ] Reklamy/embedy majú rezervovaný priestor
- [ ] Animácie používajú `transform` a `opacity` (nie `width`, `height`, `top`, `left`)

### Ďalšie performance metriky
- [ ] TTFB < 800ms (Time to First Byte)
- [ ] FCP < 1.8s (First Contentful Paint)
- [ ] Total Blocking Time < 200ms
- [ ] Speed Index < 3.4s

## 5. Sieťová optimalizácia

- [ ] HTTPS je aktívne na celom site
- [ ] HTTP/2 alebo HTTP/3 je aktívne
- [ ] Brotli kompresia je nastavená (fallback na Gzip)
- [ ] `<link rel="preconnect">` pre kritické 3rd party origins
- [ ] `<link rel="dns-prefetch">` pre menej kritické origins
- [ ] Resource hints sú správne nastavené
- [ ] Žiadne mixed content (HTTP zdroje na HTTPS stránke)

## 6. Bezpečnosť

- [ ] HTTPS everywhere
- [ ] Content Security Policy (CSP) headers
- [ ] Strict-Transport-Security (HSTS) header
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options alebo CSP frame-ancestors
- [ ] Referrer-Policy header

## 7. Prístupnosť (v kontexte PWA)

- [ ] Offline stránka je accessible
- [ ] Install prompt je accessible
- [ ] Notifikácie majú textový fallback
- [ ] Splash screen má dostatočný kontrast
- [ ] Focus management funguje po navigácii

## 8. Cross-Browser & Cross-Platform

- [ ] Chrome (Android + Desktop) — plná podpora
- [ ] Safari (iOS) — manifest + SW fungujú (limitácie sú ok)
- [ ] Firefox — základná podpora
- [ ] Edge — plná podpora
- [ ] Samsung Internet — plná podpora

### iOS špecifické
- [ ] `<meta name="apple-mobile-web-app-capable" content="yes">`
- [ ] `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- [ ] `<link rel="apple-touch-icon">` pre všetky veľkosti
- [ ] Splash screen images pre iOS (ak je požadované)
- [ ] SW cache limit ~50MB na iOS (sledovať)

## 9. Lighthouse Audit Skóre

Cieľové skóre:
- **Performance**: ≥ 90
- **Accessibility**: ≥ 90
- **Best Practices**: ≥ 90
- **SEO**: ≥ 90
- **PWA**: ✓ (všetky kontroly zelené)

## Spôsob auditovania

1. Otvor Chrome DevTools → Application → Manifest (kontrola manifestu)
2. Application → Service Workers (kontrola SW)
3. Application → Cache Storage (kontrola caches)
4. Network tab → Offline checkbox → reload (test offline)
5. Lighthouse → Generate Report (automatický audit)
6. chrome://flags → #bypass-app-banner-engagement-checks (test install prompt)
