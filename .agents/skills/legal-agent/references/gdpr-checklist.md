# GDPR Checklist — Ochrana osobných údajov pre SaaS B2C

## Právny základ
- GDPR (Nariadenie 2016/679)
- Zákon č. 18/2018 Z. z. o ochrane osobných údajov
- Zákon č. 452/2021 Z. z. o elektronických komunikáciách (cookies)

---

## 1. Privacy Policy — Povinný obsah (čl. 13 GDPR)

### 1.1 Identifikácia prevádzkovateľa
- [ ] Názov / obchodné meno
- [ ] Sídlo / adresa
- [ ] IČO
- [ ] Kontaktný e-mail
- [ ] Telefón
- [ ] Kontakt na DPO (Data Protection Officer) — ak je vymenovaný

### 1.2 Kedy je DPO povinný?
DPO je povinný ak:
- Hlavné činnosti zahŕňajú pravidelné a systematické monitorovanie dotknutých osôb vo veľkom rozsahu
- Hlavné činnosti zahŕňajú rozsiahle spracúvanie osobitných kategórií údajov

**Pre väčšinu SaaS startupov DPO nie je povinný,** ale je odporúčaný.

### 1.3 Účely a právne základy — TABUĽKA

Pre KAŽDÝ účel spracúvania musí byť uvedený právny základ:

```markdown
| Účel | Osobné údaje | Právny základ | Doba uchovávania |
|------|-------------|---------------|-------------------|
| Registrácia a správa účtu | meno, e-mail, heslo (hash) | Plnenie zmluvy čl. 6/1/b | Počas trvania účtu + 3 roky |
| Poskytovanie služby | údaje vytvorené v službe | Plnenie zmluvy čl. 6/1/b | Počas trvania účtu |
| Fakturácia a platby | meno, adresa, platobné údaje | Plnenie zmluvy + zákonná povinnosť čl. 6/1/c | 10 rokov (zákon o účtovníctve) |
| Zákaznícka podpora | meno, e-mail, obsah komunikácie | Plnenie zmluvy čl. 6/1/b | 3 roky po vyriešení |
| Newsletter | e-mail | Súhlas čl. 6/1/a | Do odvolania súhlasu |
| Marketing vlastných produktov | e-mail | Oprávnený záujem čl. 6/1/f | Do námietky |
| Marketing tretích strán | e-mail, preferencie | Súhlas čl. 6/1/a | Do odvolania súhlasu |
| Analytics (Google Analytics) | IP, cookies, správanie | Súhlas čl. 6/1/a (cez cookie consent) | Podľa nastavenia GA |
| Bezpečnosť a prevencia podvodov | IP, logy, údaje o zariadení | Oprávnený záujem čl. 6/1/f | 6 mesiacov |
| Zlepšovanie služby | anonymizované dáta o používaní | Oprávnený záujem čl. 6/1/f | Neobmedzene (anonymizované) |
```

### 1.4 Oprávnený záujem — balancing test
Ak je právnym základom oprávnený záujem, musí existovať dokumentovaný balancing test:
- Aký je oprávnený záujem prevádzkovateľa?
- Sú údaje potrebné na tento účel?
- Aký je dopad na práva dotknutej osoby?
- Prevažuje záujem prevádzkovateľa nad právami dotknutej osoby?
- Aké opatrenia sú implementované na ochranu?

### 1.5 Príjemcovia údajov

Musí obsahovať zoznam kategórií príjemcov:

```markdown
Vaše osobné údaje môžu byť poskytnuté nasledujúcim kategóriám príjemcov:

- **Platobný sprostredkovateľ:** Stripe, Inc. (USA) — spracovanie platieb
- **Hosting provider:** [Názov] — ukladanie dát
- **E-mail provider:** [Názov] — zasielanie transakčných e-mailov
- **Analytický nástroj:** Google LLC (USA) — analýza návštevnosti (len so súhlasom)
- **Zákaznícka podpora:** [Názov] — CRM systém
- **Účtovný softvér:** [Názov] — fakturácia
- **Orgány verejnej moci:** ak to vyžaduje zákon
```

### 1.6 Prenos do tretích krajín

Ak sa údaje prenášajú mimo EÚ/EÓHP (USA — Stripe, Google, atď.):
- [ ] Identifikácia tretej krajiny
- [ ] Právny mechanizmus prenosu:
  - EU-US Data Privacy Framework (pre certifikované subjekty)
  - Štandardné zmluvné doložky (SCC)
  - Záväzné vnútropodnikové pravidlá (BCR)
- [ ] Odkaz na kópiu záruk alebo informácia kde ich získať

### 1.7 Doba uchovávania

Pre KAŽDÚ kategóriu údajov musí byť uvedená:
- Konkrétna lehota (napr. "3 roky po zrušení účtu"), ALEBO
- Kritériá na určenie lehoty (napr. "po dobu trvania zmluvného vzťahu")

### 1.8 Práva dotknutej osoby

Musí obsahovať informáciu o VŠETKÝCH právach:
- [ ] Právo na prístup (čl. 15) — získať kópiu údajov
- [ ] Právo na opravu (čl. 16)
- [ ] Právo na výmaz / "zabudnutie" (čl. 17)
- [ ] Právo na obmedzenie spracúvania (čl. 18)
- [ ] Právo na prenosnosť (čl. 20) — export v strojovo čitateľnom formáte
- [ ] Právo namietať (čl. 21) — najmä voči direct marketingu
- [ ] Právo odvolať súhlas — kedykoľvek, bez vplyvu na zákonnosť predchádzajúceho spracúvania
- [ ] Právo podať sťažnosť na dozorný orgán:
  - **Úrad na ochranu osobných údajov SR**
  - Hraničná 12, 820 07 Bratislava 27
  - https://dataprotection.gov.sk

### 1.9 Automatizované rozhodovanie

- [ ] Informácia či dochádza k automatizovanému rozhodovaniu vrátane profilovania
- [ ] Ak áno: logika, význam a predpokladané dôsledky

---

## 2. Technické opatrenia

### 2.1 Bezpečnosť (čl. 32 GDPR)
- [ ] Šifrovanie osobných údajov (at rest + in transit)
- [ ] Schopnosť zabezpečiť trvalú dôvernosť, integritu, dostupnosť
- [ ] Schopnosť včas obnoviť dostupnosť po incidente
- [ ] Pravidelné testovanie a hodnotenie účinnosti opatrení

### 2.2 Data breach postup (čl. 33-34 GDPR)
- [ ] Interný postup pre prípad narušenia bezpečnosti
- [ ] Notifikácia ÚOOÚ do 72 hodín (ak riziko pre práva)
- [ ] Notifikácia dotknutých osôb bez zbytočného odkladu (ak vysoké riziko)

### 2.3 DPIA (čl. 35 GDPR)
Posúdenie vplyvu na ochranu údajov je povinné ak:
- Systematické monitorovanie verejne prístupných priestorov
- Rozsiahle spracúvanie osobitných kategórií
- Automatizované rozhodovanie s právnymi účinkami

Pre väčšinu SaaS nie je povinné, ale je odporúčané.

---

## 3. Záznamy o spracovateľských činnostiach (čl. 30 GDPR)

Povinné pre organizácie s 250+ zamestnancami, ALEBO ak:
- Spracúvanie nie je príležitostné
- Spracúvanie zahŕňa osobitné kategórie údajov
- Spracúvanie predstavuje riziko

**Pre SaaS s registráciou a platbami je zvyčajne POVINNÉ** (nie je príležitostné).

Obsah záznamov:
- [ ] Meno a kontakt prevádzkovateľa
- [ ] Účely spracúvania
- [ ] Kategórie dotknutých osôb a osobných údajov
- [ ] Kategórie príjemcov
- [ ] Prenosy do tretích krajín
- [ ] Lehoty na výmaz
- [ ] Opis technických a organizačných opatrení

---

## 4. Newsletter / E-mail marketing

### 4.1 Právny základ
- **Nový zákazník (soft opt-in):** Oprávnený záujem — len vlastné podobné produkty, s jednoduchou možnosťou odhlásenia
- **Všeobecný newsletter:** Súhlas — výslovný opt-in

### 4.2 Požiadavky na súhlas
- [ ] Slobodný — nie podmienený registráciou
- [ ] Konkrétny — pre newsletter, nie paušálny
- [ ] Informovaný — vie na čo súhlasí
- [ ] Jednoznačný — aktívne konanie (checkbox, NIE pre-zaškrtnutý)
- [ ] Double opt-in (odporúčaný, nie povinný ale best practice)
- [ ] Evidencia súhlasov (kto, kedy, na čo súhlasil)

### 4.3 Odhlásenie
- [ ] Odkaz na odhlásenie v KAŽDOM e-maile
- [ ] Odhlásenie jedným kliknutím (jedno kliknutie postačuje)
- [ ] Spracovanie odhlásenia do 10 dní

---

## 5. Stripe a platobné údaje

### 5.1 Zodpovednosť za platobné údaje
- Stripe je samostatný prevádzkovateľ pre čísla kariet
- Vaša SaaS je prevádzkovateľ pre fakturačné údaje
- PCI DSS compliance je na Stripe (ak nevidíte čísla kariet)

### 5.2 Informačná povinnosť
- [ ] Informovať že Stripe spracúva platobné údaje
- [ ] Odkaz na Stripe Privacy Policy
- [ ] Informácia o prenose do USA (Stripe je US spoločnosť)
- [ ] EU-US Data Privacy Framework certifikácia Stripe

### 5.3 Zmluva so Stripe
- Stripe's DPA (Data Processing Agreement) je automaticky súčasťou Terms of Service
- Kontrola: https://stripe.com/privacy

---

## 6. Bežné chyby v Privacy Policy

- ❌ Copy-paste z inej stránky bez prispôsobenia
- ❌ Chýbajúce konkrétne účely a právne základy
- ❌ "Vaše údaje zdieľame s partnermi" bez špecifikácie
- ❌ Chýbajúca doba uchovávania
- ❌ Chýbajúca informácia o prenose do tretích krajín
- ❌ Chýbajúce práva dotknutej osoby
- ❌ Neaktuálna adresa ÚOOÚ
- ❌ Chýbajúca informácia o cookies (alebo len "používame cookies")
- ❌ Zastaralé / neexistujúce kontaktné údaje
