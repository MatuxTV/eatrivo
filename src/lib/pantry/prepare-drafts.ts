import { eq } from "drizzle-orm";

import { db } from "@/index";
import { pantryItems, userInfoTable, userProfiles } from "@/db/schema";
import type { PantryBatchInputItem } from "@/lib/langgraph/pantry-batch/types";
import {
  findPantrySuggestionForItem,
  getPantryAiSuggestions,
} from "@/lib/pantry/ai-normalization";
import {
  createPantryDraftItem,
  type PantryDraftItem,
} from "@/lib/pantry/draft-cache";
import {
  loadIngredientAliasIndex,
  resolvePantryIngredientIdentity,
} from "@/lib/pantry/ingredient-resolution";
import {
  resolvePantryTrackingMode,
  shouldPreservePantryQuantity,
} from "@/lib/pantry/tracking";
import { guessFoodCategory, normalizeUnit } from "@/lib/ingredients/units";

interface PreparePantryDraftsInput {
  userId: string;
  items: PantryBatchInputItem[];
}

interface PreparedPantryDraftsResult {
  userProfileId: string;
  locale: string;
  drafts: PantryDraftItem[];
}

function parseNumericQuantity(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function preparePantryDrafts(
  input: PreparePantryDraftsInput,
): Promise<PreparedPantryDraftsResult> {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, input.userId),
  });

  if (!userProfile) {
    throw new Error("Profile not found");
  }

  const userInfo = await db.query.userInfoTable.findFirst({
    where: eq(userInfoTable.userProfileId, userProfile.id),
  });
  const locale = userInfo?.language ?? "sk";

  const currentPantry = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userProfileId, userProfile.id));

  const aiSuggestions = await getPantryAiSuggestions({
    userProfileId: userProfile.id,
    locale,
    currentPantry,
    pendingItems: input.items,
  });
  const aliasIndex = await loadIngredientAliasIndex(locale);

  const drafts = input.items.map((item, index) => {
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
    const ingredientIdentity = resolvePantryIngredientIdentity(
      item.name,
      locale,
      aliasIndex,
      aiSuggestedSpecificKey,
      aiSuggestedKey,
    );
    const displayName = ingredientIdentity.ingredientName ?? item.name.trim();
    const trackingMode = resolvePantryTrackingMode({
      name: displayName,
      ingredientKey: ingredientIdentity.ingredientKey,
      ingredientSpecificKey: ingredientIdentity.ingredientSpecificKey,
      aiRecommendedTrackingMode: aiSuggestion?.recommendedTrackingMode ?? null,
      trackingMode: item.trackingMode ?? null,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
    });
    const normalizedUnit = item.unit ? normalizeUnit(item.unit) : null;
    const preserveQuantity = shouldPreservePantryQuantity({
      name: displayName,
      ingredientKey: ingredientIdentity.ingredientKey,
      ingredientSpecificKey: ingredientIdentity.ingredientSpecificKey,
      trackingMode,
      aiRecommendedTrackingMode: aiSuggestion?.recommendedTrackingMode ?? null,
      quantity: item.quantity ?? null,
      unit: normalizedUnit,
    });

    return createPantryDraftItem({
      name: displayName,
      ingredientName: ingredientIdentity.ingredientName,
      ingredientKey: ingredientIdentity.ingredientKey,
      ingredientSpecificKey: ingredientIdentity.ingredientSpecificKey,
      trackingMode,
      inStock: trackingMode === "availability" ? (item.inStock ?? true) : true,
      quantity:
        (trackingMode === "quantity" || preserveQuantity) &&
        item.quantity !== null &&
        item.quantity !== undefined
          ? String(item.quantity)
          : null,
      unit:
        (trackingMode === "quantity" || preserveQuantity) && normalizedUnit
          ? normalizedUnit
          : null,
      category:
        item.category?.trim() ||
        aiSuggestion?.category ||
        guessFoodCategory(item.name),
      expiryDate: item.expiryDate ?? null,
      candidateKeys: ingredientIdentity.candidateKeys,
    });
  });

  return {
    userProfileId: userProfile.id,
    locale,
    drafts,
  };
}

export function normalizePreparedDraftInput(
  items: PantryBatchInputItem[],
): PantryBatchInputItem[] {
  return items
    .map((item) => ({
      name: item.name.trim(),
      trackingMode: item.trackingMode ?? null,
      inStock: item.inStock ?? null,
      quantity: item.quantity ?? null,
      unit: item.unit?.trim() || null,
      category: item.category?.trim() || null,
      expiryDate: item.expiryDate?.trim() || null,
    }))
    .filter((item) => item.name.length > 0);
}

export function parseDraftQuantity(value: string | null): number | null {
  return parseNumericQuantity(value);
}