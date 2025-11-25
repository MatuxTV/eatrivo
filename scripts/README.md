# Database Merge Script

Tento skript slúži na kopírovanie celej databázy (schéma + dáta) z develop vetvy do main vetvy pomocou Drizzle ORM.

## 🎯 Účel

- Kopíruje **všetky tabuľky** z develop DB do main DB
- Zachováva **schému databázy** (definovanú v `src/db/schema.ts`)
- Kopíruje **všetky dáta** (riadok po riadku)
- Rešpektuje **foreign key constraints** (správne poradie tabuliek)

## ⚙️ Príprava

### 1. Nastavenie environment premenných

V súbore `.env.local` pridaj:

```env
# Zdrojová databáza (develop branch)
DATABASE_URL_DEVELOP=postgresql://username:password@host/database_develop

# Cieľová databáza (main branch)  
DATABASE_URL_MAIN=postgresql://username:password@host/database_main
```

**Príklad pre Neon DB:**
```env
DATABASE_URL_DEVELOP=postgresql://user:pwd@ep-xxx-develop.region.aws.neon.tech/neondb
DATABASE_URL_MAIN=postgresql://user:pwd@ep-xxx-main.region.aws.neon.tech/neondb
```

### 2. Overiť schému

Uisti sa, že v **oboch databázach** (develop aj main) je rovnaká schéma:

```bash
# Pushni schému do develop DB
DATABASE_URL=$DATABASE_URL_DEVELOP npm run db:push

# Pushni schému do main DB
DATABASE_URL=$DATABASE_URL_MAIN npm run db:push
```

## 🚀 Spustenie

```bash
npm run db:merge
```

## ⚠️ Bezpečnostné upozornenie

**POZOR:** Tento skript **VYMAŽE všetky dáta** v main (cieľovej) databáze!

Pred spustením:
1. ✅ Skontroluj, že máš správne nastavené URL databáz
2. ✅ Uisti sa, že main DB obsahuje schému (prázdnu)
3. ✅ **Vytvor si BACKUP main databázy** (ak obsahuje dôležité dáta)

## 📊 Čo skript robí?

1. **Pripojí sa** na obe databázy (develop = source, main = target)
2. **Zistí všetky tabuľky** v oboch databázach
3. **Analyzuje** koľko záznamov má každá tabuľka
4. **Vyprázdni** cieľové tabuľky (TRUNCATE CASCADE)
5. **Skopíruje dáta** v správnom poradí (kvôli FK):
   - users
   - user_profiles
   - user_info
   - shopping_lists
   - meal_plans
   - shopping_list_downloads
   - food_items
   - ...ostatné tabuľky
6. **Zobrazí súhrn** - koľko tabuliek a záznamov bolo skopírovaných

## 📝 Výstup

Skript zobrazuje progress v reálnom čase:

```
=== DATABASE SYNCHRONIZATION START ===

SOURCE (develop): postgresql://****@host/db_develop
TARGET (main):    postgresql://****@host/db_main

============================================================

STEP 1: Fetching tables...

Source DB (develop): 10 tables
Target DB (main):    10 tables

STEP 2: Analyzing source database...

   users: 15 records
   user_profiles: 15 records
   user_info: 12 records
   shopping_lists: 45 records
   ...

============================================================

STEP 3: Copying data...

COPYING: "users" (15 records)
   CLEARED: Table "users" in main DB
   COPIED: 15 / 15 records
   SUCCESS: 15 records copied from "users"

COPYING: "user_profiles" (15 records)
   CLEARED: Table "user_profiles" in main DB
   COPIED: 15 / 15 records
   SUCCESS: 15 records copied from "user_profiles"
...

============================================================

SYNCHRONIZATION COMPLETE!

Summary:
   - Copied tables: 7
   - Total records: 120

DONE!
```

## 🔧 Troubleshooting

### Chyba: "Missing required environment variables"
→ Skontroluj, že máš nastavené `DATABASE_URL_DEVELOP` a `DATABASE_URL_MAIN` v `.env.local`

### Chyba: "relation does not exist"
→ Cieľová databáza nemá schému. Spusti najprv `DATABASE_URL=$DATABASE_URL_MAIN npm run db:push`

### Chyba: "violates foreign key constraint"
→ Problém s poradím tabuliek. Uprav `tableOrder` pole v `merge-db.ts`

### Skript "visí" pri kopírovaní
→ Veľké množstvo dát. Zmenší `batchSize` (momentálne 100) na nižšiu hodnotu

## 🎨 Customizácia

### Zmeniť batch size (pre lepší performance)

V `merge-db.ts`:
```typescript
const batchSize = 50; // zmenši na 50 alebo 200
```

### Preskočiť určité tabuľky

```typescript
// V syncDatabase() funkcii, pred for cyklom:
const skipTables = ['food_items']; // pridaj názvy tabuliek
if (skipTables.includes(tableName)) {
  console.log(`SKIP: "${tableName}" (manually excluded)`);
  continue;
}
```

### Pridať potvrdenie pred spustením

```typescript
// Po "WARNING: This operation will DELETE..." pridaj:
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

await new Promise((resolve) => {
  rl.question('Pokračovať? (yes/no): ', (answer: string) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('Zrušené.');
      process.exit(0);
    }
    rl.close();
    resolve(true);
  });
});
```

## 📦 Technické detaily

- **Databáza**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Runtime**: Node.js + tsx
- **Jazyk**: TypeScript
- **Batch insert**: 100 záznamov naraz (konfigurovateľné)
- **FK handling**: TRUNCATE CASCADE + správne poradie tabuliek

## 🔐 Best Practices

1. **Vždy testuj najprv na testing DB** - nie na production
2. **Backupuj main DB** pred spustením
3. **Používaj read-only DB URLs** pre source (develop) ak možno
4. **Spusti mimo peak hours** - môže trvať dlho pri veľkých DB
5. **Monitoruj disk space** - dočasne zaberie 2x priestor

## 📚 Ďalšie zdroje

- [Drizzle ORM dokumentácia](https://orm.drizzle.team)
- [Neon DB docs](https://neon.tech/docs)
- [PostgreSQL TRUNCATE](https://www.postgresql.org/docs/current/sql-truncate.html) 