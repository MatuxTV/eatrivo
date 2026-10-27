import { asc, eq } from "drizzle-orm";

import { db } from "@/index";
import { pantryItems, shoppingListItems } from "@/db/schema";
import { CacheService } from "@/lib/cache/redis";
import { reportIngredientResolutionFeedback } from "@/lib/feedback/ingredient-resolution-feedback";
import { guessFoodCategory } from "@/lib/ingredients/units";
import { apiLogger } from "@/lib/logger";
import {
  findPantrySuggestionForItem,
  getPantryAiSuggestions,
} from "@/lib/pantry/ai-normalization";
import { classifyUserIngredient } from "@/lib/pantry/ingredient-classification";
import {
  getAliasCandidateKeysForName,
  getRememberableAiKey,
  loadIngredientGraph,
  loadUserIngredientAliasIndex,
  resolvePantryIngredientIdentity,
} from "@/lib/pantry/ingredient-resolution";
import {
  ensureUserIngredient,
  rememberAiIngredientChoice,
} from "@/lib/pantry/user-ingredients";

interface NormalizeShoppingListItemInput {
  shoppingListItemId: string;
  userId: string;
  userProfileId: string;
  locale: string;
  rawName: string;
  quantity: number | null;
  unit: string | null;
  // Category the user picked; when null the AI's category replaces the guess.
  userCategory: string | null;
  feedbackUser: { email: string | null; name: string | null; locale: string | null };
}

// Links a manually added shopping list item to the ingredient catalog after the
// response was sent: the item is already on the list under the name the user
// typed, this only fills in its ingredient identity and category.
export async function normalizeShoppingListItemInBackground(
  input: NormalizeShoppingListItemInput,
): Promise<void> {
  try {
    const [userAliasIndex, ingredientGraph] = await Promise.all([
      loadUserIngredientAliasIndex(input.locale, input.userId),
      loadIngredientGraph(input.locale),
    ]);

    const needsAiSuggestion =
      getAliasCandidateKeysForName(input.rawName, userAliasIndex.index).length !== 1;
    const currentPantry = needsAiSuggestion
      ? await db
          .select()
          .from(pantryItems)
          .where(eq(pantryItems.userProfileId, input.userProfileId))
          .orderBy(asc(pantryItems.createdAt))
      : [];
    const aiSuggestion = needsAiSuggestion
      ? findPantrySuggestionForItem(
          await getPantryAiSuggestions({
            userProfileId: input.userProfileId,
            locale: input.locale,
            currentPantry,
            pendingItems: [
              {
                name: input.rawName,
                trackingMode: null,
                inStock: null,
                quantity: input.quantity,
                unit: input.unit,
                category: input.userCategory ?? guessFoodCategory(input.rawName),
                expiryDate: null,
              },
            ],
          }),
          input.rawName,
          0,
        )
      : null;

    let identity = resolvePantryIngredientIdentity(
      input.rawName,
      input.locale,
      userAliasIndex.index,
      aiSuggestion?.ingredientSpecificKey ??
        aiSuggestion?.matchedExistingIngredientSpecificKey ??
        null,
      aiSuggestion?.ingredientKey ?? aiSuggestion?.matchedExistingIngredientKey ?? null,
    );
    const identityKey = identity.ingredientSpecificKey ?? identity.ingredientKey;
    let ingredientId: string | null = null;
    let createdUserIngredientId: string | null = null;

    if (identityKey) {
      ingredientId =
        ingredientGraph.idByKey.get(identityKey) ??
        userAliasIndex.privateIdByKey.get(identityKey) ??
        null;
    } else {
      // Unknown item → private user ingredient, classified below.
      const userIngredient = await ensureUserIngredient({
        userId: input.userId,
        locale: input.locale,
        rawName: input.rawName,
      });

      if (userIngredient) {
        ingredientId = userIngredient.id;
        createdUserIngredientId = userIngredient.created ? userIngredient.id : null;
        identity = {
          ...identity,
          ingredientName: userIngredient.canonicalName ?? input.rawName,
          ingredientKey: userIngredient.key,
          ingredientSpecificKey: userIngredient.key,
        };
      } else {
        await reportIngredientResolutionFeedback({
          source: "shopping-list-current-upsert",
          rawName: input.rawName,
          locale: input.feedbackUser.locale ?? input.locale,
          userId: input.userId,
          userEmail: input.feedbackUser.email,
          userName: input.feedbackUser.name,
        });
      }
    }

    const category = input.userCategory ?? aiSuggestion?.category ?? null;

    await db
      .update(shoppingListItems)
      .set({
        ingredientName: identity.ingredientName,
        ingredientKey: identity.ingredientKey,
        ingredientSpecificKey: identity.ingredientSpecificKey,
        ingredientId,
        ...(category ? { category } : {}),
        updatedAt: new Date(),
      })
      .where(eq(shoppingListItems.id, input.shoppingListItemId));

    await CacheService.del(`shopping-lists:${input.userId}`);

    const rememberedAiKey = getRememberableAiKey(aiSuggestion, identity);
    if (rememberedAiKey && ingredientId && !createdUserIngredientId) {
      await rememberAiIngredientChoice({
        userId: input.userId,
        locale: input.locale,
        rawName: input.rawName,
        ingredientId,
      });
    }

    if (createdUserIngredientId) {
      await classifyUserIngredient({
        ingredientId: createdUserIngredientId,
        userId: input.userId,
        userProfileId: input.userProfileId,
        locale: input.locale,
        rawName: input.rawName,
      });
    }

    apiLogger.info("[shopping-list.normalize] item linked to ingredient", {
      metadata: {
        shoppingListItemId: input.shoppingListItemId,
        usedAi: needsAiSuggestion,
        source: identity.source,
        ingredientKey: identity.ingredientSpecificKey ?? identity.ingredientKey,
        rememberedAiKey,
      },
    });
  } catch (error) {
    apiLogger.error("[shopping-list.normalize] failed", error, {
      metadata: { shoppingListItemId: input.shoppingListItemId },
    });
  }
}
