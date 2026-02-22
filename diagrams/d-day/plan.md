🚀 EatRivo: Stratégia prechodu na platenú verziu (Dual Trial Strategy)
Stratégia: Dvojúrovňový Trial (30 dní pre Legacy / 14 dní pre Nových)
Cieľ: Odmeniť vernosť existujúcich používateľov nadštandardným benefitom ("Founder's Month") a zároveň nastaviť zdravý konverzný model pre nových používateľov.
Technológia: Next.js (App Router), Prisma, Stripe.

📅 FÁZA 1: Segmentácia a Migrácia Databázy
Čas vykonania: Deň D (Launch Day)

Musíme v databáze jasne rozlíšiť, kto bol s nami "predtým" (Legacy) a kto prišiel "potom" (New), aby sme im mohli prideliť správnu dĺžku skúšobnej doby.

1.1 Úprava Schémy (Schema Update)
Do modelu používateľa (User) pridáme polia:

Plan: basic (neplatiaci) vs. premium (platiaci).

Is Legacy: Boolean. Toto je kľúčový identifikátor.

TRUE = Existujúci používateľ pred spustením platenej verzie (nárok na 30 dní).

FALSE = Nový používateľ registrovaný po spustení (nárok na 14 dní).

Stripe Fields: ID zákazníka, ID predplatného, status.

1.2 Migračný Skript (The Reset)
Skript, ktorý sa spustí jednorazovo na produkcii:

Nájde všetkých aktuálnych používateľov.

Nastaví im isLegacy = TRUE.

Nastaví im plan = basic (aby sa im pri najbližšom otvorení aplikácie zobrazil Founder's Modal).

💳 FÁZA 2: Backend Logika (Dual Stripe Integration)
Backend musí byť inteligentný a dynamicky určovať dĺžku trialu na základe statusu používateľa.

2.1 Dynamický Checkout Endpoint
Vytvoríme API logiku, ktorá pri vytváraní Stripe Session skontroluje používateľa:

Scenár A (Legacy Používateľ):

Backend overí: user.isLegacy === true.

Stripe Session nastavenie: trial_period_days: 30.

Výsledok: Používateľ vidí v Stripe: "Prvých 30 dní zdarma (0,00 €)."

Scenár B (Nový Používateľ):

Backend overí: user.isLegacy === false.

Stripe Session nastavenie: trial_period_days: 14.

Výsledok: Používateľ vidí v Stripe: "Prvých 14 dní zdarma (0,00 €)."

2.2 Webhook Handler
Zostáva rovnaký. Stripe pošle notifikáciu checkout.session.completed bez ohľadu na dĺžku trialu. Aplikácia odomkne Premium funkcie okamžite po zadaní karty.

🎨 FÁZA 3: Frontend UX (Dve rôzne cesty)
Musíme vytvoriť dva odlišné zážitky – jeden slávnostný pre verných a jeden predajný pre nových.

3.1 Cesta pre Legacy používateľov ("Founder's Month")
Zobrazí sa "Founder's Modal" hneď po prihlásení (ak sú Basic).

Vizuál: Exkluzívny, zlatý/prémiový dizajn. Rivo oslavuje.

Copywriting: "Si s nami od začiatku. To si vážime."

Ponuka: 30 dní Premium zdarma. Celý mesiac na náš účet.

Psychológia: Toto nie je "skúška". Toto je darček.

3.2 Cesta pre Nových používateľov ("Standard Onboarding")
Zobrazí sa počas registrácie alebo pri pokuse o použitie platenej funkcie.

Vizuál: Štandardný, čistý, moderný dizajn. Rivo vysvetľuje hodnotu.

Copywriting: "Začni svoju cestu k lepšiemu stravovaniu."

Ponuka: 14 dní Premium zdarma. Vyskúšaj, kým zaplatíš.

Psychológia: Klasický "Risk-free trial".

3.3 Logika zamykania (Locking)
Pre obidve skupiny platí rovnaké obmedzenie, ak nezadajú kartu:

Odomknuté: Nákupný zoznam a Špajza (Inventory).

Zamknuté: Meal Plan, Weekly Goals, AI Chat.

Interakcia: Kliknutie na zámok otvorí príslušný modal (buď 30-dňový alebo 14-dňový, podľa toho, kto je prihlásený).

🛡️ FÁZA 4: Retencia a Komunikácia
4.1 E-mailová sekvencia (Rozlíšená)
Legacy (30 dní):

Deň 25: "Dúfame, že si si užil svoj Founder's mesiac. Tvoje predplatné pokračuje o 5 dní."

Noví (14 dní):

Deň 11: "Tvoja skúšobná doba končí o 3 dni. Nezabudni si naplánovať jedálniček na ďalší týždeň."

4.2 Ochrana proti zneužitiu
Keďže 30 dní je štedrých, musíme zabezpečiť, aby si noví používatelia nemohli technicky vynútiť Legacy status (preto sa isLegacy nastavuje iba priamym zásahom do databázy a nie cez API pri registrácii).

📝 KONTROLNÝ ZOZNAM (Checklist)
Stripe: Nastaviť produkt a cenu (rovnaká cena pre všetkých, líši sa len trial).

Databáza: Pridať stĺpec isLegacy a spustiť migráciu.

Backend: Implementovať podmienku if (user.isLegacy) trial = 30 else trial = 14.

Frontend: Pripraviť dve verzie textov pre Modaly (Darček vs. Ponuka).

Testovanie: Overiť, že existujúci účet dostane 30 dní a novovytvorený účet dostane 14 dní.