# Critical Vulnerabilities — Next.js Specific Patterns

## Table of Contents
1. Server Actions Vulnerabilities
2. API Route Injection
3. Authentication Bypass
4. Environment Variable Leaks
5. Server Component Data Exposure
6. Middleware Bypass
7. Open Redirects

---

## 1. Server Actions Vulnerabilities

Server Actions sú POST endpointy — každá action je de facto API endpoint prístupný komukoľvek.

### 1.1 Chýbajúca autentifikácia

**ZRANITEĽNÉ:**
```typescript
// actions/delete-user.ts
"use server"

export async function deleteUser(userId: string) {
  // ❌ ŽIADNA auth kontrola — ktokoľvek môže zmazať kohokoľvek
  await db.user.delete({ where: { id: userId } });
}
```

**BEZPEČNÉ:**
```typescript
"use server"

import { auth } from "@/lib/auth"

export async function deleteUser(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // ✅ Kontrola vlastníctva (nie len auth, ale aj authz)
  if (session.user.id !== userId && session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  await db.user.delete({ where: { id: userId } });
}
```

### 1.2 Chýbajúca input validácia

**ZRANITEĽNÉ:**
```typescript
"use server"

export async function updateProfile(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string; // ❌ Útočník môže pridať "role" field

  await db.user.update({
    where: { id: session.user.id },
    data: { name, email, role } // ❌ Mass assignment — útočník si nastaví admin role
  });
}
```

**BEZPEČNÉ:**
```typescript
"use server"

import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  // role NIE JE v schéme — nie je povolený
});

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Invalid input", details: parsed.error.flatten() };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: parsed.data // ✅ Len validované polia
  });
}
```

### 1.3 Server Action v inline client component

**RIZIKO:** Server Action definovaná inline v client component súbore s "use server" v tele funkcie
je stále serverová, ale je ťažšie auditovateľná a ľahšie sa v nej spraví chyba.

**ODPORÚČANIE:** Drž Server Actions v samostatných súboroch (`actions/*.ts`) s "use server" na vrchu.

---

## 2. API Route Injection

### 2.1 SQL Injection cez Prisma raw queries

**ZRANITEĽNÉ:**
```typescript
// app/api/search/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  // ❌ String interpolation v raw query
  const results = await prisma.$queryRaw`
    SELECT * FROM products WHERE name LIKE '%${query}%'
  `;

  return Response.json(results);
}
```

**BEZPEČNÉ:**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length > 100) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }

  // ✅ Prisma parametrized query
  const results = await prisma.$queryRaw`
    SELECT * FROM products WHERE name LIKE ${`%${query}%`}
  `;
  // ALEBO lepšie — použi Prisma client
  const results2 = await prisma.product.findMany({
    where: { name: { contains: query } }
  });

  return Response.json(results2);
}
```

### 2.2 NoSQL Injection (MongoDB)

**ZRANITEĽNÉ:**
```typescript
export async function POST(request: Request) {
  const { username, password } = await request.json();

  // ❌ Ak útočník pošle { "$gt": "" } ako password
  const user = await db.collection("users").findOne({
    username,
    password
  });
}
```

**BEZPEČNÉ:**
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) return Response.json({ error: "Invalid" }, { status: 400 });

  // ✅ Validovaný string, nie object
  const { username, password } = parsed.data;

  const user = await db.collection("users").findOne({
    username: String(username) // Extra safety
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
```

---

## 3. Authentication Bypass

### 3.1 Middleware matcher bypass

**ZRANITEĽNÉ:**
```typescript
// middleware.ts
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
  // ❌ /api/* nie je chránené
  // ❌ Čo /Dashboard (case sensitivity)?
};
```

**BEZPEČNÉ:**
```typescript
// middleware.ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ]
  // ✅ Chráň VŠETKO okrem statických assetov
};

export function middleware(request: NextRequest) {
  // Whitelist verejných routes
  const publicPaths = ['/login', '/register', '/api/public'];
  if (publicPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Všetko ostatné vyžaduje auth
  const token = request.cookies.get('session');
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

### 3.2 JWT bez proper validácie

**KONTROLY:**
- Je JWT podpísaný silným algoritmom (RS256, ES256)? Nie HS256 s krátkym secret.
- Je validovaný `exp` (expiration)?
- Je validovaný `iss` (issuer) a `aud` (audience)?
- Je secret dostatočne silný (min 32 znakov)?
- Nie je JWT uložený v localStorage (XSS riziko)?

### 3.3 Session fixation

**KONTROLY:**
- Generuje sa nový session ID po prihlásení?
- Sú session cookies nastavené s `httpOnly`, `secure`, `sameSite`?
- Je session invalidovaná po odhlásení (server-side)?

---

## 4. Environment Variable Leaks

### 4.1 NEXT_PUBLIC_ secret leak

**CRITICAL PATTERN:**
```bash
# Tieto by NIKDY nemali mať NEXT_PUBLIC_ prefix:
NEXT_PUBLIC_DATABASE_URL=...        # ❌❌❌
NEXT_PUBLIC_API_SECRET=...          # ❌❌❌
NEXT_PUBLIC_JWT_SECRET=...          # ❌❌❌
NEXT_PUBLIC_STRIPE_SECRET_KEY=...   # ❌❌❌
NEXT_PUBLIC_AWS_SECRET=...          # ❌❌❌

# Tieto sú OK s NEXT_PUBLIC_:
NEXT_PUBLIC_API_URL=...             # ✅ URL je verejná
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=...   # ✅ Publishable key
NEXT_PUBLIC_GA_TRACKING_ID=...     # ✅ Analytics ID
```

### 4.2 Server env prístupný v client bundle

**KONTROLA:**
```bash
# Hľadaj process.env.SECRET v client components
grep -rn "process\.env\." --include="*.tsx" --include="*.ts" | grep -v "NEXT_PUBLIC" | grep -v node_modules

# V súboroch s "use client" — process.env.NON_PUBLIC bude undefined, ale
# ak je v zdieľanom utility súbore, môže sa dostať do client bundlu
```

### 4.3 Hardcoded secrets

**PATTERN:** Hľadaj stringy, ktoré vyzerajú ako API kľúče, tokeny, heslá:
```bash
# API kľúče a tokeny priamo v kóde
grep -rn "sk_live_\|pk_live_\|sk_test_\|pk_test_" --include="*.ts" --include="*.tsx" | grep -v node_modules
grep -rn "Bearer [a-zA-Z0-9]" --include="*.ts" --include="*.tsx" | grep -v node_modules
grep -rn "ghp_\|gho_\|github_pat_" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

---

## 5. Server Component Data Exposure

### 5.1 Over-fetching v server components

**ZRANITEĽNÉ:**
```typescript
// app/profile/page.tsx (server component)
export default async function ProfilePage() {
  const user = await db.user.findUnique({
    where: { id: session.user.id }
  });

  // ❌ Celý user objekt vrátane passwordHash ide do HTML/RSC payload
  return <ClientProfile user={user} />;
}
```

**BEZPEČNÉ:**
```typescript
export default async function ProfilePage() {
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      // ✅ Explicitne vyber len potrebné polia
      // passwordHash NIE JE tu
    }
  });

  return <ClientProfile user={user} />;
}
```

### 5.2 RSC payload data leak

Server Components serializujú props do RSC payloadu, ktorý je viditeľný v network tabe.
Nikdy neprenášaj citlivé dáta cez props do client components.

**KONTROLA:** Pozri sa na network tab → filter na `__rsc` — aké dáta sa prenášajú?

---

## 6. Middleware Bypass

### 6.1 Next.js middleware limitations

- Middleware beží len na Edge Runtime — niektoré Node.js API nie sú dostupné
- Middleware sa dá obísť pri static generation (build time)
- `_next/data` requesty prechádzajú middleware inak než navigačné requesty

### 6.2 Header injection cez middleware

**KONTROLA:** Ak middleware pridáva auth info do headers:
```typescript
// ❌ Útočník môže podvrhnúť header v requeste
const userId = request.headers.get('x-user-id');
```

Vždy validuj headers na server-side, nikdy neverifikuj len cez middleware.

---

## 7. Open Redirects

### 7.1 V redirect logike

**ZRANITEĽNÉ:**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect");

  // ❌ Útočník: /api/login?redirect=https://evil.com
  return NextResponse.redirect(redirectTo!);
}
```

**BEZPEČNÉ:**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") || "/";

  // ✅ Validuj že redirect je interný
  const url = new URL(redirectTo, request.url);
  if (url.origin !== new URL(request.url).origin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(url);
}
```

### 7.2 V NextAuth/Auth.js callbacks

**KONTROLA:**
```typescript
// auth.ts
callbacks: {
  redirect: ({ url, baseUrl }) => {
    // ✅ Toto je default NextAuth behavior — je bezpečné
    if (url.startsWith(baseUrl)) return url;
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    return baseUrl;
  }
}
```

Skontroluj či nie je callback prepisaný na niečo nebezpečné.
