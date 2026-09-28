import { and, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/index";
import {
  ingredientAliases,
  ingredientNames,
  ingredients,
  recipeIngredients,
} from "@/db/schema";
import {
  normalizeLookupValue,
  overlayUserIngredients,
  resolvePantryIngredientIdentity,
  type UserIngredientAliasIndex,
  type IngredientAliasIndex,
  type IngredientAliasRow,
  type ResolvedPantryIngredientIdentity,
} from "./ingredient-resolution-core";
import type { IngredientGraph } from "@/lib/ingredients/ingredient-matching";

export * from "./ingredient-resolution-core";
export type { IngredientGraph } from "@/lib/ingredients/ingredient-matching";

const CACHE_TTL_MS = 60_000;

const parentIngredients = alias(ingredients, "parent_ingredients");

interface CachedValue<T> {
  value: T;
  expiresAt: number;
}

const aliasIndexCache = new Map<string, CachedValue<IngredientAliasIndex>>();
const ingredientGraphCache = new Map<string, CachedValue<IngredientGraph>>();

export function invalidateIngredientAliasIndexCache(locale?: string): void {
  invalidateCache(aliasIndexCache, locale);
  invalidateCache(ingredientGraphCache, locale);
}

function invalidateCache<T>(
  cache: Map<string, CachedValue<T>>,
  locale?: string,
): void {
  if (locale) {
    cache.delete(locale);
    return;
  }

  cache.clear();
}

export async function loadIngredientAliasIndex(
  locale: string,
): Promise<IngredientAliasIndex> {
  const cached = aliasIndexCache.get(locale);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const [ingredientRows, nameRows, aliasRows, recipeLinkRows] =
    await Promise.all([
      db
        .select({
          id: ingredients.id,
          key: ingredients.key,
          canonicalName: ingredients.canonicalName,
          parentId: ingredients.parentId,
        })
        .from(ingredients)
        .where(
          and(
            isNull(ingredients.ownerUserId),
            ne(ingredients.reviewState, "flagged"),
          ),
        ),
      db
        .select({
          ingredientId: ingredientNames.ingredientId,
          locale: ingredientNames.locale,
          name: ingredientNames.name,
        })
        .from(ingredientNames),
      db
        .select({
          ingredientId: ingredientAliases.ingredientId,
          locale: ingredientAliases.locale,
          alias: ingredientAliases.alias,
        })
        .from(ingredientAliases)
        .where(isNull(ingredientAliases.ownerUserId)),
      db
        .select({
          ingredientId: recipeIngredients.ingredientId,
          recipeId: recipeIngredients.recipeId,
        })
        .from(recipeIngredients)
        .where(isNotNull(recipeIngredients.ingredientId)),
    ]);

  const keyById = new Map(ingredientRows.map((row) => [row.id, row.key]));
  const canonicalById = new Map(
    ingredientRows.map((row) => [row.id, row.canonicalName]),
  );

  const validKeys = new Set(ingredientRows.map((row) => row.key));

  const familyKeyByKey = new Map<string, string>();
  for (const row of ingredientRows) {
    const parentKey = row.parentId ? keyById.get(row.parentId) : null;
    familyKeyByKey.set(row.key, parentKey ?? row.key);
  }

  const preferredNamesByKey = new Map<string, string>();
  for (const row of nameRows) {
    const key = keyById.get(row.ingredientId);
    if (!key) {
      continue;
    }

    if (row.locale === "en" && !preferredNamesByKey.has(key)) {
      preferredNamesByKey.set(key, row.name);
    }
    if (row.locale === locale) {
      preferredNamesByKey.set(key, row.name);
    }
  }

  const recipeIdsByKey = new Map<string, Set<string>>();
  for (const row of recipeLinkRows) {
    const key = row.ingredientId ? keyById.get(row.ingredientId) : null;
    if (!key) {
      continue;
    }

    const recipeIds = recipeIdsByKey.get(key) ?? new Set<string>();
    recipeIds.add(row.recipeId);
    recipeIdsByKey.set(key, recipeIds);
  }

  const recipeCountByKey = new Map<string, number>();
  for (const [key, recipeIds] of recipeIdsByKey) {
    recipeCountByKey.set(key, recipeIds.size);
  }

  const byAlias = new Map<string, IngredientAliasRow[]>();
  for (const row of aliasRows) {
    const key = keyById.get(row.ingredientId);
    if (!key) {
      continue;
    }

    const alias = normalizeLookupValue(row.alias);
    if (!alias) {
      continue;
    }

    const existing = byAlias.get(alias) ?? [];
    existing.push({
      ingredientKey: key,
      locale: row.locale ?? "en",
      ingredientName: canonicalById.get(row.ingredientId) ?? null,
      displayName: row.alias,
    });
    byAlias.set(alias, existing);
  }

  const index: IngredientAliasIndex = {
    byAlias,
    validKeys,
    preferredNamesByKey,
    recipeCountByKey,
    familyKeyByKey,
  };

  aliasIndexCache.set(locale, {
    value: index,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return index;
}

// Global alias index overlaid with the user's own private ingredients and
// aliases (including aliases learned when a private item was merged into a
// global one). Not cached: the per-user rows are small and change often.
export async function loadUserIngredientAliasIndex(
  locale: string,
  userId: string,
): Promise<UserIngredientAliasIndex> {
  const [globalIndex, privateRows, privateAliasRows] = await Promise.all([
    loadIngredientAliasIndex(locale),
    db
      .select({
        id: ingredients.id,
        key: ingredients.key,
        canonicalName: ingredients.canonicalName,
        parentKey: parentIngredients.key,
      })
      .from(ingredients)
      .leftJoin(parentIngredients, eq(parentIngredients.id, ingredients.parentId))
      .where(
        and(
          eq(ingredients.ownerUserId, userId),
          ne(ingredients.reviewState, "flagged"),
        ),
      ),
    db
      .select({
        locale: ingredientAliases.locale,
        alias: ingredientAliases.alias,
        key: ingredients.key,
        canonicalName: ingredients.canonicalName,
      })
      .from(ingredientAliases)
      .innerJoin(ingredients, eq(ingredients.id, ingredientAliases.ingredientId))
      .where(
        and(
          eq(ingredientAliases.ownerUserId, userId),
          ne(ingredients.reviewState, "flagged"),
        ),
      ),
  ]);

  const privateIds = privateRows.map((row) => row.id);
  const privateNameRows =
    privateIds.length > 0
      ? await db
          .select({
            ingredientId: ingredientNames.ingredientId,
            locale: ingredientNames.locale,
            name: ingredientNames.name,
          })
          .from(ingredientNames)
          .where(inArray(ingredientNames.ingredientId, privateIds))
      : [];

  return overlayUserIngredients(globalIndex, {
    locale,
    privateRows,
    privateNameRows,
    privateAliasRows,
  });
}

export async function loadIngredientGraph(
  locale = "en",
): Promise<IngredientGraph> {
  const cached = ingredientGraphCache.get(locale);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // Private (user-owned) ingredients are part of the graph so a classified
  // user item can match recipes through its parent family. Only global
  // ingredients are addressable by key, since private keys are per-user.
  const ingredientRows = await db
    .select({
      id: ingredients.id,
      key: ingredients.key,
      parentId: ingredients.parentId,
      ownerUserId: ingredients.ownerUserId,
    })
    .from(ingredients)
    .where(ne(ingredients.reviewState, "flagged"));

  const parentById = new Map<string, string | null>();
  const keyById = new Map<string, string>();
  const idByKey = new Map<string, string>();

  for (const row of ingredientRows) {
    parentById.set(row.id, row.parentId ?? null);
    keyById.set(row.id, row.key);
    if (!row.ownerUserId) {
      idByKey.set(row.key, row.id);
    }
  }

  const graph: IngredientGraph = { parentById, keyById, idByKey };

  ingredientGraphCache.set(locale, {
    value: graph,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return graph;
}

export async function loadIngredientNameMap(
  ingredientIds: string[],
): Promise<Map<string, Map<string, string>>> {
  const map = new Map<string, Map<string, string>>();
  if (ingredientIds.length === 0) {
    return map;
  }

  const uniqueIds = [...new Set(ingredientIds)];
  const rows = await db
    .select({
      ingredientId: ingredientNames.ingredientId,
      locale: ingredientNames.locale,
      name: ingredientNames.name,
    })
    .from(ingredientNames)
    .where(inArray(ingredientNames.ingredientId, uniqueIds));

  for (const row of rows) {
    const localeMap = map.get(row.ingredientId) ?? new Map<string, string>();
    localeMap.set(row.locale, row.name);
    map.set(row.ingredientId, localeMap);
  }

  return map;
}

export async function resolveIngredientIdByKeys(
  ingredientKey: string | null | undefined,
  ingredientSpecificKey: string | null | undefined,
  graph?: IngredientGraph | null,
): Promise<string | null> {
  const key = ingredientSpecificKey ?? ingredientKey;
  if (!key) {
    return null;
  }

  const resolvedGraph = graph ?? (await loadIngredientGraph("en"));
  return resolvedGraph.idByKey.get(key) ?? null;
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
