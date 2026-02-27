# 📋 Legal Compliance Report — EatRivo

**Dátum:** 2026-02-24  
**Typ služby:** SaaS B2C (Nutrition/Meal Planning AI)  
**Trh:** EÚ/EÓHP (SK + EN)  
**Platobná brána:** Stripe  
**Framework:** Next.js + Vercel  

## ⚠️ Disclaimer

**Tento report NIE JE právne poradenstvo.** Výstupy sú orientačné a slúžia na identifikáciu potenciálnych právnych medzier. Pre finálne znenie dokumentov vždy odporúčame konzultáciu s advokátom špecializovaným na IT právo a ochranu spotrebiteľa.

---

## 📊 Celkový stav

| Metrika | Hodnota |
|---------|---------|
| **Celkové riziko** | 🔴 **CRITICAL** |
| Kritické nálezy | 7 |
| Vysoké riziko | 8 |
| Stredné riziko | 6 |
| Nízke riziko | 5 |
| **Celkom nálezov** | **26** |

---

## 📄 Stav dokumentov

| Dokument | Existuje? | Kompletný? | Problémy |
|----------|-----------|------------|----------|
| VOP / Terms of Service | ✅ (SK + EN) | ⚠️ | 7 nevyplnených placeholderov, starý zákon 102/2014, chýba DIČ |
| Privacy Policy / GDPR | ✅ (SK + EN) | ⚠️ | 8 nevyplnených placeholderov, SK verzia bez dátumu účinnosti |
| Cookie Policy | ❌ **CHÝBA** | ❌ | Privacy Policy na ňu odkazuje, ale neexistuje |
| Cookie Consent Banner | ❌ **CHÝBA** | ❌ | Žiadna implementácia cookie consent |
| Reklamačný poriadok | ⚠️ Súčasť VOP | ⚠️ | Integrovaný v §8 VOP, nie samostatný dokument |
| Formulár na odstúpenie | ❌ **CHÝBA** | ❌ | Povinná príloha k VOP podľa zák. 108/2024 |
| Medical Disclaimer | ✅ (SK + EN) | ⚠️ | 2 nevyplnené placeholdery |
| ARS / ODR informácia | ✅ (vo VOP) | ✅ | SOI + ODR platforma uvedené |

---

## 🔴 Kritické nedostatky (CRITICAL)

### C1. Chýba Cookie Consent Banner
**Zákon:** § 109 ods. 8 zák. 452/2021 Z. z., GDPR čl. 6/1/a  
**Stav:** Žiadna implementácia cookie consent banneru v celom projekte.  
**Dopad:** `<Analytics />` z `@vercel/analytics` sa načítava **bezpodmienečne** v `layout.tsx` pre všetkých návštevníkov bez akéhokoľvek súhlasu. CSP header povoľuje aj `google-analytics.com`.  
**Fix:** Implementovať cookie consent banner (napr. CookieYes, Cookiebot, alebo vlastný) s:
- Granulárnym výberom kategórií (nevyhnutné / analytické / marketingové)
- Rovnako viditeľnými tlačidlami "Prijať" a "Odmietnuť"
- Blokovaním Vercel Analytics pred udelením súhlasu
- Google Consent Mode v2

### C2. Chýba Cookie Policy
**Zákon:** § 109 zák. 452/2021 Z. z., GDPR  
**Stav:** Privacy Policy v sekcii 9 odkazuje na "Cookie Policy", ale dokument neexistuje.  
**Fix:** Vytvoriť `public/legal/cookie-policy-en.md` a `cookie-policy-sk.md` so zoznamom všetkých cookies (názov, účel, kategória, platnosť, poskytovateľ).

### C3. 24 nevyplnených placeholderov v právnych dokumentoch
**Stav:** Právne dokumenty obsahujú `[INSERT EMAIL]`, `[INSERT ADDRESS]`, `[DOPLNIŤ EMAIL]`, `[DOPLNIŤ ADRESU]`, `[DOPLNIŤ DÁTUM]` atď. — tieto sú viditeľné návštevníkom webu.  
**Súbory:**
- `terms-of-service-en.md` — 7 placeholderov
- `terms-of-service-sk.md` — 7 placeholderov
- `privacy-policy-en.md` — 3 placeholdery
- `privacy-policy-sk.md` — 5 placeholderov
- `medical-disclaimer-en.md` — 1 placeholder
- `medical-disclaimer-sk.md` — 1 placeholder

**Fix:** Nahradiť všetky placeholdery reálnymi údajmi:
- Email: `info@valorixdigital.com` (alebo dedikovaný support email)
- Adresa: `Nad plážou 4419/25, 97401, Banská Bystrica`
- Kontakt: telefónne číslo
- Dátum: aktuálny dátum účinnosti

### C4. VOP odkazujú na zrušený zákon 102/2014
**Zákon:** Zákon č. 108/2024 Z. z. (účinný od 1.7.2024)  
**Stav:** SK verzia VOP v sekcii o odstúpení od zmluvy cituje `§ 7 ods. 6 písm. l) zákona č. 102/2014 Z. z.` — tento zákon bol nahradený zákonom 108/2024.  
**Fix:** Aktualizovať odkaz na `§ 19-21 zákona č. 108/2024 Z. z. o ochrane spotrebiteľa`.

### C5. Chýba súhlas so začatím poskytovania digitálnej služby pri checkout
**Zákon:** § 19-20 zák. 108/2024, Smernica 2011/83/EÚ čl. 16(m)  
**Stav:** Pricing stránka a celý checkout flow nemá žiadne checkboxy pre:
- Oboznámenie sa s VOP
- Súhlas so začatím poskytovania digitálnej služby pred uplynutím 14-dňovej lehoty
- Poučenie o strate práva na odstúpenie  

**Dopad:** Bez tohto súhlasu má spotrebiteľ právo na odstúpenie kedykoľvek (lehota sa predlžuje o 12 mesiacov!).  
**Fix:** Pred tlačidlom objednávky pridať povinné checkboxy:
```
☐ Oboznámil som sa s Všeobecnými obchodnými podmienkami a Ochranou osobných údajov
☐ Žiadam o okamžité začatie poskytovania digitálnej služby a beriem na vedomie,
  že tým strácam právo na odstúpenie od zmluvy v 14-dňovej lehote.
```

### C6. Tlačidlo objednávky neuvádza povinnosť platby
**Zákon:** § 17 ods. 2 zák. 108/2024, Smernica 2011/83/EÚ čl. 8(2)  
**Stav:** Tlačidlo "Get Premium" / "Upgrade" / "Upgrade to Premium" nespĺňa zákonný text.  
**Fix:** Zmeniť text tlačidla na **"Objednávka s povinnosťou platby"** / **"Order with payment obligation"** alebo ekvivalent ("Záväzne objednať a zaplatiť").

### C7. Chýba formulár na odstúpenie od zmluvy
**Zákon:** § 20 zák. 108/2024, Smernica 2011/83/EÚ príloha I(B)  
**Stav:** VOP spomínajú právo na odstúpenie, ale chýba vzorový formulár na odstúpenie, ktorý je povinnou prílohou.  
**Fix:** Pridať vzorový formulár ako prílohu k VOP alebo samostatnú stránku.

---

## 🟠 Vysoké riziko (HIGH)

### H1. Vercel Analytics bez cookie consent
**Stav:** `<Analytics />` v `src/app/layout.tsx` sa renderuje bezpodmienečne.  
**Fix:** Podmienkovať zobrazenie `<Analytics />` udelením cookie consent pre analytické cookies.

### H2. Google Consent Mode v2 neimplementovaný
**Stav:** CSP povoľuje Google Analytics, ale Consent Mode nie je nakonfigurovaný.  
**Fix:** Ak sa plánuje GA, implementovať Consent Mode v2 s `consent('default', {...})` predvolene na `denied`.

### H3. Chýba DIČ v identifikácii obchodníka
**Zákon:** § 15 ods. 1 zák. 108/2024  
**Stav:** IČO (56024665) je uvedené, ale DIČ a IČ DPH chýbajú.  
**Fix:** Doplniť DIČ (a IČ DPH ak je platca DPH) do VOP, Privacy Policy a footer.

### H4. Consent logging je implicitný, nie explicitný
**Stav:** Onboarding API automaticky loguje `agreed: true` pre 3 typy súhlasov bez toho, aby používateľ klikol na individuálne checkboxy. Komentár v kóde: "implicit consent given at sign-in".  
**Zákon:** GDPR čl. 7 — Súhlas musí byť preukázateľný, slobodný, konkrétny a jednoznačný.  
**Fix:** Implementovať explicitné checkboxy v onboarding flow pre každý typ súhlasu.

### H5. Sign-in stránka — pasívny text namiesto aktívneho súhlasu
**Stav:** "By continuing, you agree to our Terms and Privacy Policy" — toto je pasívny text, nie checkbox.  
**Fix:** Pridať checkbox: `☐ Oboznámil som sa s VOP a Ochranou osobných údajov`.

### H6. Chýba odkaz na "Nastavenia cookies" vo footer-i
**Zákon:** GDPR, Smernica 2002/58/ES  
**Stav:** Footer nemá odkaz na zmenu cookie preferencií.  
**Fix:** Pridať odkaz "Nastavenia cookies" / "Cookie Settings" do footer-a.

### H7. Footer neobsahuje identifikáciu obchodníka
**Zákon:** § 3 ods. 1 zák. 22/2004 Z. z. o elektronickom obchode  
**Stav:** Footer obsahuje len odkazy na právne dokumenty, ale nie obchodné meno, IČO, sídlo.  
**Fix:** Pridať minimálne: názov spoločnosti, IČO, kontaktný email.

### H8. Nefunkčné odkazy vo footer-i
**Stav:** "About Us", "Blog", "Contact" odkazujú na `#`.  
**Fix:** Odstrániť nefunkčné odkazy alebo implementovať cieľové stránky.

---

## 🟡 Stredné riziko (MEDIUM)

### M1. Privacy Policy SK — chýba dátum účinnosti
**Stav:** SK verzia má `[DOPLNIŤ DÁTUM]` pre effective date a last updated (EN verzia má 22.2.2026).  
**Fix:** Doplniť dátumy.

### M2. Newsletter nemá double opt-in
**Stav:** Push notifikácie a newsletter subscription nemajú implementovaný double opt-in (potvrdenie cez email).  
**Fix:** Implementovať double opt-in pre všetky marketing komunikácie.

### M3. Reklamačný poriadok nie je samostatný dokument
**Stav:** Je integrovaný v VOP (§8) — nie je to povinne problém, ale kvôli prehľadnosti a jednoduchému prístupu sa odporúča samostatný dokument alebo priamy odkaz.  
**Fix:** Zvážiť samostatnú stránku alebo anchor link z footer-a priamo na sekciu reklamácií.

### M4. Hardcoded document version v consent logs
**Stav:** `documentVersion: "v1.0"` je hardcoded v onboarding API. Pri aktualizácii dokumentov sa verzia automaticky nezmení.  
**Fix:** Implementovať verzionovanie dokumentov (napr. hash obsahu alebo manuálna verzia).

### M5. Chýba informácia o tretích krajinách v Privacy Policy detail
**Stav:** Privacy Policy menuje Stripe, OpenAI, Vercel, Railway ako sprostredkovateľov, ale:
- Chýba explicitná informácia o EU-US Data Privacy Framework certifikácii pre každého
- Chýba odkaz na SCC (Standard Contractual Clauses) pre nekertifikované subjekty  
**Fix:** Pre každého US sprostredkovateľa uviesť právny mechanizmus prenosu.

### M6. Subscription — chýba pripomienka pred automatickým obnovením
**Stav:** VOP hovoria o automatickom obnovovaní, ale nie je implementovaný email s pripomienkou pred obnovením.  
**Fix:** Implementovať email notifikáciu napr. 3 dni pred automatickým obnovením predplatného.

---

## 🔵 Nízke riziko (LOW)

### L1. CSP povoľuje Google Analytics bez využitia
**Stav:** `connect-src` v CSP obsahuje `https://*.google-analytics.com`, ale GA nie je aktívne implementované.  
**Fix:** Odstrániť z CSP ak sa nepoužíva, alebo pridať s Consent Mode ak sa plánuje.

### L2. Zrušenie predplatného len cez Stripe portal
**Stav:** Používateľ musí prejsť na Stripe Customer Portal. Funguje, ale nie je maximálne transparentné.  
**Fix:** Zvážiť in-app cancel flow s jasnejšou navigáciou.

### L3. Medical Disclaimer nie je súčasťou sign-in flow
**Stav:** Medical disclaimer sa loguje v onboarding, ale pri sign-in sa zobrazuje len odkaz na ToS a Privacy Policy.  
**Fix:** Zvážiť pridanie odkazu na Medical Disclaimer aj pri sign-in.

### L4. Footer — chýba odkaz na ARS/ODR
**Stav:** ARS/ODR info je vo VOP, ale nie priamo vo footer-i.  
**Fix:** Pridať priamy odkaz na ODR platformu do footer-a.

### L5. Chýba "Zmeniť cookie preferencie" odkaz
**Stav:** Keďže cookie consent zatiaľ neexistuje, chýba aj odkaz na zmenu preferencií.  
**Fix:** Implementovať spolu s cookie consent riešením.

---

## 📋 Prioritný akčný plán

### Fáza 1 — OKAMŽITÁ NÁPRAVA (Kritické)
1. ✏️ **Vyplniť všetky placeholdery** v právnych dokumentoch (email, adresa, dátum, kontakt)
2. 📝 **Aktualizovať zákon** 102/2014 → 108/2024 vo VOP SK
3. 📝 **Doplniť DIČ** do identifikácie obchodníka
4. 📝 **Vytvoriť formulár na odstúpenie** od zmluvy
5. 🍪 **Implementovať cookie consent banner** + podmienkovať `<Analytics />`
6. 📄 **Vytvoriť Cookie Policy** (SK + EN)

### Fáza 2 — VYSOKÁ PRIORITA (pred produkciou)
7. 🛒 **Pridať checkout checkboxy** (VOP, digitálny obsah, Privacy Policy)
8. 🔘 **Zmeniť text objednávacieho tlačidla** → "Objednávka s povinnosťou platby"
9. ✅ **Implementovať explicitné consent checkboxy** v onboarding/sign-in
10. 🦶 **Doplniť footer** — identifikácia, cookie settings, funkčné odkazy

### Fáza 3 — STREDNÁ PRIORITA
11. 📧 **Double opt-in** pre newsletter/push notifikácie
12. 📧 **Pripomienka email** pred automatickým obnovením subscription
13. 🔄 **Verzionovanie** právnych dokumentov pre consent audit trail
14. 🌍 **Doplniť právny mechanizmus prenosu** do USA pre každého sprostredkovateľa v Privacy Policy

### Fáza 4 — OPTIMALIZÁCIA
15. 🧹 Vyčistiť CSP od nepoužívaného google-analytics.com
16. 🔗 Opraviť nefunkčné footer odkazy (About, Blog, Contact)
17. 📊 In-app cancel subscription flow

---

## ⚠️ Odporúčanie

Výsledky tohto auditu sú orientačné. Pre finálne dokumenty kontaktujte advokáta špecializovaného na IT právo a ochranu spotrebiteľa SR/EÚ. Vzhľadom na to, že EatRivo spracúva **zdravotné údaje** (osobitná kategória podľa GDPR čl. 9), odporúčame aj konzultáciu ohľadom DPIA (Data Protection Impact Assessment).

---

*Generované: 2026-02-24 | Legal Compliance Scanner — Antigravity Sub-Agent*
