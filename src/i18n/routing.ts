export const locales = ["sk", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "sk";

/** Cookie name used to persist the user's locale preference across requests. */
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

/** Request header used by middleware to pass resolved locale to app-shell routes. */
export const LOCALE_HEADER_NAME = "x-eatrivo-locale";

/** Max-age for the locale cookie — 1 year in seconds. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * App shell routes that are served WITHOUT a locale segment in the URL.
 * Locale for these routes comes from cookie/session/geo, not URL.
 * Public/legal pages still use /{locale}/... for SEO.
 */
export const APP_SHELL_ROUTES = [
  "/home",
  "/dashboard",
  "/profile",
  "/pantry",
  "/chat-with-rivo",
  "/kitchen-counter",
  "/admin",
  "/signout",
] as const;

/** Check if a pathname (without locale prefix) matches an app shell route. */
export function isAppShellRoute(pathnameWithoutLocale: string): boolean {
  return APP_SHELL_ROUTES.some(
    (route) =>
      pathnameWithoutLocale === route ||
      pathnameWithoutLocale.startsWith(`${route}/`),
  );
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function getLocaleFromPathname(pathname: string): Locale {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : defaultLocale;
}

export function replaceLocaleInPathname(pathname: string, nextLocale: Locale): string {
  const segments = pathname.split("/");
  const current = segments[1];

  if (isLocale(current)) {
    segments[1] = nextLocale;
    return segments.join("/") || `/${nextLocale}`;
  }

  return `/${nextLocale}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
}
