# Web App Manifest — Kompletná špecifikácia

## Štruktúra súboru

Manifest je JSON súbor s `.webmanifest` alebo `.json` príponou.
Odporúčaný názov: `manifest.webmanifest` (MIME type: `application/manifest+json`).

## Povinné polia

### `name` (string)
Plný názov aplikácie zobrazený pri inštalácii a na splash screen.
- Max 45 znakov
- Musia byť zmysluplné a popisné

### `short_name` (string)
Krátky názov pre home screen ikonu.
- Max 12 znakov (ideálne pod 10)
- Nesmie byť skrátený OS-om

### `start_url` (string)
URL, ktoré sa otvorí pri spustení nainštalovanej appky.
- Musí byť v rámci `scope`
- Odporúčané: `"/"` alebo `"/app"`
- Môže obsahovať UTM parametre pre tracking: `"/?source=pwa"`

### `display` (string)
Režim zobrazenia:
- `fullscreen` — celá obrazovka, žiadne UI prehliadača
- `standalone` — ako natívna appka, so status barom (ODPORÚČANÉ)
- `minimal-ui` — minimálne prehliadačové prvky
- `browser` — normálny tab (NIE PWA)

### `icons` (array)
Minimálne požiadavky:
```json
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
]
```

**Odporúčané veľkosti ikon:**
- 48x48, 72x72, 96x96, 128x128, 144x144, 192x192, 256x256, 384x384, 512x512
- Minimálne: 192x192 + 512x512
- Maskable: samostatný súbor s bezpečnou zónou (80% safe area)

**Maskable ikony:**
- Obsah musí byť v stredových 80% (safe zone)
- Okraje budú orezané rôznymi tvarmi (kruh, squircle, atď.)
- Testuj na: https://maskable.app/editor
- NIKDY nedávaj `"purpose": "any maskable"` — použi samostatné ikony

## Odporúčané polia

### `background_color` (string)
Farba splash screen pozadia. Formát: hex (`"#ffffff"`).

### `theme_color` (string)
Farba status baru a toolbaru. Musí zodpovedať `<meta name="theme-color">` v HTML.

### `scope` (string)
Navigačný scope PWA. URL mimo scope sa otvárajú v prehliadači.
```json
"scope": "/"
```

### `description` (string)
Popis aplikácie pre install UI. 1-2 vety.

### `orientation` (string)
Preferovaná orientácia: `any`, `natural`, `landscape`, `portrait`, `portrait-primary`, `landscape-primary`

### `lang` (string)
Jazyk: `"sk"`, `"cs"`, `"en"`, atď.

### `dir` (string)
Smer textu: `"ltr"`, `"rtl"`, `"auto"`

### `categories` (array)
```json
"categories": ["business", "productivity"]
```
Hodnoty: `books`, `business`, `education`, `entertainment`, `finance`, `fitness`, `food`, `games`, `government`, `health`, `kids`, `lifestyle`, `magazines`, `medical`, `music`, `navigation`, `news`, `personalization`, `photo`, `politics`, `productivity`, `security`, `shopping`, `social`, `sports`, `travel`, `utilities`, `weather`

## Pokročilé polia

### `screenshots` (array)
Pre Richer Install UI (Android Chrome 116+):
```json
"screenshots": [
  {
    "src": "/screenshots/mobile-home.png",
    "sizes": "1080x1920",
    "type": "image/png",
    "form_factor": "narrow",
    "label": "Domovská stránka"
  },
  {
    "src": "/screenshots/desktop-dashboard.png",
    "sizes": "1920x1080",
    "type": "image/png",
    "form_factor": "wide",
    "label": "Dashboard"
  }
]
```

### `shortcuts` (array)
Skratky v app menu (long press na ikone):
```json
"shortcuts": [
  {
    "name": "Nový príspevok",
    "short_name": "Nový",
    "description": "Vytvor nový príspevok",
    "url": "/new-post",
    "icons": [{ "src": "/icons/new-post.png", "sizes": "192x192" }]
  }
]
```

### `share_target` (object)
Prijímanie share intents:
```json
"share_target": {
  "action": "/share",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": {
    "title": "title",
    "text": "text",
    "url": "url",
    "files": [
      {
        "name": "media",
        "accept": ["image/*", "video/*"]
      }
    ]
  }
}
```

### `protocol_handlers` (array)
Registrácia custom protokolov:
```json
"protocol_handlers": [
  {
    "protocol": "web+myapp",
    "url": "/handle?url=%s"
  }
]
```

### `related_applications` (array)
Odkaz na natívne appky:
```json
"related_applications": [
  {
    "platform": "play",
    "url": "https://play.google.com/store/apps/details?id=com.example",
    "id": "com.example"
  }
],
"prefer_related_applications": false
```

## HTML integrácia

```html
<head>
  <!-- Manifest -->
  <link rel="manifest" href="/manifest.webmanifest">

  <!-- Theme color (musí zodpovedať manifest theme_color) -->
  <meta name="theme-color" content="#000000">

  <!-- iOS specifické -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Názov Appky">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">

  <!-- Windows specifické -->
  <meta name="msapplication-TileColor" content="#000000">
  <meta name="msapplication-TileImage" content="/icons/icon-144x144.png">
</head>
```

## Validácia manifestu

Kontrola cez DevTools:
1. Chrome → F12 → Application → Manifest
2. Skontroluj "Installability" sekciu pre errory
3. Použi https://web.dev/add-manifest/ ako referenčný zdroj

Programatická validácia:
```javascript
// Fetch a validuj manifest
const response = await fetch('/manifest.webmanifest');
const manifest = await response.json();

const required = ['name', 'short_name', 'start_url', 'display', 'icons'];
const missing = required.filter(field => !manifest[field]);

if (missing.length > 0) {
  console.error('Chýbajúce povinné polia:', missing);
}

// Kontrola ikon
const has192 = manifest.icons?.some(i => i.sizes?.includes('192x192'));
const has512 = manifest.icons?.some(i => i.sizes?.includes('512x512'));
const hasMaskable = manifest.icons?.some(i => i.purpose?.includes('maskable'));

if (!has192 || !has512) console.error('Chýba 192x192 alebo 512x512 ikona');
if (!hasMaskable) console.warn('Chýba maskable ikona');
```
