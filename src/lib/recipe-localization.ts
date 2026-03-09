export interface RecipeTranslationRecord {
  locale: string;
  name: string;
  categoryLabel: string | null;
  servingUnitLabel: string | null;
  instructions?: unknown;
}

export interface IngredientTranslationRecord {
  locale: string;
  displayName: string;
  ingredientName: string | null;
}

const DEFAULT_RECIPE_LOCALE = "en";

export function normalizeRecipeLocale(locale?: string | null): string {
  if (!locale) {
    return DEFAULT_RECIPE_LOCALE;
  }

  return locale.toLowerCase().split("-")[0] || DEFAULT_RECIPE_LOCALE;
}

function buildFallbackLocales(
  requestedLocale: string,
  defaultLocale: string,
  availableLocales: string[],
): string[] {
  const candidates = [
    normalizeRecipeLocale(requestedLocale),
    normalizeRecipeLocale(defaultLocale),
    DEFAULT_RECIPE_LOCALE,
  ];

  for (const locale of availableLocales) {
    candidates.push(normalizeRecipeLocale(locale));
  }

  return [...new Set(candidates)];
}

export function resolveRecipeTranslation(
  translations: Map<string, RecipeTranslationRecord> | undefined,
  requestedLocale: string,
  defaultLocale: string,
): RecipeTranslationRecord | null {
  if (!translations || translations.size === 0) {
    return null;
  }

  for (const locale of buildFallbackLocales(
    requestedLocale,
    defaultLocale,
    [...translations.keys()],
  )) {
    const translation = translations.get(locale);
    if (translation) {
      return translation;
    }
  }

  return translations.values().next().value ?? null;
}

export function resolveIngredientTranslation(
  translations: Map<string, IngredientTranslationRecord> | undefined,
  requestedLocale: string,
  defaultLocale: string,
): IngredientTranslationRecord | null {
  if (!translations || translations.size === 0) {
    return null;
  }

  for (const locale of buildFallbackLocales(
    requestedLocale,
    defaultLocale,
    [...translations.keys()],
  )) {
    const translation = translations.get(locale);
    if (translation) {
      return translation;
    }
  }

  return translations.values().next().value ?? null;
}