import {
  isLessSpecificIngredientMatch,
  pantryKeySatisfiesRecipeKey,
} from "./ingredient-family";

export interface IngredientGraph {
  parentById: Map<string, string | null>;
  keyById: Map<string, string>;
  idByKey: Map<string, string>;
}

export interface MatchableIngredient {
  ingredientId: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
}

export type IngredientMatchType = "exact" | "fallback";

export interface IngredientMatchResult {
  matched: boolean;
  matchType: IngredientMatchType | null;
}

export function isIngredientAncestor(
  ancestorId: string,
  descendantId: string,
  parentById: Map<string, string | null>,
): boolean {
  let current = parentById.get(descendantId) ?? null;
  const guard = new Set<string>();

  while (current) {
    if (current === ancestorId) {
      return true;
    }
    if (guard.has(current)) {
      return false;
    }
    guard.add(current);
    current = parentById.get(current) ?? null;
  }

  return false;
}

function keyFallbackMatch(
  pantry: MatchableIngredient,
  recipe: MatchableIngredient,
): IngredientMatchResult {
  const preferredRecipeKey =
    recipe.ingredientSpecificKey ?? recipe.ingredientKey;
  if (!preferredRecipeKey) {
    return { matched: false, matchType: null };
  }

  if (
    pantry.ingredientSpecificKey &&
    pantryKeySatisfiesRecipeKey(
      pantry.ingredientSpecificKey,
      preferredRecipeKey,
    )
  ) {
    return {
      matched: true,
      matchType: isLessSpecificIngredientMatch(
        pantry.ingredientSpecificKey,
        preferredRecipeKey,
      )
        ? "fallback"
        : "exact",
    };
  }

  if (
    pantry.ingredientKey &&
    pantryKeySatisfiesRecipeKey(pantry.ingredientKey, preferredRecipeKey)
  ) {
    return { matched: true, matchType: "fallback" };
  }

  return { matched: false, matchType: null };
}

export function matchPantryIngredient(
  pantry: MatchableIngredient,
  recipe: MatchableIngredient,
  graph?: IngredientGraph | null,
): IngredientMatchResult {
  if (graph && pantry.ingredientId && recipe.ingredientId) {
    if (pantry.ingredientId === recipe.ingredientId) {
      return { matched: true, matchType: "exact" };
    }

    // Pantry item is a more specific variant of what the recipe asks for
    // (olive-oil for "oil") — fully satisfies the recipe.
    if (
      isIngredientAncestor(
        recipe.ingredientId,
        pantry.ingredientId,
        graph.parentById,
      )
    ) {
      return { matched: true, matchType: "exact" };
    }

    // Pantry item is only the broader family of what the recipe asks for
    // (oil for "olive-oil") — usable as a substitute.
    if (
      isIngredientAncestor(
        pantry.ingredientId,
        recipe.ingredientId,
        graph.parentById,
      )
    ) {
      return { matched: true, matchType: "fallback" };
    }

    return { matched: false, matchType: null };
  }

  return keyFallbackMatch(pantry, recipe);
}
