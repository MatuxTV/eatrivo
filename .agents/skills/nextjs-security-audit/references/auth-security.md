# Authentication & Authorization Security — Next.js

## Table of Contents
1. NextAuth / Auth.js Audit
2. Custom Auth Audit
3. Session Security
4. RBAC & Authorization
5. OAuth Security
6. Password Security
7. Multi-Factor Authentication

---

## 1. NextAuth / Auth.js Audit

### Konfiguračný audit

```bash
# Nájdi auth konfiguráciu
find . -path "*/auth*" -name "*.ts" | grep -v node_modules
find . -path "*nextauth*" | grep -v node_modules
```

**Kontrolné body:**

```typescript
// auth.ts alebo [...nextauth]/route.ts
export const authOptions = {
  // ✅ Secret MUSÍ byť z env premennej
  secret: process.env.NEXTAUTH_SECRET, // NIE hardcoded string

  session: {
    strategy: "jwt", // alebo "database"
    maxAge: 30 * 24 * 60 * 60, // 30 dní — zvážiť kratší
    // ⚠️ Ak je app citlivá, maxAge by mal byť 1-8 hodín
  },

  // ✅ Kontroluj callbacks
  callbacks: {
    // Redirect callback — ochrana pred open redirect
    redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl; // ✅ Default je bezpečný
    },

    // JWT callback — čo sa ukladá do tokenu?
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // ❌ NIKDY neukladaj: password, creditCard, SSN
      }
      return token;
    },

    // Session callback — čo je dostupné na klientovi?
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      // ❌ NIKDY nevystavuj: interné ID systémov, admin flags bez potreby
      return session;
    }
  },

  // ✅ Pages — custom error pages by nemali leakovať info
  pages: {
    signIn: '/login',
    error: '/auth/error', // Kontroluj čo error page zobrazuje
  }
};
```

### NEXTAUTH_SECRET kontrola

```bash
# Skontroluj že existuje a je silný
grep "NEXTAUTH_SECRET" .env* 2>/dev/null
# Minimum: 32 znakov, náhodný string
# Generovanie: openssl rand -base64 32
```

**Red flags:**
- `NEXTAUTH_SECRET=secret` alebo iný jednoduchý string
- NEXTAUTH_SECRET chýba (NextAuth v4 funguje aj bez neho v dev!)
- Rovnaký secret v dev a production

---

## 2. Custom Auth Audit

Ak projekt používa custom auth (nie NextAuth):

### Password hashing

```bash
grep -rn "bcrypt\|argon2\|scrypt\|pbkdf2\|hash\|crypto" --include="*.ts" | grep -v node_modules
```

**KONTROLA:**
- Používa sa bcrypt/argon2/scrypt? (NIE MD5, SHA1, SHA256 samotné)
- Cost factor pre bcrypt: minimum 10, odporúčané 12+
- Ak argon2: memory cost ≥ 64MB, time cost ≥ 3

**RED FLAGS:**
```typescript
// ❌ NIKDY
crypto.createHash('md5').update(password).digest('hex');
crypto.createHash('sha256').update(password).digest('hex');

// ❌ Chýbajúci salt
bcrypt.hashSync(password); // toto je ok, bcrypt generuje salt automaticky

// ✅ Správne
await bcrypt.hash(password, 12);
await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 });
```

### Token generation

```bash
grep -rn "randomBytes\|randomUUID\|uuid\|nanoid\|crypto\.random" --include="*.ts" | grep -v node_modules
```

**KONTROLA:**
- Tokeny sú generované cez `crypto.randomBytes()` alebo `crypto.randomUUID()`
- NIE cez `Math.random()` (nie je kryptograficky bezpečný)

---

## 3. Session Security

### Cookie konfigurácia

```bash
grep -rn "cookie\|Cookie\|setCookie\|set-cookie" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**Požadované cookie atribúty pre session:**
```typescript
{
  httpOnly: true,    // ✅ Nemôže byť čítaný JavaScriptom (ochrana pred XSS)
  secure: true,      // ✅ Len cez HTTPS
  sameSite: 'lax',   // ✅ Ochrana pred CSRF (alebo 'strict')
  path: '/',
  maxAge: 60 * 60 * 8, // 8 hodín — závisí od citlivosti
  // domain: nenastavuj ak nie je nutné (default je aktuálna doména)
}
```

**RED FLAGS:**
- `httpOnly: false` — XSS môže ukradnúť session
- `secure: false` — session ide cez HTTP plain text
- `sameSite: 'none'` bez dobrého dôvodu — CSRF riziko
- Session token v localStorage alebo sessionStorage
- Session token v URL parametri

### Session invalidácia

**KONTROLA:**
- Existuje logout endpoint, ktorý invaliduje session na serveri?
- Pri zmene hesla sa invalidujú všetky existujúce sessions?
- Session timeout je implementovaný?

---

## 4. RBAC & Authorization

### Route-level authorization

```bash
# Nájdi všetky chránené routes
grep -rn "role\|isAdmin\|permission\|authorize\|canAccess\|guard" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**KONTROLA pre KAŽDÚ page a API route:**

| Route | Vyžaduje auth? | Vyžaduje rolu? | Implementované? |
|-------|----------------|----------------|-----------------|
| `/dashboard` | ✅ | user | ? |
| `/admin` | ✅ | admin | ? |
| `/api/users` | ✅ | admin | ? |
| `/api/user/[id]` | ✅ | owner/admin | ? |

### IDOR (Insecure Direct Object Reference)

```bash
# Hľadaj endpointy kde sa berie ID z URL/body
grep -rn "params\.\(id\|userId\|postId\|orderId\)" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**Pre každý nález kontroluj:**
- Overuje sa, že prihlásený user má prístup k danému objektu?
- Nestačí len auth check — treba aj ownership/permission check

**ZRANITEĽNÉ:**
```typescript
// GET /api/orders/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  // ❌ Len auth, nie authz — user A vidí objednávky user B
  const order = await db.order.findUnique({ where: { id: params.id } });
  return Response.json(order);
}
```

**BEZPEČNÉ:**
```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  // ✅ Kontrola vlastníctva
  const order = await db.order.findFirst({
    where: {
      id: params.id,
      userId: session.user.id // ← toto je kľúčové
    }
  });

  if (!order) return new Response("Not found", { status: 404 });
  return Response.json(order);
}
```

---

## 5. OAuth Security

### OAuth provider konfigurácia

```bash
grep -rn "GoogleProvider\|GitHubProvider\|CredentialsProvider\|OAuthProvider" --include="*.ts" | grep -v node_modules
```

**KONTROLA:**
- Client ID a Secret sú z env premenných (nie hardcoded)
- Callback URL je presne špecifikovaná
- Scope je minimálny (len čo je potrebné)
- State parameter je používaný (CSRF ochrana) — NextAuth to robí automaticky

### OAuth account linking

**RIZIKO:** Ak app automaticky linkuje OAuth accounts s rovnakým emailom, útočník si môže
vytvoriť OAuth account s cudzím emailom a získať prístup k účtu.

**KONTROLA:**
- Je email z OAuth providera overený (`email_verified: true`)?
- Je auto-linking vypnutý alebo vyžaduje verifikáciu?

---

## 6. Password Security

### Password policy

```bash
grep -rn "password\|Password" --include="*.ts" --include="*.tsx" | grep -i "min\|max\|length\|validate\|regex\|pattern" | grep -v node_modules
```

**Minimálne požiadavky:**
- Minimum 8 znakov (odporúčané 12+)
- Nie check na zložitosť (uppercase/number/special) — NIST to neodporúča
- Check proti breached password databases (haveibeenpwned API)
- Maximum 128 znakov (pre DoS ochranu pri hashovaní)

### Brute force ochrana

```bash
grep -rn "attempt\|lockout\|rateLimit\|rate.limit\|throttle\|maxAttempt" --include="*.ts" | grep -v node_modules
```

**KONTROLA:**
- Rate limiting na login endpoint
- Account lockout po N neúspešných pokusoch
- Progresívne spomalenie (exponential backoff)
- CAPTCHA po N pokusoch

### Timing attacks

**KONTROLA:** Login by mal trvať rovnako dlho bez ohľadu na to, či user existuje:
```typescript
// ❌ Rýchla odpoveď ak user neexistuje → attacker vie že user neexistuje
if (!user) return { error: "Invalid credentials" };
if (!await bcrypt.compare(password, user.hash)) return { error: "Invalid credentials" };

// ✅ Vždy urob hash comparison (aj s dummy hash)
const DUMMY_HASH = await bcrypt.hash("dummy", 12); // precomputed

const hash = user?.passwordHash || DUMMY_HASH;
const valid = await bcrypt.compare(password, hash);

if (!user || !valid) return { error: "Invalid credentials" };
```

---

## 7. Multi-Factor Authentication

Ak je MFA implementované:

```bash
grep -rn "totp\|2fa\|mfa\|authenticator\|otpauth\|speakeasy\|otplib" --include="*.ts" | grep -v node_modules
```

**KONTROLA:**
- TOTP secret je šifrovaný v databáze
- Recovery codes sú hashované (nie plaintext)
- MFA sa nedá obísť cez API (všetky auth endpointy vyžadujú MFA ak je aktívne)
- MFA setup vyžaduje aktuálne heslo
- Rate limiting na MFA kód verifikáciu (max 5 pokusov)
