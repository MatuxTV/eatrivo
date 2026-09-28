import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/index";
import {
  ingredientAliases,
  ingredientNames,
  ingredients,
} from "@/db/schema";
import {
  buildCatalogNameAndAliasRows,
  planCatalogEntries,
  planCatalogParentLinks,
  resolveCatalogCanonicalName,
  type CatalogIngredientInput,
} from "@/lib/ingredients/catalog-core";
import { invalidateIngredientAliasIndexCache } from "@/lib/pantry/ingredient-resolution";

export type { CatalogIngredientInput } from "@/lib/ingredients/catalog-core";

// Makes sure every recipe ingredient key exists in the global catalog, the
// same way scripts/backfill-ingredients.ts seeded it: new keys become trusted
// recipe ingredients (with their family as parent), missing per-locale names
// are filled in, and display names become global aliases so pantry items can
// resolve to them. Returns global ingredient ids by key.
export async function ensureCatalogIngredients(
  inputs: CatalogIngredientInput[],
): Promise<Map<string, string>> {
  const { entries, allKeys } = planCatalogEntries(inputs);
  if (allKeys.size === 0) {
    return new Map();
  }

  const loadIds = async () =>
    new Map(
      (
        await db
          .select({ id: ingredients.id, key: ingredients.key })
          .from(ingredients)
          .where(
            and(isNull(ingredients.ownerUserId), inArray(ingredients.key, [...allKeys])),
          )
      ).map((row) => [row.key, row.id]),
    );

  const existingIds = await loadIds();
  const missingKeys = [...allKeys].filter((key) => !existingIds.has(key));

  if (missingKeys.length > 0) {
    await db
      .insert(ingredients)
      .values(
        missingKeys.map((key) => ({
          key,
          canonicalName: resolveCatalogCanonicalName(key, entries),
          source: "recipe" as const,
          reviewState: "trusted" as const,
        })),
      )
      .onConflictDoNothing();
  }

  const idByKey = missingKeys.length > 0 ? await loadIds() : existingIds;

  const parentByKey = planCatalogParentLinks(
    entries,
    new Set(missingKeys),
    idByKey,
  );
  for (const [key, parentId] of parentByKey) {
    const ingredientId = idByKey.get(key);
    if (ingredientId) {
      await db
        .update(ingredients)
        .set({ parentId, updatedAt: new Date() })
        .where(eq(ingredients.id, ingredientId));
    }
  }

  const { nameRows, aliasRows } = buildCatalogNameAndAliasRows(entries, idByKey);

  // Existing names win (PK ingredient_id + locale); this only fills gaps.
  if (nameRows.length > 0) {
    await db.insert(ingredientNames).values(nameRows).onConflictDoNothing();
  }
  if (aliasRows.length > 0) {
    await db.insert(ingredientAliases).values(aliasRows).onConflictDoNothing();
  }

  invalidateIngredientAliasIndexCache();

  return idByKey;
}
