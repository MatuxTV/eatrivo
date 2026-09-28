import { eq } from "drizzle-orm";

import { db } from "@/index";
import { pantryItems } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import { findPantrySuggestionForItem } from "@/lib/pantry/ai-normalization";
import {
  loadIngredientAliasIndex,
  resolveIngredientIdByKeys,
  resolvePantryIngredientIdentity,
} from "@/lib/pantry/ingredient-resolution";
import { CacheService } from "@/lib/cache/redis";
import { guessFoodCategory, normalizeUnit } from "@/lib/ingredients/units";
import type { PantryBatchState } from "../state";
import type { PantryBatchProcessedItem } from "../types";

function cacheKey(userProfileId: string) {
  return `pantry:${userProfileId}`;
}

function parseNumericQuantity(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function canMergeIntoExistingItem(
  existingUnit: string | null,
  incomingUnit: string | null,
): boolean {
  if (!existingUnit || !incomingUnit) {
    return true;
  }

  return normalizeUnit(existingUnit) === normalizeUnit(incomingUnit);
}

export async function upsertPantry(
  state: typeof PantryBatchState.State,
): Promise<Partial<typeof PantryBatchState.State>> {
  const aliasIndex = await loadIngredientAliasIndex(state.locale);
  const existingItems = [...state.currentPantry];
  const processedItems: PantryBatchProcessedItem[] = [];
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const [index, item] of state.pendingItems.entries()) {
    const suggestion = findPantrySuggestionForItem(
      state.aiSuggestions,
      item.name,
      index,
    );
    const resolvedIdentity = resolvePantryIngredientIdentity(
      item.name,
      state.locale,
      aliasIndex,
      suggestion?.ingredientSpecificKey ?? suggestion?.matchedExistingIngredientSpecificKey ?? null,
      suggestion?.ingredientKey ?? suggestion?.matchedExistingIngredientKey ?? null,
    );

    const resolvedUnit = item.unit ? normalizeUnit(item.unit) : null;
    const resolvedCategory =
      item.category ?? suggestion?.category ?? guessFoodCategory(item.name);
    const resolvedIngredientId = await resolveIngredientIdByKeys(
      resolvedIdentity.ingredientKey,
      resolvedIdentity.ingredientSpecificKey,
    );

    const existingItem = existingItems.find((existing) => {
      if (
        resolvedIdentity.ingredientSpecificKey &&
        existing.ingredientSpecificKey === resolvedIdentity.ingredientSpecificKey
      ) {
        return canMergeIntoExistingItem(existing.unit, resolvedUnit);
      }

      if (
        !resolvedIdentity.ingredientSpecificKey &&
        resolvedIdentity.ingredientKey &&
        !existing.ingredientSpecificKey &&
        existing.ingredientKey === resolvedIdentity.ingredientKey
      ) {
        return canMergeIntoExistingItem(existing.unit, resolvedUnit);
      }

      return (
        !resolvedIdentity.ingredientSpecificKey &&
        !resolvedIdentity.ingredientKey &&
        existing.name.trim().toLowerCase() === item.name.trim().toLowerCase()
      );
    });

    if (existingItem) {
      const existingQuantity = parseNumericQuantity(existingItem.quantity);
      const incomingQuantity = parseNumericQuantity(item.quantity);
      const mergedQuantity =
        existingQuantity !== null && incomingQuantity !== null
          ? String(existingQuantity + incomingQuantity)
          : existingQuantity !== null
            ? String(existingQuantity)
            : incomingQuantity !== null
              ? String(incomingQuantity)
              : existingItem.quantity;

      const [updatedItem] = await db
        .update(pantryItems)
        .set({
          name: item.name.trim(),
          ingredientName: resolvedIdentity.ingredientName,
          ingredientKey: resolvedIdentity.ingredientKey,
          ingredientSpecificKey: resolvedIdentity.ingredientSpecificKey,
          ingredientId: resolvedIngredientId,
          quantity: mergedQuantity,
          unit: resolvedUnit ?? existingItem.unit,
          category: resolvedCategory,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : existingItem.expiryDate,
          updatedAt: new Date(),
        })
        .where(eq(pantryItems.id, existingItem.id))
        .returning();

      updatedCount += 1;
      processedItems.push({
        rawName: item.name,
        normalizedName: resolvedIdentity.ingredientName,
        ingredientKey: resolvedIdentity.ingredientKey,
        ingredientSpecificKey: resolvedIdentity.ingredientSpecificKey,
        pantryItemId: updatedItem.id,
        action: "updated",
        source: resolvedIdentity.source,
        reason: suggestion?.reason ?? "Merged into existing pantry item.",
        candidateKeys: resolvedIdentity.candidateKeys,
      });

      const existingIndex = existingItems.findIndex((entry) => entry.id === updatedItem.id);
      if (existingIndex !== -1) {
        existingItems[existingIndex] = updatedItem;
      }

      continue;
    }

    if (!resolvedIdentity.ingredientKey && !resolvedIdentity.ingredientName) {
      skippedCount += 1;
      processedItems.push({
        rawName: item.name,
        normalizedName: null,
        ingredientKey: null,
        ingredientSpecificKey: null,
        pantryItemId: null,
        action: "skipped",
        source: resolvedIdentity.source,
        reason: suggestion?.reason ?? "Unable to resolve pantry item.",
        candidateKeys: resolvedIdentity.candidateKeys,
      });
      continue;
    }

    const [insertedItem] = await db
      .insert(pantryItems)
      .values({
        userProfileId: state.userProfileId,
        name: item.name.trim(),
        ingredientName: resolvedIdentity.ingredientName,
        ingredientKey: resolvedIdentity.ingredientKey,
        ingredientSpecificKey: resolvedIdentity.ingredientSpecificKey,
        ingredientId: resolvedIngredientId,
        quantity: item.quantity !== null ? String(item.quantity) : null,
        unit: resolvedUnit,
        category: resolvedCategory,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        source: "manual",
        shoppingListId: null,
      })
      .returning();

    existingItems.push(insertedItem);
    insertedCount += 1;
    processedItems.push({
      rawName: item.name,
      normalizedName: resolvedIdentity.ingredientName,
      ingredientKey: resolvedIdentity.ingredientKey,
      ingredientSpecificKey: resolvedIdentity.ingredientSpecificKey,
      pantryItemId: insertedItem.id,
      action: "inserted",
      source: resolvedIdentity.source,
      reason: suggestion?.reason ?? "Inserted new pantry item.",
      candidateKeys: resolvedIdentity.candidateKeys,
    });
  }

  await CacheService.del(cacheKey(state.userProfileId));

  apiLogger.info("[pantryBatch.upsertPantry] batch upsert completed", {
    metadata: {
      userProfileId: state.userProfileId,
      insertedCount,
      updatedCount,
      skippedCount,
    },
  });

  return {
    processedItems,
    insertedCount,
    updatedCount,
    skippedCount,
  };
}
