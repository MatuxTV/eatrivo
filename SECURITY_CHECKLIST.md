#  Eatrivo - Security Checklist Pre Produkciu

##  VyrieöenÈ BezpeËnostnÈ ProblÈmy

### 1. **VAPID Keys Protection** (KRITICK… - OPRAVEN…)
-  **Pred:** Private VAPID key bol hardcoded v kÛde s fallback hodnotou
-  **Po:** Private key sa ËÌta iba z \process.env.VAPID_PRIVATE_KEY\ (required)
-  Public key mÙûe byù v kÛde (nie je citliv˝) ale pouûit˝ cez env var
-  **AKCIA:** Vygeneruj novÈ VAPID keys pre produkciu: \
px web-push generate-vapid-keys\

### 2. **Environment Variables**
-  \.env*\ s˙bory s˙ v \.gitignore\
-  \.env.example\ obsahuje template bez citliv˝ch ˙dajov
-  Vöetky API keys sa ËÌtaj˙ z environment variables
-  **AKCIA:** Skontroluj ûe production environment m· vöetky required vars

### 3. **Authentication & Authorization**
-  NextAuth.js implementovanÈ s Google OAuth
-  Session management cez DrizzleAdapter
-  \	rustHost: true\ pre production deployment
-  Admin/Trainer role checks v API routes
-  Permission system implementovan˝ (\@/app/config/permission\)

### 4. **API Routes Protection**
-  Push notifications - admin/trainer only
-  User management - admin/trainer only  
-  Shopping list creation - admin/trainer only
-  Profile updates - vlastnÌk ˙Ëtu only
-  Auth check na zaËiatku kaûdÈho protected endpointu

### 5. **Database Security**
-  Drizzle ORM pouûÌva parameterized queries (SQL injection protection)
-  Database URL v environment variable
-  SSL mode enabled pre production (Neon/Supabase)
-  Proper indexing na user queries

### 6. **Input Validation**
-  Type checking na API route inputs
-  Required fields validation
-  Boolean type check pre PWA preferences
-  **AKCIA:** Pridaj zod schema validation pre komplexnejöie inputy

### 7. **Error Handling**
-  Generic error messages pre clienta (neprezr·dzaj˙ internal details)
-  Detailed logging na serveri (apiLogger)
-  Try-catch blocks v API routes
-  Proper HTTP status codes (401, 403, 400, 500)

### 8. **PWA Security**
-  Service Worker iba v production (\disable: dev mode\)
-  HTTPS required pre service workers (Vercel/production)
-  Push subscription validation
-  User-specific push subscriptions

##  PotrebnÈ Akcie Pre Produkciu

### 1. Environment Variables (CRITICAL)
Nastav v production environment (Vercel/in˝ hosting):

\\\ash
# Authentication
AUTH_SECRET="<generate: openssl rand -base64 32>"
AUTH_GOOGLE_ID="<production OAuth client ID>"
AUTH_GOOGLE_SECRET="<production OAuth client secret>"

# Database
DATABASE_URL="<production PostgreSQL URL>"

# AI
GOOGLE_API_KEY="<production API key s rate limitmi>"

# Redis Cache
UPSTASH_REDIS_REST_URL="<production Redis URL>"
UPSTASH_REDIS_REST_TOKEN="<production Redis token>"

# Email
RESEND_API_KEY="<production Resend key>"
RESEND_FROM_EMAIL="noreply@eatrivo.com"

# PWA
VAPID_PRIVATE_KEY="<generate new: npx web-push generate-vapid-keys>"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<public key from generation>"
ADMIN_EMAIL="admin@eatrivo.com"

# App
NEXTAUTH_URL="https://eatrivo.com"
NEXT_PUBLIC_APP_URL="https://eatrivo.com"
NODE_ENV="production"
\\\

### 2. OAuth Configuration
-  Google Cloud Console - pridaj production callback URL
  - \https://eatrivo.com/api/auth/callback/google\
-  Overiù OAuth consent screen pre produkciu

### 3. Database Migrations
\\\ash
# Spusù migrations na production DB
npx drizzle-kit push
\\\

### 4. Security Headers (ODPOR⁄»AN…)
Pridaj do \
ext.config.ts\:
\\\	ypescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
      ]
    }
  ];
}
\\\

### 5. Rate Limiting (ODPOR⁄»AN…)
Implementuj pre API routes pomocou Upstash Redis:
\\\	ypescript
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});
\\\

### 6. Monitoring & Logging
-  Nastav error tracking (Sentry/podobnÈ)
-  Monitor API usage a performance
-  Alert na failed authentication attempts

##  PravidelnÈ Kontroly

### T˝ûdenne
- [ ] Skontroluj error logs
- [ ] Monitor nezvyËajn˙ aktivitu (API calls, failed logins)

### MesaËne
- [ ] Update dependencies (\
pm audit\)
- [ ] Review user permissions
- [ ] Backup database

### Kvart·lne
- [ ] Security audit
- [ ] Update OAuth credentials rotation
- [ ] Review API rate limits

##  Deployment Checklist

Pred nasadenÌm na produkciu:

- [ ] Vöetky environment variables nastavenÈ
- [ ] \NODE_ENV=production\
- [ ] Database migrations spustenÈ
- [ ] OAuth callbacks configured
- [ ] SSL certificate aktÌvny (HTTPS)
- [ ] Service Worker testovan˝ v production build
- [ ] Push notifications testovanÈ
- [ ] Error tracking configured
- [ ] Backup strategy v mieste
- [ ] Domain configured (\NEXTAUTH_URL\, \NEXT_PUBLIC_APP_URL\)

##  Known Issues / Limitations

1. **Redis Cache** - Voliteæn˝, ale odpor˙Ëan˝ pre AI rate limiting
2. **Email Service** - Resend API potrebn˝ pre email notifik·cie
3. **HTTPS Required** - Service Workers nefunguj˙ bez SSL

##  Resources

- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [NextAuth.js Best Practices](https://next-auth.js.org/configuration/options)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)

---
**Last Updated:** 2026-01-22
**Status:** Ready for production with environment setup
