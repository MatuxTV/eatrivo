# Subscription & Recurring Payments — Právne požiadavky pre SaaS B2C

## Právny základ
- Zákon č. 108/2024 Z. z. o ochrane spotrebiteľa (§ 15, § 17, § 19-21)
- Smernica 2019/770/EÚ o digitálnom obsahu a digitálnych službách
- Smernica 2011/83/EÚ o právach spotrebiteľov
- PSD2 (Payment Services Directive) pre Stripe platby
- GDPR (pre platobné údaje)

---

## 1. Predplatné / Subscription — Informačné povinnosti

### 1.1 Pred uzavretím zmluvy (§ 15 zák. 108/2024)

Obchodník MUSÍ jasne a zrozumiteľne informovať spotrebiteľa o:

- [ ] **Celkovej cene** za fakturačné obdobie vrátane DPH
- [ ] **Frekvencii platieb** (mesačne / ročne / iné)
- [ ] **Automatickom obnovovaní** — výslovná informácia, nie skrytá v texte
- [ ] **Dátume ďalšej platby** alebo mechanizme jeho určenia
- [ ] **Minimálnej dobe viazanosti** (ak existuje)
- [ ] **Podmienkach zrušenia predplatného**
- [ ] **Postupe pri zrušení** — konkrétne kroky
- [ ] **Čo sa stane s prístupom po zrušení**
- [ ] **Refund politike** pri zrušení uprostred obdobia

### 1.2 Automatické obnovovanie — KRITICKÉ

**Zákon 108/2024 kladie dôraz na transparentnosť pri automatickom obnovovaní:**

Obchodník musí:
- [ ] Pred prvým obnovením informovať spotrebiteľa, že sa zmluva automaticky predĺži
- [ ] Uviesť podmienky, za ktorých sa predlžuje
- [ ] Informovať o spôsobe ukončenia
- [ ] **Pripomienka pred obnovením** — odporúčaná best practice (v niektorých krajinách EÚ povinná)

**Vzor informácie pri checkout-e:**
```
Vaše predplatné sa automaticky obnoví na konci každého fakturačného
obdobia, pokiaľ ho nezrušíte. Predplatné môžete kedykoľvek zrušiť
v nastaveniach účtu (Účet → Predplatné → Zrušiť). Po zrušení budete
mať prístup k službe do konca aktuálneho fakturačného obdobia.
```

### 1.3 Zrušenie predplatného — "Rovnaká jednoduchosť"

**KĽÚČOVÉ PRAVIDLO:** Zrušenie musí byť rovnako jednoduché ako aktivácia.

- [ ] Ak sa dá aktivovať 2 kliknutiami → zrušenie max 2 kliknutiami
- [ ] Online zrušenie — v nastaveniach účtu (nie "napíšte nám e-mail")
- [ ] **ZAKÁZANÉ:** Vyžadovať telefonát, e-mail, alebo live chat na zrušenie
- [ ] **ZAKÁZANÉ:** Dark patterns pri zrušení (strašenie, skrytie tlačidla)
- [ ] Potvrdenie zrušenia na e-mail
- [ ] Jasná informácia do kedy má prístup

**Vzor zrušenia:**
```
Účet → Nastavenia → Predplatné → [Zrušiť predplatné]
→ "Naozaj chcete zrušiť?" → [Áno, zrušiť] / [Nie, ponechať]
→ Potvrdenie: "Predplatné bude zrušené. Prístup máte do [dátum]."
→ E-mail s potvrdením
```

---

## 2. Právo na odstúpenie pri digitálnych službách

### 2.1 Základné pravidlo
- 14-dňová lehota na odstúpenie BEZ udania dôvodu
- Platí aj pre subscriptions / predplatné

### 2.2 Výnimka — začatie poskytovania pred uplynutím lehoty

Spotrebiteľ MÔŽE stratiť právo na odstúpenie, ak:

1. **Výslovne požiadal** o začatie poskytovania pred uplynutím 14-dňovej lehoty
2. **Bol informovaný**, že tým stráca právo na odstúpenie
3. **Potvrdil** túto skutočnosť (checkbox, nie predvolený)

**Povinný checkbox pri objednávke:**
```
☐ Žiadam o okamžité začatie poskytovania digitálnej služby a beriem
  na vedomie, že uplynutím 14-dňovej lehoty na odstúpenie od zmluvy
  strácam právo na odstúpenie od zmluvy.
```

**Ak obchodník NEZABEZPEČÍ tento postup:**
- Spotrebiteľ má právo na odstúpenie kedykoľvek
- Lehota sa predlžuje o 12 mesiacov

### 2.3 Odstúpenie pri ročnom predplatnom

Ak spotrebiteľ odstúpi v rámci 14-dňovej lehoty:
- Má nárok na vrátenie plnej sumy
- Ak služba bola poskytovaná (so súhlasom), platí pomerná časť za využité dni

**Výpočet:**
```
Suma na vrátenie = Celková cena - (Celková cena / Počet dní obdobia × Počet využitých dní)
```

---

## 3. Zmeny v cenách / podmienkach

### 3.1 Zvýšenie ceny predplatného
- [ ] Informovať spotrebiteľa vopred (min. 30 dní odporúčaných)
- [ ] Jasná informácia o novej cene
- [ ] Právo spotrebiteľa zrušiť predplatné pred účinnosťou zmeny
- [ ] Nová cena sa uplatní až od nasledujúceho fakturačného obdobia
- [ ] Nemožno zvýšiť cenu uprostred zaplateného obdobia

### 3.2 Zmena podmienok služby
- [ ] Informovanie vopred
- [ ] Právo na odmietnutie zmeny / zrušenie
- [ ] Zachovanie pôvodných podmienok do konca aktuálneho obdobia

---

## 4. Vady digitálnej služby (Smernica 2019/770)

### 4.1 Definícia vady
Digitálna služba má vadu, ak:
- Nezodpovedá opisu v zmluve / na webe
- Nie je vhodná na účel, na ktorý spotrebiteľ digitálnu službu potrebuje
  (a o ktorom obchodníka informoval)
- Nie je vhodná na účel, na ktorý sa digitálna služba bežne používa
- Nemá vlastnosti, ktoré spotrebiteľ môže odôvodnene očakávať

### 4.2 Povinnosť aktualizácií
Obchodník je POVINNÝ poskytovať aktualizácie (bezpečnostné aj funkcionálne),
ktoré sú potrebné na zachovanie zhody digitálnej služby, počas doby poskytovania.

### 4.3 Lehota zodpovednosti
- **Pre priebežné poskytovanie (subscription):** po celú dobu poskytovania
- Dôkazné bremeno prvých 12 mesiacov: na obchodníkovi (predpoklad, že vada existovala)

### 4.4 Náprava
Poradie nápravných opatrení:
1. Uvedenie do zhody (oprava) — bezplatne, v primeranom čase
2. Primerané zníženie ceny
3. Odstúpenie od zmluvy (pri podstatnej vade)

---

## 5. Stripe — Právne aspekty

### 5.1 Stripe ako sprostredkovateľ platieb
- Stripe = platobný sprostredkovateľ, NIE banka
- Stripe je certifikovaný pod EU-US Data Privacy Framework
- Stripe's DPA je súčasťou ich ToS — nie je potrebná osobitná zmluva

### 5.2 PSD2 / SCA (Strong Customer Authentication)
- Stripe automaticky handluje SCA pre EÚ platby
- 3D Secure je požadovaný pre väčšinu EÚ kartových transakcií
- Obchodník nemusí riešiť PCI DSS (ak nevidí čísla kariet)

### 5.3 Refund povinnosti
- Ak spotrebiteľ odstúpi od zmluvy → refund do 14 dní
- Stripe refund je jednoduchý cez API/dashboard
- Stripe fee za pôvodnú transakciu sa NEVRACIA (náklad obchodníka)

### 5.4 Subscription billing s povinnosťami
```
Stripe subscription → pri vytvorení:
1. ✅ Zobraziť celkovú cenu vrátane DPH
2. ✅ Informovať o automatickom obnovovaní
3. ✅ Checkbox "Objednávka s povinnosťou platby"
4. ✅ Checkbox pre súhlas so začatím poskytovania
5. ✅ Odkaz na VOP + Privacy Policy

Stripe subscription → pri obnovení:
1. ✅ Pripomienka e-mail (best practice)
2. ✅ Informácia o výške platby
3. ✅ Odkaz na zrušenie

Stripe subscription → pri zrušení:
1. ✅ Potvrdiť zrušenie
2. ✅ Informovať o dátume konca prístupu
3. ✅ Refund podľa politiky
```

---

## 6. Free Trial → Paid Subscription

### 6.1 Povinnosti pri trial
- [ ] Jasná informácia o dĺžke trial obdobia
- [ ] Čo sa stane po skončení trial
- [ ] Ak sa automaticky konvertuje na platené → VÝSLOVNÝ SÚHLAS
- [ ] Informácia o cene po trial
- [ ] Pripomienka pred koncom trial (odporúčaná)
- [ ] Jednoduché zrušenie počas trial

### 6.2 Zakázané praktiky
- ❌ Skrytá konverzia trial na platené bez jasného informovania
- ❌ Vyžadovanie platobných údajov bez informácie o automatickej konverzii
- ❌ Sťaženie zrušenia počas trial

---

## 7. DPH pri SaaS v EÚ (B2C)

### 7.1 Pravidlo: DPH v krajine zákazníka
Pre B2C digitálne služby sa DPH odvádza v krajine zákazníka:
- SK: 23% (od 2025)
- CZ: 21%
- DE: 19%
- AT: 20%
- PL: 23%
- HU: 27%
- (atď.)

### 7.2 Riešenie: OSS (One Stop Shop)
- Registrácia na OSS v SR umožňuje odviesť DPH do všetkých krajín EÚ cez jedno podanie
- Prah: do 10 000 € ročného obratu v EÚ mimo SR môžete uplatňovať SK DPH

### 7.3 Stripe Tax
- Stripe Tax automaticky vypočíta a vyberie správnu DPH sadzbu
- Zjednodušuje compliance pre multi-country SaaS

### 7.4 Zobrazenie cien
- [ ] Cena MUSÍ byť vrátane DPH (B2C)
- [ ] Odporúčané: uviesť aj výšku DPH
- [ ] Ak sa DPH líši podľa krajiny → dynamické ceny alebo informácia
