---
name: nextjs-security-audit
description: >
  Sub-agent pre Antigravity — kompletný bezpečnostný audit Next.js aplikácií.
  Použij VŽDY keď sa rieši bezpečnosť Next.js projektu, code review zameraný na security,
  hľadanie zraniteľností, hardening, alebo keď používateľ spomína "security audit",
  "bezpečnosť", "zraniteľnosť", "vulnerability", "XSS", "CSRF", "injection", "auth",
  "authorization", "authentication", "OWASP", "pentest", "hardening", "security headers",
  "env variables", "secrets", "API security", "middleware", "server actions", "RSC security",
  alebo akúkoľvek bezpečnostnú tému v kontexte Next.js. Trigger aj pri nasadení do produkcie,
  pri code review, alebo keď sa pridáva nová funkcionalita zahŕňajúca autentifikáciu,
  autorizáciu, formuláre, API routes, alebo spracovanie užívateľského vstupu.
  Tento skill robí HĹBKOVÝ audit — prechádza celú aplikáciu súbor po súbore.
---

# Next.js Security Audit Agent — Antigravity

Tento agent vykonáva systematický, hĺbkový bezpečnostný audit celej Next.js aplikácie.
Neprechádza len povrchovo — číta každý relevantný súbor a hľadá konkrétne vzory zraniteľností.

## Filozofia

Bezpečnosť nie je checklist na odškrtnutie. Tento agent premýšľa ako útočník — pri každom
súbore sa pýta "ako by som toto mohol zneužiť?" a zároveň premýšľa o defense-in-depth.

## Workflow — Kompletný audit

### Fáza 0: RECONNAISSANCE — Pochop aplikáciu

Pred akýmkoľvek auditom najprv pochop, čo máš pred sebou:

```bash
# 1. Zisti štruktúru projektu
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | head -100
ls -la

# 2. Analyzuj dependencies
cat package.json | grep -A 200 '"dependencies"'
cat package.json | grep -A 50 '"devDependencies"'

# 3. Zisti Next.js verziu a konfiguráciu
cat next.config.js 2>/dev/null || cat next.config.mjs 2>/dev/null || cat next.config.ts 2>/dev/null

# 4. Zisti auth provider
grep -r "next-auth\|NextAuth\|clerk\|supabase.*auth\|firebase.*auth\|lucia\|better-auth" --include="*.ts" --include="*.tsx" -l

# 5. Nájdi env súbory
ls -la .env* 2>/dev/null
cat .env.example 2>/dev/null
cat .env.local 2>/dev/null  # POZOR: reportuj len čo je nebezpečné, nie hodnoty

# 6. Zisti routing model (App Router vs Pages Router)
ls -la app/ 2>/dev/null && echo "APP ROUTER detected"
ls -la pages/ 2>/dev/null && echo "PAGES ROUTER detected"
ls -la src/app/ 2>/dev/null && echo "APP ROUTER (src/) detected"
ls -la src/pages/ 2>/dev/null && echo "PAGES ROUTER (src/) detected"
```

**Výstup:** Stručný prehľad — Next.js verzia, routing model, auth provider, hlavné závislosti.

### Fáza 1: KRITICKÉ BEZPEČNOSTNÉ KONTROLY

Prečítaj `references/critical-vulnerabilities.md` — obsahuje detailné vzory pre najvážnejšie zraniteľnosti.

Tieto kontroly majú najvyššiu prioritu, pretože ich zneužitie môže viesť k úplnému kompromitovaniu:

**1.1 Server Actions Security**
```bash
# Nájdi všetky Server Actions
grep -rn '"use server"' --include="*.ts" --include="*.tsx" -l
grep -rn "'use server'" --include="*.ts" --include="*.tsx" -l

# Kontrola: má každá action auth guard?
# Kontrola: validuje sa input (zod, valibot, joi)?
# Kontrola: sú actions v standalone súboroch alebo inline?
```

**1.2 API Routes Security**
```bash
# Nájdi všetky API routes
find . -path "*/api/*" -name "*.ts" -o -path "*/api/*" -name "*.js" | grep -v node_modules
find . -path "*/route.ts" -o -path "*/route.js" | grep -v node_modules

# Pre každý route kontroluj:
# - Auth/authz guard na začiatku
# - Input validácia
# - Rate limiting
# - Správne HTTP metódy
# - Error handling (neleakovať stack traces)
```

**1.3 Middleware & Auth**
```bash
# Nájdi middleware
find . -name "middleware.ts" -o -name "middleware.js" | grep -v node_modules

# Auth konfigurácia
grep -rn "getServerSession\|getSession\|auth()\|currentUser\|getUser" --include="*.ts" --include="*.tsx" -l | grep -v node_modules
```

**1.4 Environment Variables**
```bash
# Kontrola leaku server-side secrets do klienta
grep -rn "NEXT_PUBLIC_" --include="*.env*" | grep -i "secret\|key\|password\|token\|private"

# Kontrola hardcoded secrets v kóde
grep -rn "password\|secret\|api_key\|apiKey\|private_key\|token" --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules | grep -v ".env" | grep -v "type\|interface\|placeholder\|example\|mock"
```

### Fáza 2: INJECTION & INPUT VALIDATION

Prečítaj `references/injection-patterns.md` pre Next.js-špecifické injection vzory.

**2.1 SQL / NoSQL Injection**
```bash
# Raw SQL queries bez parametrizácie
grep -rn "raw\|rawQuery\|\$queryRaw\|\$executeRaw\|query(" --include="*.ts" --include="*.tsx" -l | grep -v node_modules

# String concatenation v queries
grep -rn '`.*\$\{.*\}.*`' --include="*.ts" --include="*.tsx" | grep -i "select\|insert\|update\|delete\|where\|from" | grep -v node_modules
```

**2.2 XSS (Cross-Site Scripting)**
```bash
# dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx" | grep -v node_modules

# Unescaped user input v href/src
grep -rn "href=\{.*\}\|src=\{.*\}" --include="*.tsx" --include="*.jsx" | grep -v node_modules | head -30
```

**2.3 Path Traversal**
```bash
# Dynamické file operations
grep -rn "readFile\|readFileSync\|writeFile\|createReadStream\|fs\." --include="*.ts" --include="*.tsx" | grep -v node_modules

# Dynamické route parametre používané v file paths
grep -rn "params\.\|searchParams\.\|query\." --include="*.ts" --include="*.tsx" | grep -i "path\|file\|dir\|folder" | grep -v node_modules
```

**2.4 Command Injection**
```bash
# exec, spawn, execSync
grep -rn "exec(\|execSync\|spawn\|spawnSync\|child_process" --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules
```

### Fáza 3: AUTHENTICATION & AUTHORIZATION

Prečítaj `references/auth-security.md` pre kompletné auth vzory.

**3.1 Auth Configuration**
```bash
# NextAuth / Auth.js konfigurácia
find . -name "auth.ts" -o -name "auth.js" -o -name "[...nextauth]*" | grep -v node_modules

# Kontroluj:
# - Je NEXTAUTH_SECRET nastavený? (nie hardcoded)
# - JWT expiration — nie príliš dlhý
# - Session strategy (jwt vs database)
# - Callback security (redirect, signIn callbacks)
# - Provider konfigurácia
```

**3.2 Route Protection**
```bash
# Nechránené server components a pages
# Prehľad všetkých pages/layouts
find . -name "page.tsx" -o -name "page.ts" -o -name "page.jsx" | grep -v node_modules

# Pre KAŽDÚ page kontroluj:
# - Je chránená auth guardом?
# - Ak je verejná, mala by byť?
# - Má správny RBAC (role-based access)?
```

**3.3 Authorization Bypass**
```bash
# Kontrola IDOR (Insecure Direct Object Reference)
# Hľadaj endpointy kde sa berie ID z requestu bez overenia vlastníctva
grep -rn "params\.\(id\|userId\|slug\)" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

### Fáza 4: DATA EXPOSURE & INFORMATION LEAKS

**4.1 Server/Client Boundary**
```bash
# Kontrola "use client" vs "use server" boundaries
grep -rn '"use client"' --include="*.ts" --include="*.tsx" -l | head -30

# Hľadaj server-only dáta v client components
grep -rn "process\.env\." --include="*.ts" --include="*.tsx" | grep -v "NEXT_PUBLIC" | grep -v node_modules

# Kontrola či sa neprenášajú citlivé dáta cez props do client components
```

**4.2 Error Handling**
```bash
# Kontrola error pages
find . -name "error.tsx" -o -name "error.ts" -o -name "not-found.tsx" | grep -v node_modules

# Či errory neleakujú stack traces v produkcii
grep -rn "stack\|stackTrace\|err\.message" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "test\|spec"

# Global error boundary
find . -name "global-error.tsx" -o -name "global-error.ts" | grep -v node_modules
```

**4.3 API Response Data**
```bash
# Kontrola či API routes nevracajú viac dát než treba
# Hľadaj priame vracanie DB objektov
grep -rn "NextResponse.json\|Response.json\|res\.json\|res\.send" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

### Fáza 5: KONFIGURÁCIA & HEADERS

**5.1 next.config Security**
```bash
# Prečítaj next.config
cat next.config.js 2>/dev/null || cat next.config.mjs 2>/dev/null || cat next.config.ts 2>/dev/null

# Kontrola:
# - headers() — security headers nastavené?
# - images.remotePatterns — nie príliš široký wildcard?
# - experimental features — žiadne nebezpečné?
# - rewrites/redirects — žiadne open redirecty?
# - poweredByHeader — mal by byť false
# - serverExternalPackages — správne nastavené?
```

**5.2 Security Headers**
Kontroluj v `next.config` alebo middleware:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY (alebo SAMEORIGIN)
X-XSS-Protection: 0 (modern browsers, CSP je lepší)
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: ... (kompletná CSP)
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**5.3 CORS**
```bash
# Kontrola CORS nastavení
grep -rn "Access-Control\|cors\|CORS" --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules
grep -rn "origin.*\*\|credentials.*true" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

### Fáza 6: DEPENDENCY AUDIT

```bash
# NPM audit
npm audit 2>/dev/null || echo "npm audit failed"

# Kontrola outdated packages
npm outdated 2>/dev/null | head -30

# Kontrola known vulnerable packages
grep -E "lodash|moment|minimist|node-fetch|axios" package.json
```

### Fáza 7: ADDITIONAL CHECKS

Prečítaj `references/nextjs-specific.md` pre Next.js-špecifické bezpečnostné vzory.

**7.1 File Upload**
```bash
grep -rn "upload\|multer\|formidable\|busboy\|multipart" --include="*.ts" --include="*.tsx" | grep -v node_modules
# Kontrola: validácia type, size, sanitizácia filename
```

**7.2 Rate Limiting**
```bash
grep -rn "rateLimit\|rate-limit\|throttle\|upstash.*ratelimit" --include="*.ts" --include="*.tsx" | grep -v node_modules
# Ak chýba → CRITICAL warning pre API routes a auth endpointy
```

**7.3 CSRF Protection**
```bash
grep -rn "csrf\|CSRF\|csrfToken\|_csrf" --include="*.ts" --include="*.tsx" | grep -v node_modules
# Server Actions majú automatickú CSRF protection, ale custom API routes nie
```

**7.4 Logging & Monitoring**
```bash
grep -rn "console\.log\|console\.error\|console\.warn" --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l
# Kontrola: neleakujú sa citlivé dáta do logov?
```

## Výstupný Report

Po audite vytvor štruktúrovaný report. Spusti `scripts/generate-report.js` alebo vytvor report manuálne:

### Report štruktúra

```markdown
# 🔒 Security Audit Report — [Projekt]
**Dátum:** YYYY-MM-DD
**Next.js verzia:** X.X.X
**Routing model:** App Router / Pages Router
**Auth provider:** NextAuth / Clerk / Custom / ...

## Executive Summary
- **Celkové riziko:** CRITICAL / HIGH / MEDIUM / LOW
- **Nájdené zraniteľnosti:** X critical, Y high, Z medium, W low
- **Najnaliehavejší fix:** [popis]

## Kritické nálezy (CRITICAL)
### [C-001] Názov zraniteľnosti
- **Súbor:** `path/to/file.ts:42`
- **Typ:** SQL Injection / XSS / Auth Bypass / ...
- **Popis:** Čo je zlé a prečo
- **Dopad:** Čo útočník môže dosiahnuť
- **Fix:** Konkrétny kód alebo postup na opravu
- **Referencia:** OWASP / CWE / CVE

## Vysoké riziko (HIGH)
### [H-001] ...

## Stredné riziko (MEDIUM)
### [M-001] ...

## Nízke riziko (LOW)
### [L-001] ...

## Odporúčania pre Hardening
1. ...
2. ...

## Pozitívne nálezy
- Čo je správne implementované
```

### Severity klasifikácia

| Severity | Kritériá | Príklady |
|----------|----------|----------|
| **CRITICAL** | Okamžité ohrozenie, remote exploitation | SQL injection, auth bypass, RCE, leaked secrets |
| **HIGH** | Vážne ohrozenie, vyžaduje interakciu | Stored XSS, IDOR, missing auth on sensitive routes |
| **MEDIUM** | Potenciálne ohrozenie | Reflected XSS, weak session config, missing headers |
| **LOW** | Nízke riziko, defense-in-depth | Info leaks, missing rate limits, verbose errors |

## Pravidlá pre agenta

1. **Čítaj KAŽDÝ súbor** — neskáč, nepredpokladaj. Otvor a prečítaj.
2. **Myslí ako útočník** — pri každom endpointe sa pýtaj "čo ak pošlem niečo nečakané?"
3. **Zero trust na user input** — každý vstup od používateľa je nepriateľský kým nie je validovaný
4. **Reportuj s kontextom** — ukáž konkrétny kód, číslo riadku, a presný fix
5. **Nepredpokladaj najlepší prípad** — ak niečo MÔŽE byť zraniteľné, reportuj to
6. **Sleduj data flow** — sleduj cestu dát od vstupu cez spracovanie po výstup
7. **Nebuď false positive mašina** — reportuj len skutočné riziká, nie teoretické
8. **Prioritizuj** — CRITICAL pred HIGH pred MEDIUM pred LOW
9. **Daj actionable fixy** — nie len "toto je zlé", ale "oprav takto: [kód]"
10. **Kontroluj aj to čo CHÝBA** — chýbajúci rate limiting je rovnako závažný ako bug
