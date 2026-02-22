import { permissions, hasAccess } from "@/app/config/permission";
import { auth } from "./auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { defaultLocale, isLocale, locales } from "./src/i18n/routing";

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
  // 1. Priority: User's saved locale from database
  const userLocale = req.auth?.user?.locale;
  if (isLocale(userLocale)) return userLocale;

  // 2. Check geolocation (Vercel Edge - Slovakia or Czech Republic → SK, otherwise EN)
  const country = (req as unknown as NextRequestWithGeo).geo?.country;
  if (country) {
    if (country === "SK" || country === "CZ") {
      return "sk";
    }
    // Any other country → English
    return "en";
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

export default auth((req) => {
  const { nextUrl } = req;

  // Skip middleware for Stripe webhook
  if (nextUrl.pathname.includes("/api/stripe/webhook")) {
    return NextResponse.next();
  }

  const { locale: localeInPath } = stripLocaleFromPathname(nextUrl.pathname);
  if (!localeInPath) {
    const preferred = negotiateLocale(req);
    const url = nextUrl.clone();
    url.pathname = `/${preferred}${nextUrl.pathname}`;
    return NextResponse.redirect(url);
  }

  const intlResponse = intlMiddleware(req);

  const { pathname: pathnameWithoutLocale } = stripLocaleFromPathname(
    nextUrl.pathname,
  );
  const locale = localeInPath;

  const isLoggedIn = !!req.auth?.user;

  // Get user role (membership)
  const userRole = req.auth?.user?.membership ?? "";

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

  // Check admin access specifically
  if (
    pathnameWithoutLocale.startsWith("/admin") &&
    !hasAccess(pathnameWithoutLocale, userRole)
  ) {
    return NextResponse.redirect(new URL(`/${locale}/not-authorized`, nextUrl));
  }

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, nextUrl));
  }

  // If user is logged in and accessing root path, redirect to dashboard
  if (isLoggedIn && pathnameWithoutLocale === "/") {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, nextUrl));
  }

  return intlResponse;
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|site.webmanifest|logo/.*).*)",
  ],
};
