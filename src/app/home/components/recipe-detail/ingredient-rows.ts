import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import { PANTRY_QUANTITY_TRACKING } from "@/lib/config/features";

export type IngredientTone = "green" | "orange" | "red";

export interface IngredientRow {
  key: string;
  name: string;
  note: string | null;
  amount: string | null;
  category: string | null;
  available: boolean;
  isStaple: boolean;
  tone: IngredientTone;
}

export interface IngredientRowLabels {
  stapleAvailable: string;
  haveAmountInline: (amount: string) => string;
  fallbackUsing: (ingredient: string) => string;
}

type IngredientRowRecipe = Pick<
  BasicHomeRecipePreview,
  "ingredientItems" | "matchedIngredients" | "missingIngredients"
>;

export function buildIngredientRows(
  recipe: IngredientRowRecipe,
  labels: IngredientRowLabels,
  options?: { quantityTracking?: boolean },
): IngredientRow[] {
  const quantityTracking = options?.quantityTracking ?? PANTRY_QUANTITY_TRACKING;

  const ingredientByName = new Map(
    recipe.ingredientItems.map((ingredient) => [
      ingredient.name.trim().toLowerCase(),
      ingredient,
    ]),
  );

  const resolveAmountLabel = (
    ingredientName: string,
    fallbackAmount: string | null,
  ) => {
    const ingredient = ingredientByName.get(ingredientName.trim().toLowerCase());

    // [PANTRY_QUANTITY_TRACKING] flag off: keep the recipe's own amount, "have at home" only when there is no amount
    if (
      ingredient?.pantryComparison?.status === "available-staple" &&
      (quantityTracking ||
        !(ingredient.pantryComparison.requiredLabel ?? ingredient.amount ?? fallbackAmount))
    ) {
      return labels.stapleAvailable;
    }

    if (
      ingredient?.pantryComparison?.status === "insufficient" &&
      ingredient.pantryComparison.requiredLabel &&
      ingredient.pantryComparison.availableLabel
    ) {
      return `${ingredient.pantryComparison.requiredLabel} (${labels.haveAmountInline(
        ingredient.pantryComparison.availableLabel,
      )})`;
    }

    return ingredient?.pantryComparison?.requiredLabel ??
      ingredient?.amount ??
      fallbackAmount;
  };

  const resolveTone = (
    ingredientName: string,
    available: boolean,
    matchType: "exact" | "fallback",
  ) => {
    if (!available) {
      return "red" as const;
    }

    if (matchType === "fallback") {
      return "orange" as const;
    }

    const comparison = ingredientByName.get(
      ingredientName.trim().toLowerCase(),
    )?.pantryComparison;

    if (
      comparison?.status === "insufficient" ||
      comparison?.status === "unit-mismatch" ||
      comparison?.status === "missing-pantry-quantity"
    ) {
      return "orange" as const;
    }

    return "green" as const;
  };

  const available = (recipe.matchedIngredients ?? []).map((ingredient) => ({
    key: ingredient.recipeIngredientName,
    name: ingredient.recipeIngredientName,
    note:
      ingredient.matchType === "fallback" &&
      ingredient.pantryIngredientName &&
      ingredient.pantryIngredientName.trim().toLowerCase() !==
        ingredient.recipeIngredientName.trim().toLowerCase()
        ? labels.fallbackUsing(ingredient.pantryIngredientName)
        : null,
    amount: resolveAmountLabel(ingredient.recipeIngredientName, ingredient.amount),
    category: null,
    available: true,
    isStaple:
      // [PANTRY_QUANTITY_TRACKING] flag off: nothing is shown as a "staple"
      quantityTracking &&
      ingredientByName.get(
        ingredient.recipeIngredientName.trim().toLowerCase(),
      )?.pantryComparison?.status === "available-staple",
    tone: resolveTone(ingredient.recipeIngredientName, true, ingredient.matchType),
  }));
  const fallbackAvailable =
    recipe.matchedIngredients === undefined
      ? recipe.ingredientItems.map((ingredient) => ({
          key: ingredient.name,
          name: ingredient.name,
          note: null,
          amount: resolveAmountLabel(ingredient.name, ingredient.amount),
          category: null,
          available: true,
          isStaple:
            // [PANTRY_QUANTITY_TRACKING] flag off: nothing is shown as a "staple"
            quantityTracking &&
            ingredient.pantryComparison?.status === "available-staple",
          tone: resolveTone(ingredient.name, true, "exact"),
        }))
      : [];
  const missing = (recipe.missingIngredients ?? []).map((ing) => ({
    key: ing,
    name: ing,
    note: null,
    amount: resolveAmountLabel(ing, null),
    category: ingredientByName.get(ing.trim().toLowerCase())?.category ?? null,
    available: false,
    isStaple: false,
    tone: "red" as const,
  }));

  return [...available, ...fallbackAvailable, ...missing];
}

export function countIngredientRows(rows: IngredientRow[]): {
  have: number;
  total: number;
  missing: IngredientRow[];
} {
  const have = rows.filter((row) => row.available).length;
  const missing = rows.filter((row) => !row.available);

  return { have, total: rows.length, missing };
}
