# Cookie Compliance Checklist — SR/EÚ

## Právny základ
- Zákon č. 452/2021 Z. z. o elektronických komunikáciách (§ 109 ods. 8)
- GDPR (ak cookies = osobné údaje, čo vo väčšine prípadov sú)
- Smernica 2002/58/ES (ePrivacy Directive)
- Usmernenia EDPB 05/2020 o súhlase podľa GDPR

---

## 1. Cookie Consent Banner

### 1.1 Povinné prvky

- [ ] Zobrazí sa PRI PRVEJ NÁVŠTEVE pred nastavením akýchkoľvek neesenciálnych cookies
- [ ] Jasná informácia o tom, ČO sú cookies a PREČO sa používajú
- [ ] **Granulárny výber** — minimálne tieto kategórie:
  - Nevyhnutné (vždy aktívne, bez súhlasu)
  - Analytické / štatistické
  - Marketingové / reklamné
  - Funkčné / preferenčné
- [ ] **Tlačidlo "Prijať všetky"** — viditeľné
- [ ] **Tlačidlo "Odmietnuť všetky"** — ROVNAKO viditeľné a prístupné
- [ ] Tlačidlo "Nastaviť" / "Prispôsobiť" — prístup ku granulárnym nastaveniam
- [ ] **Žiadne pre-zaškrtnuté checkboxy** pre neesenciálne cookies
- [ ] Odkaz na Cookie Policy

### 1.2 Zakázané praktiky (dark patterns)

- ❌ "Prijať" veľké zelené, "Odmietnuť" malé šedé
- ❌ Odmietnutie vyžaduje 5+ kliknutí, prijatie len 1
- ❌ "Pokračovaním na stránke súhlasíte" — toto NIE JE platný súhlas
- ❌ Cookie wall — "buď súhlasíte, alebo nemáte prístup" (problematické)
- ❌ Nudging — manipulatívny dizajn na vynútenie súhlasu
- ❌ Opakované zobrazovanie banneru kým súhlas neudelíte

### 1.3 Technická implementácia

**KRITICKÉ: Cookies MUSIA byť blokované do udelenia súhlasu!**

```javascript
// Príklad: Google Tag Manager consent mode
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Pred súhlasom — blokuj
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'functionality_storage': 'denied',
  'personalization_storage': 'denied',
  'security_storage': 'granted'  // Bezpečnostné vždy OK
});

// Po súhlase — povoľ podľa výberu
function updateConsent(preferences) {
  gtag('consent', 'update', {
    'analytics_storage': preferences.analytics ? 'granted' : 'denied',
    'ad_storage': preferences.marketing ? 'granted' : 'denied',
    // ...
  });
}
```

**Kontrola:** Otvor DevTools → Application → Cookies PRED kliknutím na banner.
Ak tam sú neesenciálne cookies → PORUŠENIE.

---

## 2. Kategorizácia cookies

### 2.1 Nevyhnutné / Technické (bez súhlasu)
Cookies potrebné pre základné fungovanie stránky:
- Session cookies pre prihlásenie
- Shopping cart cookies (ak relevantné)
- Bezpečnostné cookies (CSRF protection)
- Cookie consent cookie (irónia, ale áno)
- Load balancing cookies

**POZOR:** Google Analytics, Facebook Pixel, Hotjar — tieto NIE SÚ nevyhnutné!

### 2.2 Analytické / Štatistické (vyžadujú súhlas)
- Google Analytics
- Mixpanel, Amplitude
- Hotjar, FullStory
- Vlastná analytika (ak používa cookies)

### 2.3 Marketingové / Reklamné (vyžadujú súhlas)
- Facebook Pixel
- Google Ads remarketing
- LinkedIn Insight Tag
- Twitter Pixel
- Affiliate cookies

### 2.4 Funkčné / Preferenčné (odporúča sa súhlas)
- Jazykové preferencie (v cookie)
- UI preferencie (dark mode)
- Chat widget cookies
- Embedded content cookies (YouTube, Vimeo)

---

## 3. Cookie Policy Dokument

### 3.1 Povinný obsah

- [ ] Čo sú cookies (zrozumiteľné vysvetlenie)
- [ ] Aké cookies používame — KOMPLETNÝ ZOZNAM:

```markdown
| Názov cookie | Poskytovateľ | Účel | Kategória | Platnosť |
|-------------|-------------|------|-----------|----------|
| session_id | Vlastné | Autentifikácia | Nevyhnutné | Session |
| csrf_token | Vlastné | Bezpečnosť | Nevyhnutné | Session |
| cookie_consent | Vlastné | Uloženie preferencií | Nevyhnutné | 1 rok |
| _ga | Google | Analytika | Analytické | 2 roky |
| _gid | Google | Analytika | Analytické | 24h |
| _fbp | Facebook | Marketing | Marketingové | 90 dní |
| stripe.mid | Stripe | Platby/fraud | Nevyhnutné | 1 rok |
```

- [ ] Tretie strany a odkazy na ich cookie policies
- [ ] Ako zmeniť/odvolať cookie preferencie
- [ ] Ako vymazať cookies v prehliadači
- [ ] Dátum poslednej aktualizácie
- [ ] Odkaz na Privacy Policy

### 3.2 Automatický audit cookies

Pred publikáciou a pravidelne (min. kvartálne) skenuj cookies:
- Manuálne: DevTools → Application → Cookies
- Automaticky: Cookiebot scanner, OneTrust scanner, CookieYes

---

## 4. Odvolanie súhlasu

- [ ] Používateľ musí mať možnosť KEDYKOĽVEK zmeniť preferencie
- [ ] Odvolanie musí byť rovnako jednoduché ako udelenie
- [ ] Typicky: odkaz v footer-i "Nastavenia cookies" alebo "Zmeniť cookie preferencie"
- [ ] Po odvolaní sa príslušné cookies musia odstrániť
- [ ] Príslušné skripty sa musia prestať načítavať

---

## 5. Evidencia súhlasov

GDPR vyžaduje preukázateľnosť súhlasu:
- [ ] Kedy bol súhlas udelený (timestamp)
- [ ] Kto udelil súhlas (anonymizovaný identifikátor)
- [ ] S čím súhlasil (kategórie cookies)
- [ ] Aká verzia cookie policy bola zobrazená
- [ ] Uchovávanie evidencie po dobu spracovania

---

## 6. Špeciálne prípady

### 6.1 Consent mode v2 (Google)
Od marca 2024 Google vyžaduje implementáciu Consent Mode v2 pre používanie Google služieb v EÚ/EÓHP.

### 6.2 Server-side tracking
Aj server-side tracking (napr. server-side GTM) podlieha cookie pravidlám, ak identifikuje používateľov.

### 6.3 Local Storage / Session Storage
Pravidlá pre cookies sa vzťahujú aj na Local Storage, Session Storage, IndexedDB a akékoľvek iné ukladanie na zariadení používateľa.

### 6.4 Fingerprinting
Browser fingerprinting bez súhlasu je v rozpore s ePrivacy smernicou.
