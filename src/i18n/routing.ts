export const locales = ["sk", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "sk";

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
