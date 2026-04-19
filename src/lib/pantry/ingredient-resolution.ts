import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/index";
import {
  recipeIngredients,
  recipeIngredientTranslations,
} from "@/db/schema";
import {
  buildIngredientIdentity,
  normalizeIngredientName,
} from "@/lib/ingredients/ingredients";
import {
  buildIngredientAliasForms,
  deriveIngredientFamilyKey,
} from "@/lib/ingredients/ingredient-family";

export interface IngredientAliasRow {
  ingredientKey: string;
  locale: string;
  ingredientName: string | null;
  displayName: string;
}

export interface IngredientAliasIndex {
  byAlias: Map<string, IngredientAliasRow[]>;
  validKeys: Set<string>;
  preferredNamesByKey: Map<string, string>;
}

export interface ResolvedPantryIngredientIdentity {
  ingredientName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  source:
    | "translation-exact"
    | "translation-ai-disambiguated"
    | "ai-suggested"
    | "fallback";
  candidateKeys: string[];
}

function resolveValidatedSpecificKey(
  candidateKeys: string[],
  validKeys: Set<string>,
  aiSuggestedSpecificKey?: string | null,
  aiSuggestedKey?: string | null,
  fallbackKey?: string | null,
): string | null {
  const normalizedAiSpecificKey = aiSuggestedSpecificKey?.trim() || null;
  const normalizedAiKey = aiSuggestedKey?.trim() || null;
  const normalizedFallbackKey = fallbackKey?.trim() || null;

  if (candidateKeys.length === 1) {
    return candidateKeys[0];
  }

  for (const candidate of [
    normalizedAiSpecificKey,
    normalizedAiKey,
    normalizedFallbackKey,
  ]) {
    if (!candidate) {
      continue;
    }

    if (candidateKeys.includes(candidate) || validKeys.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveValidatedBroadKey(
  specificKey: string | null,
  validKeys: Set<string>,
  aiSuggestedKey?: string | null,
): string | null {
  const normalizedAiKey = aiSuggestedKey?.trim() || null;
  const derivedFamilyKey = specificKey
    ? deriveIngredientFamilyKey(specificKey, validKeys)
    : null;

  if (
    normalizedAiKey &&
    validKeys.has(normalizedAiKey) &&
    (!specificKey || normalizedAiKey === specificKey || normalizedAiKey === derivedFamilyKey)
  ) {
    return normalizedAiKey;
  }

  if (derivedFamilyKey) {
    return derivedFamilyKey;
  }

  if (specificKey && validKeys.has(specificKey)) {
    return specificKey;
  }

  if (normalizedAiKey && validKeys.has(normalizedAiKey)) {
    return normalizedAiKey;
  }

  return null;
}

function normalizeLookupValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const SLOVAK_IRREGULAR_TOKEN_MAP: Record<string, string> = {
  paradajky: "paradajka",
  fazulky: "fazuľka",
  vajcia: "vajce",
  zemiaky: "zemiak",
  jablka: "jablko",
  cestoviny: "cestovina",
  spagety: "spageta",
  rezance: "rezanec",
};

const GENERIC_PREFIX_TOKENS = new Set([
  "cestoviny",
  "cestovina",
  "ryza",
  "maso",
]);

function singularizeSlovakToken(token: string): string {
  const irregular = SLOVAK_IRREGULAR_TOKEN_MAP[token];
  if (irregular) {
    return normalizeLookupValue(irregular);
  }

  if (token.endsWith("ky") && token.length > 4) {
    return `${token.slice(0, -1)}a`;
  }

  if (token.endsWith("y") && token.length > 4) {
    return token.slice(0, -1);
  }

  return token;
}

function singularizeSlovakAdjective(token: string): string {
  if (token.endsWith("e") && token.length > 3) {
    return `${token.slice(0, -1)}a`;
  }

  return token;
}

function expandLookupVariants(value: string): string[] {
  const normalized = normalizeLookupValue(value);
  if (!normalized) {
    return [];
  }

  const variants = new Set<string>([normalized]);
  const tokens = normalized.split(" ").filter(Boolean);

  if (tokens.length > 1 && GENERIC_PREFIX_TOKENS.has(tokens[0])) {
    variants.add(tokens.slice(1).join(" "));
  }

  const singularTokens = tokens.map((token) => singularizeSlovakToken(token));
  variants.add(singularTokens.join(" "));

  if (tokens.length > 1) {
    const adjectiveAndNounVariant = [...tokens];
    adjectiveAndNounVariant[0] = singularizeSlovakAdjective(
      adjectiveAndNounVariant[0],
    );
    adjectiveAndNounVariant[adjectiveAndNounVariant.length - 1] =
      singularizeSlovakToken(
        adjectiveAndNounVariant[adjectiveAndNounVariant.length - 1],
      );
    variants.add(adjectiveAndNounVariant.join(" "));

    if (GENERIC_PREFIX_TOKENS.has(singularTokens[0])) {
      variants.add(singularTokens.slice(1).join(" "));
    }
  }

  return [...variants].filter(Boolean);
}

function buildLookupCandidates(rawName: string): string[] {
  const candidates = new Set<string>();
  for (const normalizedRaw of expandLookupVariants(rawName)) {
    candidates.add(normalizedRaw);
    for (const aliasForm of buildIngredientAliasForms(normalizedRaw)) {
      candidates.add(normalizeLookupValue(aliasForm));
    }
  }

  const normalizedIngredientName = normalizeIngredientName(rawName);
  if (normalizedIngredientName) {
    for (const normalizedCandidate of expandLookupVariants(
      normalizedIngredientName,
    )) {
      candidates.add(normalizedCandidate);
      for (const aliasForm of buildIngredientAliasForms(normalizedCandidate)) {
        candidates.add(normalizeLookupValue(aliasForm));
      }
    }
  }

  return [...candidates];
}

export async function loadIngredientAliasIndex(
  locale: string,
): Promise<IngredientAliasIndex> {
  const locales = [...new Set([locale, "en"])];

  const rows = await db
    .select({
      ingredientKey: recipeIngredients.ingredientKey,
      locale: recipeIngredientTranslations.locale,
      ingredientName: recipeIngredients.canonicalName,
      displayName: recipeIngredientTranslations.displayName,
    })
    .from(recipeIngredientTranslations)
    .innerJoin(
      recipeIngredients,
      eq(
        recipeIngredientTranslations.recipeIngredientId,
        recipeIngredients.id,
      ),
    )
    .where(
      and(
        inArray(recipeIngredientTranslations.locale, locales),
        isNotNull(recipeIngredients.ingredientKey),
      ),
    );

  const byAlias = new Map<string, IngredientAliasRow[]>();
  const validKeys = new Set<string>();
  const preferredNamesByKey = new Map<string, string>();

  for (const row of rows) {
    if (!row.ingredientKey) {
      continue;
    }

    validKeys.add(row.ingredientKey);

    const aliasCandidates = new Set<string>();
    if (row.ingredientName) {
      aliasCandidates.add(normalizeLookupValue(row.ingredientName));
      for (const aliasForm of buildIngredientAliasForms(row.ingredientName)) {
        aliasCandidates.add(normalizeLookupValue(aliasForm));
      }
    }

    const normalizedDisplayAlias = normalizeIngredientName(row.displayName);
    if (normalizedDisplayAlias) {
      aliasCandidates.add(normalizeLookupValue(normalizedDisplayAlias));
      for (const aliasForm of buildIngredientAliasForms(normalizedDisplayAlias)) {
        aliasCandidates.add(normalizeLookupValue(aliasForm));
      }
    }

    for (const aliasForm of buildIngredientAliasForms(row.ingredientKey)) {
      aliasCandidates.add(normalizeLookupValue(aliasForm));
    }

    if (row.locale === locale && row.ingredientName) {
      preferredNamesByKey.set(
        row.ingredientKey,
        normalizeIngredientName(row.ingredientName) ?? row.ingredientName,
      );
    }

    for (const alias of aliasCandidates) {
      if (!alias) {
        continue;
      }

      const existingRows = byAlias.get(alias) ?? [];
      existingRows.push({
        ingredientKey: row.ingredientKey,
        locale: row.locale,
        ingredientName: row.ingredientName,
        displayName: row.displayName,
      });
      byAlias.set(alias, existingRows);
    }
  }

  return {
    byAlias,
    validKeys,
    preferredNamesByKey,
  };
}

function getUniqueCandidateKeys(
  aliasIndex: IngredientAliasIndex,
  candidates: string[],
): string[] {
  const keys = new Set<string>();

  for (const candidate of candidates) {
    const rows = aliasIndex.byAlias.get(candidate) ?? [];
    for (const row of rows) {
      keys.add(row.ingredientKey);
    }
  }

  return [...keys];
}

export function getAliasCandidateKeysForName(
  rawName: string,
  aliasIndex: IngredientAliasIndex,
): string[] {
  const lookupCandidates = buildLookupCandidates(rawName);
  return getUniqueCandidateKeys(aliasIndex, lookupCandidates);
}

export function resolvePantryIngredientIdentity(
  rawName: string,
  _locale: string,
  aliasIndex: IngredientAliasIndex,
  aiSuggestedSpecificKey?: string | null,
  aiSuggestedKey?: string | null,
): ResolvedPantryIngredientIdentity {
  const fallbackIdentity = buildIngredientIdentity(rawName);
  const lookupCandidates = buildLookupCandidates(rawName);
  const candidateKeys = getUniqueCandidateKeys(aliasIndex, lookupCandidates);
  const specificKey = resolveValidatedSpecificKey(
    candidateKeys,
    aliasIndex.validKeys,
    aiSuggestedSpecificKey,
    aiSuggestedKey,
    fallbackIdentity.ingredientKey,
  );
  const broadKey = resolveValidatedBroadKey(
    specificKey,
    aliasIndex.validKeys,
    aiSuggestedKey,
  );

  if (candidateKeys.length === 1 && specificKey) {
    return {
      ingredientName:
        aliasIndex.preferredNamesByKey.get(specificKey) ??
        fallbackIdentity.ingredientName,
      ingredientKey: broadKey,
      ingredientSpecificKey: specificKey,
      source: "translation-exact",
      candidateKeys,
    };
  }

  if (specificKey && candidateKeys.includes(specificKey)) {
    return {
      ingredientName:
        aliasIndex.preferredNamesByKey.get(specificKey) ??
        fallbackIdentity.ingredientName,
      ingredientKey: broadKey,
      ingredientSpecificKey: specificKey,
      source: "translation-ai-disambiguated",
      candidateKeys,
    };
  }

  if (specificKey || broadKey) {
    return {
      ingredientName:
        aliasIndex.preferredNamesByKey.get(specificKey ?? broadKey ?? "") ??
        fallbackIdentity.ingredientName,
      ingredientKey: broadKey,
      ingredientSpecificKey: specificKey,
      source: "ai-suggested",
      candidateKeys,
    };
  }

  return {
    ingredientName: fallbackIdentity.ingredientName,
    ingredientKey: null,
    ingredientSpecificKey: null,
    source: "fallback",
    candidateKeys,
  };
}

export async function resolveStoredPantryIngredientIdentity(
  rawName: string,
  locale: string,
  aiSuggestedSpecificKey?: string | null,
  aiSuggestedKey?: string | null,
): Promise<ResolvedPantryIngredientIdentity> {
  const aliasIndex = await loadIngredientAliasIndex(locale);

  return resolvePantryIngredientIdentity(
    rawName,
    locale,
    aliasIndex,
    aiSuggestedSpecificKey,
    aiSuggestedKey,
  );
}
