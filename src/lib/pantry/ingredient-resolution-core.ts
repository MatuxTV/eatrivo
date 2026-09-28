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
  recipeCountByKey: Map<string, number>;
  // Family key from the catalog's parent_id (a root ingredient maps to
  // itself). Authoritative over families guessed from a key's wording.
  familyKeyByKey?: Map<string, string>;
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

function pickHighestValueCandidate(
  candidateKeys: string[],
  recipeCountByKey: Map<string, number>,
): string | null {
  let best: string | null = null;
  let bestCount = -1;

  for (const key of [...candidateKeys].sort()) {
    const count = recipeCountByKey.get(key) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = key;
    }
  }

  return best;
}

function resolveValidatedSpecificKey(
  candidateKeys: string[],
  validKeys: Set<string>,
  aiSuggestedSpecificKey?: string | null,
  aiSuggestedKey?: string | null,
  fallbackKey?: string | null,
  recipeCountByKey: Map<string, number> = new Map(),
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

  return pickHighestValueCandidate(candidateKeys, recipeCountByKey);
}

function resolveValidatedBroadKey(
  specificKey: string | null,
  aliasIndex: IngredientAliasIndex,
  aiSuggestedKey?: string | null,
): string | null {
  const storedFamilyKey = specificKey
    ? aliasIndex.familyKeyByKey?.get(specificKey)
    : undefined;
  if (storedFamilyKey) {
    return storedFamilyKey;
  }

  const { validKeys } = aliasIndex;
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

export function normalizeLookupValue(value: string): string {
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
    aliasIndex.recipeCountByKey,
  );
  const broadKey = resolveValidatedBroadKey(
    specificKey,
    aliasIndex,
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

// Normalized lookup aliases for a set of names: each name plus its alias
// forms, deduplicated, empty values dropped.
export function buildNormalizedAliases(names: string[]): string[] {
  const aliases = new Set<string>();
  for (const name of names) {
    aliases.add(normalizeLookupValue(name));
    for (const form of buildIngredientAliasForms(name)) {
      aliases.add(normalizeLookupValue(form));
    }
  }

  return [...aliases].filter(Boolean);
}

export interface PrivateIngredientRow {
  id: string;
  key: string;
  canonicalName: string | null;
  // Key of the (global) family set by classification, if any.
  parentKey?: string | null;
}

export interface PrivateIngredientNameRow {
  ingredientId: string;
  locale: string;
  name: string;
}

export interface PrivateIngredientAliasRow {
  locale: string | null;
  alias: string;
  // Key of the ingredient the alias points to: a private ingredient, or a
  // global one after a private ingredient was merged into it.
  key: string;
  canonicalName: string | null;
}

export interface UserIngredientAliasIndex {
  index: IngredientAliasIndex;
  // Private ingredient ids by key; global keys win over private ones.
  privateIdByKey: Map<string, string>;
}

// Overlays a user's private ingredients and aliases on the shared global
// index. Copy-on-write: the (cached) global index is never mutated.
export function overlayUserIngredients(
  globalIndex: IngredientAliasIndex,
  input: {
    locale: string;
    privateRows: PrivateIngredientRow[];
    privateNameRows: PrivateIngredientNameRow[];
    privateAliasRows: PrivateIngredientAliasRow[];
  },
): UserIngredientAliasIndex {
  const privateIdByKey = new Map<string, string>();
  if (input.privateRows.length === 0 && input.privateAliasRows.length === 0) {
    return { index: globalIndex, privateIdByKey };
  }

  const validKeys = new Set(globalIndex.validKeys);
  const preferredNamesByKey = new Map(globalIndex.preferredNamesByKey);
  const familyKeyByKey = new Map(globalIndex.familyKeyByKey ?? []);
  const byAlias = new Map(globalIndex.byAlias);

  for (const row of input.privateRows) {
    if (globalIndex.validKeys.has(row.key)) {
      continue;
    }
    validKeys.add(row.key);
    privateIdByKey.set(row.key, row.id);
    familyKeyByKey.set(row.key, row.parentKey ?? row.key);
    if (row.canonicalName) {
      preferredNamesByKey.set(row.key, row.canonicalName);
    }
  }

  const keyByPrivateId = new Map(
    input.privateRows.map((row) => [row.id, row.key]),
  );
  for (const row of input.privateNameRows) {
    const key = keyByPrivateId.get(row.ingredientId);
    if (key && privateIdByKey.has(key) && row.locale === input.locale) {
      preferredNamesByKey.set(key, row.name);
    }
  }

  for (const row of input.privateAliasRows) {
    const alias = normalizeLookupValue(row.alias);
    if (!alias) {
      continue;
    }

    const existing = [...(byAlias.get(alias) ?? [])];
    if (existing.some((entry) => entry.ingredientKey === row.key)) {
      continue;
    }
    existing.push({
      ingredientKey: row.key,
      locale: row.locale ?? input.locale,
      ingredientName: row.canonicalName ?? null,
      displayName: row.alias,
    });
    byAlias.set(alias, existing);
  }

  return {
    index: {
      byAlias,
      validKeys,
      preferredNamesByKey,
      recipeCountByKey: globalIndex.recipeCountByKey,
      familyKeyByKey,
    },
    privateIdByKey,
  };
}
