# Next.js Specific Security Patterns

## Table of Contents
1. App Router Security
2. Server Components vs Client Components
3. Middleware Security
4. next.config Hardening
5. Image & File Upload Security
6. Caching Security
7. ISR/SSG Security
8. Third-Party Script Security
9. Security Headers Template

---

## 1. App Router Security

### Layout & Template Security

```bash
# Nájdi všetky layouts
find . -name "layout.tsx" -o -name "layout.ts" | grep -v node_modules

# Nájdi všetky templates
find . -name "template.tsx" -o -name "template.ts" | grep -v node_modules
```

**KONTROLA:**
- Root layout (`app/layout.tsx`) obsahuje security meta tagy?
- Auth guard v layoute chráni všetky child routes?
- Layout neleakuje data medzi rôznymi users (caching issue)?

### Route Groups & Parallel Routes

```bash
# Route groups (s parenthézami)
find . -type d -name "(*)"|grep -v node_modules
ls -la app/\(*\)/ 2>/dev/null
```

**RIZIKO:** Route groups môžu mať rôzne layouts — skontroluj, že auth guard je na správnom mieste.

### Loading & Error Boundaries

```bash
find . -name "loading.tsx" -o -name "error.tsx" -o -name "not-found.tsx" | grep -v node_modules
```

**KONTROLA:**
- Error boundaries neleakujú stack traces
- Error page nezobrazuje citlivé informácie
- Loading stavy neleakujú dáta (skeleton by nemal ukazovať reálnu štruktúru citlivých dát)

---

## 2. Server Components vs Client Components

### Boundary audit

```bash
# Všetky client components
grep -rln '"use client"' --include="*.tsx" --include="*.ts" | grep -v node_modules

# Server-only enforcement
grep -rn "server-only\|import.*server-only" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**KRITICKÁ KONTROLA:** Citlivé utility funkcie by mali importovať `server-only`:

```typescript
// lib/db.ts
import 'server-only'; // ✅ Build zlyhá ak sa importuje v client component

import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient();
```

```typescript
// lib/auth.ts
import 'server-only'; // ✅

export async function getUser() {
  // ... server-only logic
}
```

### Data serialization

**KONTROLA:** Props predávané z server → client components sú serializované a viditeľné v RSC payloade.

```bash
# Hľadaj server components, ktoré predávajú veľké objekty klientovi
grep -rn "import.*'use client'\|from.*Client" --include="*.tsx" | grep -v node_modules
```

Skontroluj, že sa neprenášajú:
- Databázové objekty s citlivými poľami
- Tokeny, heslá, API kľúče
- Interné systémové informácie

---

## 3. Middleware Security

### Matcher audit

```bash
cat middleware.ts 2>/dev/null || cat src/middleware.ts 2>/dev/null
```

**KONTROLA:**
```typescript
// ❌ Príliš špecifický matcher — nové routes nie sú chránené
export const config = {
  matcher: ['/dashboard', '/settings', '/admin']
};

// ✅ Whitelist approach — chráň všetko, povoľ len verejné
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)']
};
```

### Middleware logic

**KONTROLY:**
- Middleware NEvaliduje JWT/session samo — len kontroluje prítomnosť
- Skutočná validácia je na server-side (v route handleroch)
- Middleware nemá race conditions pri concurrent requests
- Middleware správne handluje Edge Runtime limitations

### Response manipulation

```typescript
// ❌ Pridávanie auth info do headers v middleware (spoofable)
const response = NextResponse.next();
response.headers.set('x-user-id', userId);

// ✅ Ak musíš, radšej použi cookies (httpOnly, signed)
```

---

## 4. next.config Hardening

```bash
cat next.config.js 2>/dev/null || cat next.config.mjs 2>/dev/null || cat next.config.ts 2>/dev/null
```

**Odporúčaná konfigurácia:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Skry Next.js identifikáciu
  poweredByHeader: false,

  // ✅ Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Sprísni podľa potreby
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
        ],
      },
    ];
  },

  // ✅ Image optimization — reštrikcie
  images: {
    remotePatterns: [
      // Len konkrétne domény, NIE wildcards
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
      },
      // ❌ NIE toto:
      // { hostname: '**' } alebo { hostname: '*' }
    ],
  },

  // ✅ Redirecty — bez open redirects
  async redirects() {
    return [
      // Len interné redirecty
    ];
  },

  // ✅ Rewrites — pozor na SSRF
  async rewrites() {
    return [
      // Len na dôveryhodné backendy
    ];
  },

  // ❌ Nebezpečné experimental features
  // experimental: {
  //   serverActions: { allowedOrigins: ['*'] }, // ❌ nikdy *
  // },
};
```

**RED FLAGS v next.config:**
- `images.remotePatterns` s `**` wildcard
- `experimental.serverActions.allowedOrigins: ['*']`
- Rewrites na externé URL (SSRF riziko)
- Chýbajúce security headers
- `poweredByHeader: true` (default)

---

## 5. Image & File Upload Security

```bash
# Nájdi upload handlery
grep -rn "upload\|formData\|multipart\|blob\|File\|Buffer" --include="*.ts" | grep -v node_modules | grep -i "api\|route\|action"
```

**Validačný checklist:**

```typescript
// ✅ Kompletná upload validácia
async function validateUpload(file: File) {
  // 1. MIME type check (ale nespoliehaj sa len na to — spoofable)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  // 2. Magic bytes check (skutočný typ súboru)
  const buffer = await file.arrayBuffer();
  const header = new Uint8Array(buffer.slice(0, 4));
  // JPEG: FF D8 FF
  // PNG: 89 50 4E 47
  // Implementuj podľa povolených typov

  // 3. Size limit
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    throw new Error('File too large');
  }

  // 4. Filename sanitization
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.');

  // 5. Nový unikátny názov (nie originálny)
  const newName = `${crypto.randomUUID()}.${safeName.split('.').pop()}`;

  return { buffer, name: newName };
}
```

**RED FLAGS:**
- Upload bez size limitu
- Originálny filename použitý v path (path traversal)
- Upload do public/ priečinku (priame prezeranie)
- SVG upload bez sanitizácie (XSS)
- Executable súbory (.js, .php, .sh) nie sú blokované

---

## 6. Caching Security

### Cache poisoning

```bash
# Kontrola revalidate/cache nastavení
grep -rn "revalidate\|cache.*force\|unstable_cache\|cacheLife\|cacheTag" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**KONTROLA:**
- Cached stránky neobsahujú user-specific dáta
- API routes s citlivými dátami majú `cache: 'no-store'`
- Ak sa cachuje, Cache-Control headers sú správne

**ZRANITEĽNÉ:**
```typescript
// ❌ Cached stránka s user-specific dátami
// app/profile/page.tsx
export const revalidate = 3600; // Cache 1 hodinu

export default async function Profile() {
  const user = await getUser(); // ← Toto bude cachovane pre VŠETKÝCH
  return <div>{user.email}</div>;
}
```

---

## 7. ISR/SSG Security

**KONTROLA:**
- Static stránky vygenerované s citlivými dátami sú servované všetkým
- `generateStaticParams` nemá injection vulnerability
- Revalidation endpointy sú chránené tokenom

```bash
# Revalidation routes
grep -rn "revalidatePath\|revalidateTag" --include="*.ts" | grep -v node_modules

# On-demand revalidation API
find . -path "*/api/revalidate*" | grep -v node_modules
```

---

## 8. Third-Party Script Security

```bash
# next/script usage
grep -rn "next/script\|Script" --include="*.tsx" | grep -v node_modules

# External script loading
grep -rn "<script\|src=.*\.js" --include="*.tsx" --include="*.html" | grep -v node_modules
```

**KONTROLA:**
- Third-party scripty majú `integrity` atribút (SRI)?
- Strategy je správna (`afterInteractive` je default, `beforeInteractive` len ak nutné)?
- Scripty sú z dôveryhodných zdrojov?

---

## 9. Security Headers Template

Kompletná sada pre produkciu:

```typescript
// middleware.ts alebo next.config.js headers()
const securityHeaders = [
  // Prevent MIME type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },

  // Disable XSS filter (modern browsers, CSP is better)
  { key: 'X-XSS-Protection', value: '0' },

  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // HTTPS enforcement
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },

  // Feature restrictions
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },

  // Content Security Policy (PRISPÔSOB podľa aplikácie)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self'",                    // Sprísni: odstráň unsafe-inline/eval
      "style-src 'self' 'unsafe-inline'",     // Next.js vyžaduje unsafe-inline pre CSS
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.example.com",
      "media-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')
  },

  // Prevent DNS prefetching
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];
```

**CSP pre Next.js je tricky** kvôli inline scriptom, ktoré Next.js generuje.
Pre strict CSP použi `nonce`:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'unsafe-inline';
  `.replace(/\n/g, '');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}
```
