import { permissions, hasAccess } from "@/app/config/permission";
import { auth } from "./auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";

import { defaultLocale, isLocale, locales } from "./src/i18n/routing";

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
  const userLocale = req.auth?.user?.locale;
  if (isLocale(userLocale)) return userLocale;

  const acceptLanguage = req.headers.get("accept-language");
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.trim()?.toLowerCase();
    const primaryTag = primary?.split("-")[0];
    if (isLocale(primaryTag)) return primaryTag;
  }

  return defaultLocale;
}

export default auth((req) => {
  const { nextUrl } = req;

  const { locale: localeInPath } = stripLocaleFromPathname(nextUrl.pathname);
  if (!localeInPath) {
    const preferred = negotiateLocale(req);
    const url = nextUrl.clone();
    url.pathname = `/${preferred}${nextUrl.pathname}`;
    return NextResponse.redirect(url);
  }

  const intlResponse = intlMiddleware(req);

  const { pathname: pathnameWithoutLocale } = stripLocaleFromPathname(nextUrl.pathname);
  const locale = localeInPath;

  const isLoggedIn = !!req.auth?.user;

  // Get user role (membership)
  const userRole = req.auth?.user?.membership ?? "";

  // Protect all routes defined in permissions config
  const protectedRoute = Object.keys(permissions).some((route) =>
    new RegExp(`^/${route}(/|$)`).test(pathnameWithoutLocale)
  );

  // Auth routes that logged-in users shouldn't access
  const authRoutes = ["/signin"];
  const isAuthRoute = authRoutes.includes(pathnameWithoutLocale);

  // If route is protected and user is not logged in
  if (!isLoggedIn && protectedRoute) {
    return NextResponse.redirect(new URL(`/${locale}/signin`, nextUrl));
  }

  // Check admin access specifically
  if (pathnameWithoutLocale.startsWith("/admin") && !hasAccess(pathnameWithoutLocale, userRole)) {
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
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}