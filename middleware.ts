import { permissions, hasAdminRole } from "@/app/config/permission";
import { auth } from "./auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  defaultLocale,
  isLocale,
  locales,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  isAppShellRoute,
} from "./src/i18n/routing";

// Extend NextRequest type for Vercel Edge geo property
interface NextRequestWithGeo extends NextRequest {
  geo?: {
    city?: string;
    country?: string;
    region?: string;
    latitude?: string;
    longitude?: string;
  };
}

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
});

function getLocaleFromPathname(pathname: string) {
  const [, maybeLocale] = pathname.split("/");
  return isLocale(maybeLocale) ? maybeLocale : null;
}

function stripLocaleFromPathname(pathname: string) {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return { locale: null, pathname };

  const rest = pathname.replace(new RegExp(`^/${locale}`), "");
  return { locale, pathname: rest.length > 0 ? rest : "/" };
}

function negotiateLocale(req: Parameters<Parameters<typeof auth>[0]>[0]) {
  // 0. Highest priority: explicit locale cookie (set by LanguageSwitcher)
  const cookieLocale = req.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  // 1. Priority: User's saved locale from database
  const userLocale = req.auth?.user?.locale;
  if (isLocale(userLocale)) return userLocale;

  // 2. Check geolocation (Vercel Edge - Slovakia or Czech Republic → SK, otherwise EN)
  const country = (req as unknown as NextRequestWithGeo).geo?.country;
  if (country) {
    if (!(country === "SK" || country === "CZ")) {
      return "en";
    }
    // Slovakia or Czech Republic → Slovak
    return "sk";
  }

  // 3. Fallback to browser Accept-Language header (for local dev or non-Vercel)
  const acceptLanguage = req.headers.get("accept-language");
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.trim()?.toLowerCase();
    const primaryTag = primary?.split("-")[0]; // "sk-SK" → "sk"
    if (primaryTag === "sk" || primaryTag === "cs") {
      return "sk";
    }
    if (isLocale(primaryTag)) {
      return primaryTag;
    }
  }

  // 4. Final fallback to Slovak
  return "sk";
}

function buildLocaleHeaders(requestHeaders: Headers, locale: string) {
  const nextHeaders = new Headers(requestHeaders);
  nextHeaders.set(LOCALE_HEADER_NAME, locale);
  return nextHeaders;
}

export default auth((req) => {
  const { nextUrl } = req;

  // Skip middleware for Stripe webhook
  if (nextUrl.pathname.includes("/api/stripe/webhook")) {
    return NextResponse.next();
  }

  const localeInPath = getLocaleFromPathname(nextUrl.pathname);
  const preferred = negotiateLocale(req);

  // --- ROUTE CLASSIFICATION ---

  if (localeInPath) {
    // URL has a locale segment, e.g. /sk/home or /en/pricing
    const { pathname: bare } = stripLocaleFromPathname(nextUrl.pathname);

    // If this is an app shell route under /{locale}/..., redirect to canonical route
    if (isAppShellRoute(bare)) {
      const url = nextUrl.clone();
      url.pathname = bare;
      // Preserve query string
      const response = NextResponse.redirect(url);
      response.cookies.set(LOCALE_COOKIE_NAME, localeInPath, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      return response;
    }

    // Public/legal route with locale — handle with intlMiddleware
    // But first, if cookie locale differs, redirect to correct locale
    if (isLocale(preferred) && preferred !== localeInPath) {
      const cookieLocale = req.cookies.get(LOCALE_COOKIE_NAME)?.value;
      // Only redirect if there's an explicit cookie preference (not just negotiated)
      if (isLocale(cookieLocale) && cookieLocale !== localeInPath) {
        const url = nextUrl.clone();
        url.pathname = `/${cookieLocale}${bare}`;
        return NextResponse.redirect(url);
      }
    }

    return handleAuthAndIntl(req, localeInPath, bare);
  }

  // No locale in path
  const pathname = nextUrl.pathname;

  if (isAppShellRoute(pathname)) {
    // Canonical app shell route — no locale prefix needed
    const response = NextResponse.next({
      request: {
        headers: buildLocaleHeaders(req.headers, preferred),
      },
    });
    response.cookies.set(LOCALE_COOKIE_NAME, preferred, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    // Auth checks for app shell routes
    const isLoggedIn = !!req.auth?.user;
    const protectedRoute = Object.keys(permissions).some((route) =>
      new RegExp(`^/${route}(/|$)`).test(pathname),
    );

    if (!isLoggedIn && protectedRoute) {
      return NextResponse.redirect(
        new URL(`/${preferred}/signin`, nextUrl),
      );
    }

    if (
      pathname.startsWith("/admin") &&
      !hasAdminRole(req.auth?.user?.role)
    ) {
      return NextResponse.redirect(
        new URL(`/${preferred}/not-authorized`, nextUrl),
      );
    }

    return response;
  }

  // Non-locale, non-app-shell route — must be a public route missing its locale
  // Redirect to /{locale}/...
  const url = nextUrl.clone();
  url.pathname = `/${preferred}${pathname}`;
  return NextResponse.redirect(url);
});

/**
 * Handle auth checks + intlMiddleware for locale-prefixed public routes.
 */
function handleAuthAndIntl(
  req: Parameters<Parameters<typeof auth>[0]>[0],
  locale: string,
  pathnameWithoutLocale: string,
) {
  const { nextUrl } = req;

  const intlResponse = intlMiddleware(req);

  const isLoggedIn = !!req.auth?.user;

  // Protect all routes defined in permissions config
  const protectedRoute = Object.keys(permissions).some((route) =>
    new RegExp(`^/${route}(/|$)`).test(pathnameWithoutLocale),
  );

  // Auth routes that logged-in users shouldn't access
  const authRoutes = ["/signin"];
  const isAuthRoute = authRoutes.includes(pathnameWithoutLocale);

  // If route is protected and user is not logged in
  if (!isLoggedIn && protectedRoute) {
    return NextResponse.redirect(new URL(`/${locale}/signin`, nextUrl));
  }

  // Check admin access
  if (
    pathnameWithoutLocale.startsWith("/admin") &&
    !hasAdminRole(req.auth?.user?.role)
  ) {
    return NextResponse.redirect(
      new URL(`/${locale}/not-authorized`, nextUrl),
    );
  }

  // If user is logged in and trying to access auth routes, redirect to app home
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  // If user is logged in and accessing locale root, redirect to app home
  if (isLoggedIn && pathnameWithoutLocale === "/") {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!api/stripe/webhook|api|_next/static|_next/image|images|rivo|favicon.ico|manifest.json|site.webmanifest|logo/.*|sw\\.js|workbox-.*\\.js|custom-sw\\.js).*)",
  ],
};
