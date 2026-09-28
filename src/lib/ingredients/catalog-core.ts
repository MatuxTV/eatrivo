import {
  buildIngredientAliasForms,
  deriveIngredientFamilyKey,
} from "@/lib/ingredients/ingredient-family";
import { normalizeLookupValue } from "@/lib/pantry/ingredient-resolution-core";

export interface CatalogIngredientInput {
  specificKey: string | null;
  familyKey: string | null;
  canonicalName: string | null;
  names: { locale: string; name: string }[];
}

export interface CatalogEntry extends CatalogIngredientInput {
  key: string;
}

export interface CatalogNameRow {
  ingredientId: string;
  locale: string;
  name: string;
}

export interface CatalogAliasRow {
  ingredientId: string;
  locale: string | null;
  alias: string;
  source: "recipe";
}

export function titleizeKey(key: string): string {
  return key.replace(/-/g, " ");
}

// Entries keyed by their most specific key, plus every key (specific and
// family) that must exist in the catalog.
export function planCatalogEntries(inputs: CatalogIngredientInput[]): {
  entries: CatalogEntry[];
  allKeys: Set<string>;
} {
  const entries = inputs
    .map((input) => ({ ...input, key: input.specificKey ?? input.familyKey }))
    .filter((entry): entry is CatalogEntry => Boolean(entry.key));

  const allKeys = new Set<string>();
  for (const entry of entries) {
    allKeys.add(entry.key);
    if (entry.familyKey) {
      allKeys.add(entry.familyKey);
    }
  }

  return { entries, allKeys };
}

// Canonical name for a new catalog ingredient: the recipe's canonical name,
// else its English display name, else the humanized key.
export function resolveCatalogCanonicalName(
  key: string,
  entries: CatalogEntry[],
): string {
  for (const entry of entries) {
    if (entry.key !== key) {
      continue;
    }
    const englishName = entry.names.find((name) => name.locale === "en")?.name;
    const canonical = entry.canonicalName ?? englishName;
    if (canonical) {
      return canonical;
    }
  }

  return titleizeKey(key);
}

// Parent links for ingredients created in this run only — existing hierarchy
// is curated and left untouched. The recipe's family key wins; otherwise the
// family is derived from the key against the known keys.
export function planCatalogParentLinks(
  entries: CatalogEntry[],
  createdKeys: Set<string>,
  idByKey: Map<string, string>,
): Map<string, string> {
  const knownKeys = new Set(idByKey.keys());
  const parentByKey = new Map<string, string>();

  for (const entry of entries) {
    if (!createdKeys.has(entry.key) || parentByKey.has(entry.key)) {
      continue;
    }

    const parentKey =
      entry.familyKey && entry.familyKey !== entry.key
        ? entry.familyKey
        : deriveIngredientFamilyKey(entry.key, knownKeys);
    const parentId =
      parentKey && parentKey !== entry.key ? idByKey.get(parentKey) : null;
    if (parentId) {
      parentByKey.set(entry.key, parentId);
    }
  }

  return parentByKey;
}

// Per-locale names and global aliases (key forms + every display name and its
// alias forms), deduplicated by locale + alias.
export function buildCatalogNameAndAliasRows(
  entries: CatalogEntry[],
  idByKey: Map<string, string>,
): { nameRows: CatalogNameRow[]; aliasRows: CatalogAliasRow[] } {
  const nameRows: CatalogNameRow[] = [];
  const aliasRows: CatalogAliasRow[] = [];
  const seenAliases = new Set<string>();

  const pushAlias = (ingredientId: string, locale: string | null, raw: string) => {
    const alias = normalizeLookupValue(raw);
    const dedupeKey = `${locale ?? "*"}:${alias}`;
    if (!alias || seenAliases.has(dedupeKey)) {
      return;
    }
    seenAliases.add(dedupeKey);
    aliasRows.push({ ingredientId, locale, alias, source: "recipe" });
  };

  for (const entry of entries) {
    const ingredientId = idByKey.get(entry.key);
    if (!ingredientId) {
      continue;
    }

    for (const form of buildIngredientAliasForms(entry.key)) {
      pushAlias(ingredientId, null, form);
    }

    for (const { locale, name } of entry.names) {
      const trimmed = name.trim();
      if (!trimmed) {
        continue;
      }
      nameRows.push({ ingredientId, locale, name: trimmed });
      pushAlias(ingredientId, locale, trimmed);
      for (const form of buildIngredientAliasForms(trimmed)) {
        pushAlias(ingredientId, locale, form);
      }
    }
  }

  return { nameRows, aliasRows };
}
