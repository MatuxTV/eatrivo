import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/index";
import { pantryItems } from "@/db/schema";
import {
  findPantrySuggestionForItem,
  getPantryAiSuggestions,
} from "@/lib/pantry/ai-normalization";
import {
  loadIngredientGraph,
  loadIngredientAliasIndex,
  resolvePantryIngredientIdentity,
} from "@/lib/pantry/ingredient-resolution";
import { CacheService } from "@/lib/cache/redis";
import { guessFoodCategory } from "@/lib/ingredients/units";
import { apiLogger } from "@/lib/logger";

interface PantryNormalizationErrorContext {
  source: string;
  userProfileId: string;
  pantryItemIds?: string[];
}

interface NormalizePantryItemsInBackgroundInput {
  source: string;
  userProfileId: string;
  locale: string;
  pantryItemIds: string[];
}

function parseNumericQuantity(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function handlePantryNormalizationError(
  error: unknown,
  context: PantryNormalizationErrorContext,
) {
  apiLogger.error("[pantry.normalize] background normalization failed", error, {
    metadata: {
      source: context.source,
      userProfileId: context.userProfileId,
      pantryItemIds: context.pantryItemIds ?? [],
    },
  });
}

export async function normalizePantryItemsInBackground(
  input: NormalizePantryItemsInBackgroundInput,
) {
  if (input.pantryItemIds.length === 0) {
    return;
  }

  try {
    // Items that already link to an ingredient are resolved; re-running the
    // AI on them could only move their keys away from ingredient_id.
    const itemsToNormalize = await db
      .select()
      .from(pantryItems)
      .where(
        and(
          inArray(pantryItems.id, input.pantryItemIds),
          isNull(pantryItems.ingredientId),
        ),
      );

    if (itemsToNormalize.length === 0) {
      return;
    }

    const currentPantry = await db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userProfileId, input.userProfileId));
    const aiSuggestions = await getPantryAiSuggestions({
      userProfileId: input.userProfileId,
      locale: input.locale,
      currentPantry,
      pendingItems: itemsToNormalize.map((item) => ({
        name: item.name,
        quantity: parseNumericQuantity(item.quantity),
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiryDate?.toISOString() ?? null,
      })),
    });
    const [aliasIndex, ingredientGraph] = await Promise.all([
      loadIngredientAliasIndex(input.locale),
      loadIngredientGraph(input.locale),
    ]);

    for (const [index, item] of itemsToNormalize.entries()) {
      const aiSuggestion = findPantrySuggestionForItem(
        aiSuggestions,
        item.name,
        index,
      );
      const aiSuggestedSpecificKey =
        aiSuggestion?.ingredientSpecificKey ??
        aiSuggestion?.matchedExistingIngredientSpecificKey ??
        null;
      const aiSuggestedKey =
        aiSuggestion?.ingredientKey ??
        aiSuggestion?.matchedExistingIngredientKey ??
        null;

      if (!aiSuggestedSpecificKey && !aiSuggestedKey) {
        apiLogger.warn("[pantry.normalize] AI returned no canonical key", {
          metadata: {
            source: input.source,
            userProfileId: input.userProfileId,
            pantryItemId: item.id,
            name: item.name,
          },
        });
        continue;
      }

      const ingredientIdentity = resolvePantryIngredientIdentity(
        item.name,
        input.locale,
        aliasIndex,
        aiSuggestedSpecificKey,
        aiSuggestedKey,
      );

      if (
        ingredientIdentity.source === "fallback" ||
        (!ingredientIdentity.ingredientSpecificKey && !ingredientIdentity.ingredientKey)
      ) {
        apiLogger.warn("[pantry.normalize] AI key could not be validated", {
          metadata: {
            source: input.source,
            userProfileId: input.userProfileId,
            pantryItemId: item.id,
            name: item.name,
            aiSuggestedSpecificKey,
            aiSuggestedKey,
            candidateKeys: ingredientIdentity.candidateKeys,
          },
        });
        continue;
      }

      const identityKey =
        ingredientIdentity.ingredientSpecificKey ?? ingredientIdentity.ingredientKey;

      await db
        .update(pantryItems)
        .set({
          ingredientName: ingredientIdentity.ingredientName,
          ingredientKey: ingredientIdentity.ingredientKey,
          ingredientSpecificKey: ingredientIdentity.ingredientSpecificKey,
          ingredientId: identityKey
            ? ingredientGraph.idByKey.get(identityKey) ?? null
            : null,
          category:
            item.category ??
            aiSuggestion?.category ??
            guessFoodCategory(item.name),
          updatedAt: new Date(),
        })
        .where(eq(pantryItems.id, item.id));
    }

    await CacheService.del(`pantry:${input.userProfileId}`);
  } catch (error) {
    handlePantryNormalizationError(error, {
      source: input.source,
      userProfileId: input.userProfileId,
      pantryItemIds: input.pantryItemIds,
    });
  }
}