import { formatLocalizedAmountLabel } from "@/lib/pantry/format";
import type { RecipeIngredientPantryComparison } from "@/lib/recipes/recipe-quantity-comparison";

export interface RecipeIngredientItem {
  name: string;
  amount: string | null;
  category?: string | null;
  quantityValue?: number | null;
  unit?: string | null;
  ingredientKey?: string | null;
  ingredientSpecificKey?: string | null;
  ingredientId?: string | null;
  pantryComparison?: RecipeIngredientPantryComparison | null;
}

export function formatRecipeIngredientAmount(
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
  locale: string,
): string | null {
  return formatLocalizedAmountLabel(quantity, unit, locale, {
    maximumFractionDigits: 3,
  });
}