# Injection Patterns — Next.js Specific

## Table of Contents
1. XSS Patterns in React/Next.js
2. SQL/NoSQL Injection in API Routes
3. Path Traversal
4. Command Injection
5. SSRF (Server-Side Request Forgery)
6. Template Injection
7. Header Injection

---

## 1. XSS Patterns in React/Next.js

React automaticky escapuje výstup, ale existujú výnimky:

### 1.1 dangerouslySetInnerHTML

```bash
# Vyhľadaj všetky výskyty
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx" | grep -v node_modules
```

**Pre každý výskyt kontroluj:**
- Odkiaľ pochádza HTML string?
- Je sanitizovaný cez DOMPurify alebo podobnú knižnicu?
- Môže ho užívateľ ovplyvniť?

**ZRANITEĽNÉ:**
```tsx
// ❌ User-generated content bez sanitizácie
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```

**BEZPEČNÉ:**
```tsx
import DOMPurify from 'isomorphic-dompurify';

// ✅ Sanitizovaný HTML
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(post.content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'li', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}} />
```

### 1.2 href s javascript: protocol

**ZRANITEĽNÉ:**
```tsx
// ❌ Ak url je user-controlled
<a href={userProvidedUrl}>Link</a>
// Útočník: href="javascript:alert(document.cookie)"
```

**BEZPEČNÉ:**
```tsx
function SafeLink({ url, children }: { url: string; children: React.ReactNode }) {
  const safeUrl = useMemo(() => {
    try {
      const parsed = new URL(url);
      if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        return url;
      }
    } catch {}
    return '#';
  }, [url]);

  return <a href={safeUrl} rel="noopener noreferrer">{children}</a>;
}
```

### 1.3 Dynamic script/style injection

```bash
# Kontroluj dynamické vkladanie scriptov
grep -rn "createElement.*script\|innerHTML\|document\.write\|eval(" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

### 1.4 SVG XSS

```bash
# SVG môže obsahovať JavaScript
grep -rn "\.svg\|image/svg" --include="*.tsx" --include="*.jsx" | grep -v node_modules
```

Ak sa nahrávajú SVG od užívateľov, musia byť sanitizované (SVG môže obsahovať `<script>`, event handlers, `<foreignObject>`).

### 1.5 URL parameter reflection

```bash
# searchParams reflektované do stránky
grep -rn "searchParams" --include="*.tsx" --include="*.ts" | grep -v node_modules
```

V Next.js App Router sú `searchParams` automaticky escapované v JSX, ale pozor na:
- Použitie v `dangerouslySetInnerHTML`
- Použitie v `<meta>` tagoch
- Použitie v `<script>` tagoch
- Použitie v `href` atribútoch

---

## 2. SQL/NoSQL Injection

### 2.1 Prisma

**Bezpečné by default:** Štandardné Prisma queries sú parametrizované.

**Nebezpečné:** `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe`

```bash
grep -rn "\$queryRaw\|\$executeRaw\|\$queryRawUnsafe\|\$executeRawUnsafe" --include="*.ts" | grep -v node_modules
```

**UNSAFE varianty (`$queryRawUnsafe`, `$executeRawUnsafe`) sú VŽDY red flag** — musia mať manuálnu parametrizáciu.

### 2.2 Drizzle ORM

**Bezpečné:** Štandardné query builder metódy.
**Nebezpečné:** `sql.raw()`, `sql.unsafe()`

```bash
grep -rn "sql\.raw\|sql\.unsafe" --include="*.ts" | grep -v node_modules
```

### 2.3 Knex

```bash
grep -rn "knex\.raw\|\.whereRaw\|\.orderByRaw\|\.havingRaw" --include="*.ts" | grep -v node_modules
```

### 2.4 MongoDB / Mongoose

**PATTERN:** Object injection cez JSON body
```bash
# Hľadaj priame použitie req body v queries
grep -rn "findOne\|find(\|updateOne\|deleteOne\|aggregate" --include="*.ts" | grep -v node_modules
```

---

## 3. Path Traversal

### 3.1 File serving z dynamickej cesty

**ZRANITEĽNÉ:**
```typescript
// app/api/files/[...path]/route.ts
export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const filePath = path.join('/uploads', ...params.path);
  // ❌ Útočník: /api/files/../../etc/passwd
  const file = await fs.readFile(filePath);
  return new Response(file);
}
```

**BEZPEČNÉ:**
```typescript
export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const requestedPath = path.join(...params.path);

  // ✅ Normalizuj a over že je v povolenom adresári
  const safePath = path.normalize(path.join('/uploads', requestedPath));

  if (!safePath.startsWith('/uploads/')) {
    return new Response("Forbidden", { status: 403 });
  }

  // ✅ Ďalšia validácia
  if (requestedPath.includes('..') || requestedPath.includes('\0')) {
    return new Response("Invalid path", { status: 400 });
  }

  try {
    const file = await fs.readFile(safePath);
    return new Response(file);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
```

### 3.2 Dynamic imports

```bash
grep -rn "import(\|require(" --include="*.ts" --include="*.tsx" | grep -v "from " | grep -v node_modules
```

Ak path pre dynamic import pochádza z user inputu → Remote Code Execution.

---

## 4. Command Injection

```bash
grep -rn "exec\|execSync\|spawn\|spawnSync\|child_process\|execFile" --include="*.ts" --include="*.js" | grep -v node_modules
```

**ZRANITEĽNÉ:**
```typescript
import { exec } from 'child_process';

export async function POST(req: Request) {
  const { filename } = await req.json();
  // ❌ Útočník: filename = "; rm -rf /"
  exec(`convert ${filename} output.png`);
}
```

**BEZPEČNÉ:**
```typescript
import { execFile } from 'child_process';

export async function POST(req: Request) {
  const { filename } = await req.json();

  // ✅ Validuj filename
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    return Response.json({ error: "Invalid filename" }, { status: 400 });
  }

  // ✅ Použi execFile (neinterpretuje shell)
  execFile('convert', [filename, 'output.png']);
}
```

---

## 5. SSRF (Server-Side Request Forgery)

```bash
# Hľadaj server-side fetch s dynamickým URL
grep -rn "fetch(\|axios\.\|got(\|request(\|http\.get\|https\.get" --include="*.ts" | grep -v node_modules | grep -v "use client"
```

**ZRANITEĽNÉ:**
```typescript
// app/api/proxy/route.ts
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  // ❌ Útočník: url=http://169.254.169.254/latest/meta-data/ (AWS metadata)
  // ❌ Útočník: url=http://localhost:5432 (internal services)
  const response = await fetch(url!);
  return Response.json(await response.json());
}
```

**BEZPEČNÉ:**
```typescript
const ALLOWED_DOMAINS = ['api.example.com', 'cdn.example.com'];

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return Response.json({ error: "Missing URL" }, { status: 400 });

  try {
    const parsed = new URL(url);

    // ✅ Whitelist domén
    if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
      return Response.json({ error: "Domain not allowed" }, { status: 403 });
    }

    // ✅ Len HTTPS
    if (parsed.protocol !== 'https:') {
      return Response.json({ error: "HTTPS required" }, { status: 400 });
    }

    // ✅ Blokuj private IP ranges
    // (implementuj DNS resolution check pre úplnú ochranu)

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return Response.json(await response.json());
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }
}
```

---

## 6. Template Injection

V Next.js je to zriedkavé, ale kontroluj:

```bash
# Server-side template rendering
grep -rn "eval\|Function(\|new Function\|template.*literal" --include="*.ts" | grep -v node_modules
```

---

## 7. Header Injection

### 7.1 CRLF Injection

```bash
# Hľadaj dynamické nastavovanie headers
grep -rn "setHeader\|headers\.set\|headers\.append" --include="*.ts" | grep -v node_modules
```

**KONTROLA:** Ak hodnota headeru pochádza z user inputu, musí byť sanitizovaná (bez `\r\n`).

### 7.2 Host Header Injection

```bash
# Použitie Host headeru pre generovanie URL
grep -rn "request\.headers.*host\|req\.headers.*host\|x-forwarded-host" --include="*.ts" | grep -v node_modules
```

**RIZIKO:** Ak sa Host header používa pre generovanie password reset linkov, útočník môže poslať
request s falošným Host headerom a dostať reset link smerujúci na svoju doménu.
