# PWA Implementation - Eatrivo

##  Funkcie

###  Implementované
1. **Service Worker & Caching** - next-pwa s cache strategiami
2. **Offline Support** - Prístup k najnovšiemu shopping listu offline
3. **Push Notifications** - Web Push API pre notifikácie o nových shopping listoch
4. **Install Prompt** - Prompt pre inštaláciu PWA
5. **Manifest** - Web app manifest pre inštaláciu

###  Použité technológie
- \
ext-pwa\ - Service Worker generátor
- \idb\ - IndexedDB wrapper pre offline storage
- \web-push\ - Server-side push notifikácie
- Web Push API - Browser notifikácie

##  Ako to funguje

### Offline Storage
- Pri načítaní shopping listov sa automaticky uloží najnovší do IndexedDB
- Ak nie je internet, zobrazí sa offline verzia
- Dáta sú uložené v \eatrivo-offline\ databáze

### Push Notifications
1. Používateľ zapne notifikácie v dashboarde
2. Browser sa zaregistruje pre push notifikácie
3. Subscription sa uloží do databázy (\push_subscriptions\)
4. Keď admin vytvorí shopping list, odošle sa push notifikácia

### Service Worker Caching
- **Fonts** - CacheFirst (1 rok)
- **API Shopping Lists** - NetworkFirst (1 deň)
- **API Meal Plans** - NetworkFirst (1 deň)

##  Komponenty

### Client Components
- \PWAInstallPrompt\ - Prompt pre inštaláciu PWA
- \PushNotificationToggle\ - Tlačidlo pre zapnutie/vypnutie notifikácií

### API Endpoints
- \/api/push/subscribe\ - Uloženie push subscription
- \/api/push/send\ - Odoslanie push notifikácie

### Utilities
- \lib/pwa/offlineStorage.ts\ - IndexedDB wrapper
- \lib/pwa/pushNotifications.ts\ - Push notification helpers

##  Konfigurácia

### Environment Variables
\\\env
VAPID_PUBLIC_KEY=BIJKe58tvcY8dYNVegyV1PApzs7UAHiMyDTTp3s-8C-LLSwlodPm_NN-ns-3I6kGFIad6CnAiM0J8sLdoXsVcp0
VAPID_PRIVATE_KEY=VG6ztqAJBLQ6hmeweDGzALEiVNfT8PPDLe2-PyYFbN4
ADMIN_EMAIL=admin@eatrivo.sk
\\\

### Database
Nová tabuľka \push_subscriptions\:
- \id\ - UUID
- \userId\ - FK na users
- \subscription\ - JSONB (PushSubscription object)
- \userAgent\ - TEXT
- \createdAt\, \updatedAt\ - TIMESTAMP

##  Testovanie

### Lokálne testovanie PWA
1. Build aplikáciu: \
pm run build\
2. Spusť produkčný server: \
pm start\
3. Otvor v Chrome/Edge na \localhost:3000\
4. Otvor DevTools > Application > Service Workers
5. Skontroluj či je SW registrovaný

### Testovanie Push Notifications
1. Zapni notifikácie v dashboarde
2. V Admin dashboarde vytvor nový shopping list
3. Používateľ dostane push notifikáciu

### Testovanie Offline
1. Otvor dashboard, načítaj shopping listy
2. Otvor DevTools > Network > Offline
3. Refresh stránku
4. Mal by sa zobraziť najnovší shopping list z cache

##  Inštalácia na zariadenia

### Desktop (Chrome/Edge)
- Ikona v address bare "Install app"
- Alebo PWA install prompt komponent

### Mobile (Android)
- Chrome: Menu > "Add to Home screen"
- Alebo automatický prompt po 2+ návštevách

### Mobile (iOS)
- Safari: Share > "Add to Home Screen"
-  Push notifications nie sú podporované na iOS (zatiaľ)

##  Debugging

### Service Worker
\\\js
// V browser console
navigator.serviceWorker.getRegistration().then(reg => console.log(reg))
\\\

### Push Subscription
\\\js
// V browser console
navigator.serviceWorker.ready.then(reg => 
  reg.pushManager.getSubscription().then(sub => console.log(sub))
)
\\\

### IndexedDB
- DevTools > Application > Storage > IndexedDB > \eatrivo-offline\

##  Známe limity

1. **iOS Safari** - Push notifikácie nie sú podporované
2. **Development mode** - PWA je vypnuté v dev mode (next-pwa config)
3. **HTTPS required** - Service Workers vyžadujú HTTPS (okrem localhost)

##  Ďalšie možnosti

- Background sync pre offline formuláre
- Periodic background sync pre auto-update
- Web Share API pre zdieľanie shopping listov
- Badges API pre počet nových shopping listov

