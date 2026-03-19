import { eq } from "drizzle-orm";

import { pantryItems } from "@/db/schema";
import { db } from "@/lib/db/pool";
import { apiLogger } from "@/lib/logger";
import type { CustomRecipePantryContextItem } from "@/lib/custom-recipes/contracts";
import type { CustomRecipeState } from "../state";

export async function fetchPantry(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  try {
    const rows = await db
      .select({
        id: pantryItems.id,
        name: pantryItems.name,
        ingredientName: pantryItems.ingredientName,
        ingredientKey: pantryItems.ingredientKey,
        ingredientSpecificKey: pantryItems.ingredientSpecificKey,
        quantity: pantryItems.quantity,
        unit: pantryItems.unit,
        category: pantryItems.category,
      })
      .from(pantryItems)
      .where(eq(pantryItems.userProfileId, state.userProfileId));

    const pantryContextRows: CustomRecipePantryContextItem[] = rows.map((row) => ({
      id: row.id,
      pantryName: row.name,
      ingredientName: row.ingredientName,
      ingredientKey: row.ingredientKey,
      ingredientSpecificKey: row.ingredientSpecificKey,
      quantity: row.quantity,
      unit: row.unit,
      category: row.category,
    }));

    const pantryIngredientKeyCount = new Set(
      rows.flatMap((row) =>
        [row.ingredientSpecificKey, row.ingredientKey].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ).size;

    return {
      pantryRows: pantryContextRows,
      pantryItemCount: pantryContextRows.length,
      pantryIngredientKeyCount,
      fatalError: null,
      fatalErrorCode: null,
    };
  } catch (error) {
    apiLogger.error("[customRecipe.fetchPantry] failed", error, {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
      },
    });

    return {
      fatalError: "Failed to load pantry",
      fatalErrorCode: "PANTRY_FETCH_FAILED",
    };
  }
}
