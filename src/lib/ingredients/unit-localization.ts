const UNIT_LABELS_BY_LOCALE: Record<string, Record<string, string>> = {
  en: {
    tbsp: "tbsp",
    tsp: "tsp",
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "l",
    dl: "dl",
    cup: "cup",
    bal: "pack",
    pc: "pc",
    ks: "pc",
  },
  sk: {
    tbsp: "pl",
    tsp: "kl",
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "l",
    dl: "dl",
    cup: "cup",
    bal: "bal",
    pc: "ks",
    ks: "ks",
  },
  cs: {
    tbsp: "lž",
    tsp: "lžč",
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "l",
    dl: "dl",
    cup: "hrnek",
    bal: "bal",
    pc: "ks",
    ks: "ks",
  },
  de: {
    tbsp: "EL",
    tsp: "TL",
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "l",
    dl: "dl",
    cup: "Tasse",
    bal: "Packung",
    pc: "Stk",
    ks: "Stk",
  },
  hu: {
    tbsp: "ek",
    tsp: "kk",
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "l",
    dl: "dl",
    cup: "csesze",
    bal: "csomag",
    pc: "db",
    ks: "db",
  },
};

function normalizeLocale(locale?: string | null): string {
  return locale?.toLowerCase().split("-")[0] || "en";
}

export function localizeUnitLabel(
  unit: string | null | undefined,
  locale?: string | null,
): string | null {
  const normalizedUnit = unit?.trim();
  if (!normalizedUnit) {
    return null;
  }

  const normalizedLocale = normalizeLocale(locale);
  const labels = UNIT_LABELS_BY_LOCALE[normalizedLocale] ?? UNIT_LABELS_BY_LOCALE.en;

  return labels[normalizedUnit] ?? normalizedUnit;
}