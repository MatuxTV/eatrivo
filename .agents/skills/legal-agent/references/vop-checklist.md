# VOP Checklist — Všeobecné obchodné podmienky pre SaaS B2C

## Právny základ
- Zákon č. 108/2024 Z. z. o ochrane spotrebiteľa (§ 14-21)
- Občiansky zákonník (§ 52-54, spotrebiteľské zmluvy)
- Smernica 2011/83/EÚ o právach spotrebiteľov
- Smernica 2019/770/EÚ o digitálnom obsahu a digitálnych službách

---

## 1. Identifikácia obchodníka (§ 15 ods. 1 zák. 108/2024)

Pred uzavretím zmluvy na diaľku musí obchodník poskytnúť:

- [ ] Obchodné meno (presne podľa OR/ŽR)
- [ ] Právna forma (s.r.o., a.s., živnostník, atď.)
- [ ] Sídlo alebo miesto podnikania
- [ ] IČO
- [ ] DIČ / IČ DPH (ak je platca)
- [ ] Zápis v registri (OR + č. vložky, alebo ŽR + č. živnostenského oprávnenia)
- [ ] Telefónne číslo
- [ ] E-mailová adresa
- [ ] Adresa prevádzkarne (ak iná ako sídlo)
- [ ] Adresa na podávanie reklamácií (ak iná)
- [ ] Orgán dozoru: Slovenská obchodná inšpekcia (SOI), Inšpektorát SOI pre [kraj]

**Chyby, ktorým sa vyhnúť:**
- Neúplný názov spoločnosti
- Chýbajúce IČO
- Neaktuálna adresa
- Chýbajúci orgán dozoru

---

## 2. Opis digitálnej služby (§ 15 ods. 1 písm. a)

- [ ] Hlavné vlastnosti služby
- [ ] Funkcionality zahrnuté v jednotlivých plánoch
- [ ] Technické požiadavky (prehliadač, OS, internet)
- [ ] Kompatibilita a interoperabilita
- [ ] Obmedzenia služby (fair use, limity)
- [ ] Povinnosť poskytovania aktualizácií (Smernica 2019/770, čl. 8)
- [ ] Čo sa deje s dátami používateľa

---

## 3. Cena a platobné podmienky

### 3.1 Zobrazenie cien (§ 4 ods. 1 zák. 108/2024)
- [ ] Cena VRÁTANE DPH (konečná cena)
- [ ] Ak subscription: cena za fakturačné obdobie
- [ ] Informácia o mesačnom / ročnom pláne
- [ ] Porovnanie plánov (ak viacero)
- [ ] Zľavy: pôvodná cena musí byť najnižšia za posledných 30 dní

### 3.2 Subscription / recurring (§ 15 ods. 1 písm. e)
- [ ] Celková cena za fakturačné obdobie
- [ ] Frekvencia platieb (mesačne, ročne)
- [ ] **Informácia o automatickom obnovovaní**
- [ ] Dátum / podmienky ďalšej platby
- [ ] Ako zrušiť automatické obnovovanie
- [ ] **Postup zrušenia musí byť rovnako jednoduchý ako aktivácia**
- [ ] Čo sa stane po zrušení (prístup do konca obdobia?)
- [ ] Refund politika

### 3.3 Platobné metódy
- [ ] Zoznam akceptovaných platobných metód
- [ ] Informácia o platobnom sprostredkovateľovi (Stripe)
- [ ] Poplatky za platbu (ak existujú — ZAKÁZANÉ je účtovať poplatok za bežnú platbu kartou)
- [ ] Bezpečnosť platby (PCI DSS compliance cez Stripe)

### 3.4 Objednávkový proces
- [ ] **Objednávacie tlačidlo MUSÍ jasne uvádzať povinnosť platby**
  - ✅ "Objednať s povinnosťou platby"
  - ✅ "Záväzne objednať a zaplatiť"
  - ❌ "Pokračovať", "Odoslať", "Dokončiť"
- [ ] Sumarizácia objednávky pred potvrdením
- [ ] Možnosť skontrolovať a opraviť údaje
- [ ] Potvrdenie na e-mail

---

## 4. Právo na odstúpenie od zmluvy (§ 19-21 zák. 108/2024)

### 4.1 Základné pravidlo
- [ ] **14 dní** na odstúpenie BEZ udania dôvodu
- [ ] Lehota plynie odo dňa uzavretia zmluvy (pre služby)
- [ ] Informácia o práve na odstúpenie PRED uzavretím zmluvy
- [ ] Formulár na odstúpenie od zmluvy (vzor je v prílohe zákona)

### 4.2 Výnimka pre digitálny obsah / službu
Ak spotrebiteľ SÚHLASÍ so začatím poskytovania pred uplynutím lehoty:
- [ ] Výslovný súhlas so začatím poskytovania
- [ ] Spotrebiteľ bol informovaný, že tým stráca právo na odstúpenie
- [ ] Obchodník poskytol potvrdenie tohto súhlasu

**Vzor checkboxu pri objednávke:**
```
☐ Súhlasím so začatím poskytovania digitálnej služby pred uplynutím
  14-dňovej lehoty na odstúpenie od zmluvy a beriem na vedomie, že
  tým strácam právo na odstúpenie od zmluvy.
```

### 4.3 Ak obchodník NEINFORMOVAL o práve na odstúpenie
- Lehota sa predlžuje o 12 mesiacov! (§ 20 ods. 2)

### 4.4 Povinný formulár na odstúpenie
Musí obsahovať: komu, identifikácia zmluvy, dátum objednávky, meno, adresa, dátum, podpis.

---

## 5. Neprijateľné zmluvné podmienky (§ 53 OZ)

VOP NESMÚ obsahovať:

- [ ] ❌ Vylúčenie zodpovednosti za vady
- [ ] ❌ Jednostranná zmena podmienok bez súhlasu spotrebiteľa
- [ ] ❌ Neprimerane vysoké zmluvné pokuty
- [ ] ❌ Automatické predĺženie na neprimerane dlhé obdobie
- [ ] ❌ Rozhodcovská doložka
- [ ] ❌ Voľba práva iného štátu, ktorá zbavuje spotrebiteľa ochrany
- [ ] ❌ Povinné vzdanie sa práv
- [ ] ❌ Obmedzenie práva na reklamáciu
- [ ] ❌ Prenášanie dôkazného bremena na spotrebiteľa
- [ ] ❌ Odkazovanie na dokumenty, s ktorými sa spotrebiteľ nemohol oboznámiť

**DÔSLEDOK:** Neprijateľná podmienka je NEPLATNÁ. Zvyšok zmluvy platí.

---

## 6. SaaS-špecifické ustanovenia

### 6.1 SLA (Service Level Agreement)
- [ ] Garantovaná dostupnosť (ak sa uvádza)
- [ ] Kompenzácia pri výpadku
- [ ] Plánovaná údržba — informovanie vopred

### 6.2 Dáta používateľa
- [ ] Kto vlastní dáta vytvorené v službe
- [ ] Export dát (povinnosť podľa GDPR čl. 20 — právo na prenosnosť)
- [ ] Uchovávanie dát po zrušení účtu (lehota)
- [ ] Vymazanie dát po zrušení účtu (lehota)

### 6.3 Zmeny služby
- [ ] Ako sa informuje o zmenách VOP
- [ ] Lehota na oboznámenie sa (min. 30 dní odporúčaná)
- [ ] Právo odstúpiť pri podstatnej zmene
- [ ] Zmeny v cenníku — informácia vopred

### 6.4 Ukončenie / zrušenie účtu
- [ ] Podmienky ukončenia zo strany obchodníka
- [ ] Podmienky ukončenia zo strany spotrebiteľa
- [ ] Postup pri porušení podmienok
- [ ] Vrátenie pomernej časti predplatného

---

## 7. Informácia o ARS

**Povinný text vo VOP (§ 11 ods. 2 zák. 391/2015):**

```
Spotrebiteľ má právo obrátiť sa na obchodníka so žiadosťou o nápravu,
ak nie je spokojný so spôsobom, ktorým obchodník vybavil jeho reklamáciu,
alebo ak sa domnieva, že obchodník porušil jeho práva. Ak obchodník na
žiadosť o nápravu odpovie zamietavo alebo na ňu neodpovie do 30 dní,
spotrebiteľ má právo podať návrh na začatie alternatívneho riešenia sporu
subjektu ARS podľa zákona 391/2015 Z.z.

Zoznam subjektov ARS: https://www.mhsr.sk/obchod/ochrana-spotrebitela/alternativne-riesenie-spotrebitelskych-sporov-1/zoznam-subjektov-alternativneho-riesenia-spotrebitelskych-sporov-1

Platforma ODR: https://ec.europa.eu/consumers/odr/
```

---

## 8. Multi-jazyková verzia (EÚ trh)

Ak web cieli na viaceré EÚ krajiny:
- VOP v jazyku, v ktorom sa služba ponúka
- Spotrebiteľ z danej krajiny má právo na ochranu podľa SVOJHO národného práva
- Nemožno voľbou práva zbaviť spotrebiteľa ochrany jeho domovského štátu (Nariadenie Rím I, čl. 6)
