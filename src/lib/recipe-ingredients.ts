import { formatNumber } from "@/lib/formatters";
import type { RecipeIngredientPantryComparison } from "@/lib/recipe-quantity-comparison";

export interface RecipeIngredientItem {
  name: string;
  amount: string | null;
  category?: string | null;
  quantityValue?: number | null;
  unit?: string | null;
  pantryComparison?: RecipeIngredientPantryComparison | null;
}

function normalizeQuantity(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatRecipeIngredientAmount(
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
  locale: string,
): string | null {
  const normalizedUnit = unit?.trim() || null;
  const normalizedQuantity = normalizeQuantity(quantity);

  if (normalizedQuantity === null && !normalizedUnit) {
    return null;
  }

  if (normalizedQuantity === null) {
    return normalizedUnit;
  }

  const formattedQuantity = formatNumber(normalizedQuantity, locale, {
    maximumFractionDigits: 3,
  });

  return normalizedUnit
    ? `${formattedQuantity} ${normalizedUnit}`
    : formattedQuantity;
}