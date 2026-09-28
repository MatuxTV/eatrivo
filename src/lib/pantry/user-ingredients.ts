import { and, eq, isNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/index";
import {
  ingredientAliases,
  ingredientNames,
  ingredients,
  pantryItems,
  pantryRestockItems,
  recipeIngredients,
  shoppingListItems,
} from "@/db/schema";
import { createIngredientKey, normalizeIngredientName } from "@/lib/ingredients/ingredients";
import { buildIngredientAliasForms } from "@/lib/ingredients/ingredient-family";
import {
  buildNormalizedAliases,
  normalizeLookupValue,
} from "@/lib/pantry/ingredient-resolution-core";
import { invalidateIngredientAliasIndexCache } from "@/lib/pantry/ingredient-resolution";

export interface EnsuredUserIngredient {
  id: string;
  key: string;
  canonicalName: string | null;
  created: boolean;
}

export async function findPrivateIngredient(
  userId: string,
  key: string,
): Promise<EnsuredUserIngredient | null> {
  const [row] = await db
    .select({
      id: ingredients.id,
      key: ingredients.key,
      canonicalName: ingredients.canonicalName,
    })
    .from(ingredients)
    .where(and(eq(ingredients.ownerUserId, userId), eq(ingredients.key, key)))
    .limit(1);

  return row ? { ...row, created: false } : null;
}

async function findGlobalIngredient(
  key: string,
): Promise<EnsuredUserIngredient | null> {
  const [row] = await db
    .select({
      id: ingredients.id,
      key: ingredients.key,
      canonicalName: ingredients.canonicalName,
    })
    .from(ingredients)
    .where(and(isNull(ingredients.ownerUserId), eq(ingredients.key, key)))
    .limit(1);

  return row ? { ...row, created: false } : null;
}

export async function ensureUserIngredient(input: {
  userId: string;
  locale: string;
  rawName: string;
}): Promise<EnsuredUserIngredient | null> {
  const normalizedName =
    normalizeIngredientName(input.rawName) ?? input.rawName.trim();
  const key = createIngredientKey(normalizedName);
  if (!key || !normalizedName) {
    return null;
  }

  const globalIngredient = await findGlobalIngredient(key);
  if (globalIngredient) {
    return globalIngredient;
  }

  const existing = await findPrivateIngredient(input.userId, key);
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(ingredients)
    .values({
      key,
      canonicalName: normalizedName,
      ownerUserId: input.userId,
      reviewState: "unverified",
      source: "user",
    })
    .onConflictDoNothing()
    .returning({
      id: ingredients.id,
      key: ingredients.key,
      canonicalName: ingredients.canonicalName,
    });

  const row = created ?? (await findPrivateIngredient(input.userId, key));
  if (!row) {
    return null;
  }

  await db
    .insert(ingredientNames)
    .values({
      ingredientId: row.id,
      locale: input.locale,
      name: normalizedName,
    })
    .onConflictDoNothing();

  const aliasSet = new Set<string>([
    normalizeLookupValue(normalizedName),
    ...buildIngredientAliasForms(normalizedName).map(normalizeLookupValue),
    ...buildIngredientAliasForms(key).map(normalizeLookupValue),
  ]);

  const aliasValues = [...aliasSet]
    .filter(Boolean)
    .map((alias) => ({
      ingredientId: row.id,
      locale: input.locale,
      alias,
      source: "user" as const,
      ownerUserId: input.userId,
    }));

  if (aliasValues.length > 0) {
    await db
      .insert(ingredientAliases)
      .values(aliasValues)
      .onConflictDoNothing();
  }

  invalidateIngredientAliasIndexCache();

  return { ...row, created: true };
}

export function buildUserAliasValues(input: {
  ingredientId: string;
  userId: string;
  locale: string;
  names: string[];
}) {
  return buildNormalizedAliases(input.names).map((alias) => ({
    ingredientId: input.ingredientId,
    locale: input.locale,
    alias,
    source: "user" as const,
    ownerUserId: input.userId,
  }));
}

// Re-keys stored rows that point at an ingredient so their denormalized
// text keys stay in sync with ingredient_id.
function rekeyReferencingRows(input: {
  fromIngredientId: string;
  toIngredientId: string;
  specificKey: string;
  familyKey: string;
}): BatchItem<"pg">[] {
  const values = {
    ingredientId: input.toIngredientId,
    ingredientKey: input.familyKey,
    ingredientSpecificKey: input.specificKey,
  };

  return [
    db
      .update(pantryItems)
      .set(values)
      .where(eq(pantryItems.ingredientId, input.fromIngredientId)),
    db
      .update(shoppingListItems)
      .set(values)
      .where(eq(shoppingListItems.ingredientId, input.fromIngredientId)),
    db
      .update(pantryRestockItems)
      .set(values)
      .where(eq(pantryRestockItems.ingredientId, input.fromIngredientId)),
  ];
}

// Merges a private user ingredient into another ingredient (global, or the
// same user's duplicate) in a single transaction. The private ingredient's
// aliases are re-pointed rather than deleted, so the next time the user types
// the same name it resolves directly without another AI call.
export async function mergePrivateIngredient(input: {
  privateIngredientId: string;
  target: { id: string; key: string; familyKey: string };
  userId: string;
  locale: string;
  learnedNames: string[];
}): Promise<void> {
  const learnedAliases = buildUserAliasValues({
    ingredientId: input.target.id,
    userId: input.userId,
    locale: input.locale,
    names: input.learnedNames,
  });

  const statements: BatchItem<"pg">[] = [
    db
      .update(ingredientAliases)
      .set({ ingredientId: input.target.id })
      .where(eq(ingredientAliases.ingredientId, input.privateIngredientId)),
    ...rekeyReferencingRows({
      fromIngredientId: input.privateIngredientId,
      toIngredientId: input.target.id,
      specificKey: input.target.key,
      familyKey: input.target.familyKey,
    }),
    db
      .update(recipeIngredients)
      .set({ ingredientId: input.target.id })
      .where(eq(recipeIngredients.ingredientId, input.privateIngredientId)),
  ];

  if (learnedAliases.length > 0) {
    statements.push(
      db.insert(ingredientAliases).values(learnedAliases).onConflictDoNothing(),
    );
  }

  statements.push(
    db.delete(ingredients).where(eq(ingredients.id, input.privateIngredientId)),
  );

  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  invalidateIngredientAliasIndexCache();
}

// Renames a private ingredient's key (e.g. the Slovak slug "chlieb" to the
// AI-provided English key "bread") and re-keys the rows that reference it.
export async function rekeyPrivateIngredient(input: {
  ingredientId: string;
  key: string;
  familyKey: string;
}): Promise<void> {
  await db.batch([
    db
      .update(ingredients)
      .set({ key: input.key, updatedAt: new Date() })
      .where(eq(ingredients.id, input.ingredientId)),
    ...rekeyReferencingRows({
      fromIngredientId: input.ingredientId,
      toIngredientId: input.ingredientId,
      specificKey: input.key,
      familyKey: input.familyKey,
    }),
  ] as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  invalidateIngredientAliasIndexCache();
}
