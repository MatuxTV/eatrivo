import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import type { CustomRecipeGeneratedRecipe } from "@/lib/custom-recipes/contracts";
import {
  getRecipeCategoryGradient,
  normalizeRecipeCategoryKey,
} from "@/lib/recipes/category-keys";
import type { RecipeIngredientItem } from "@/lib/recipes/recipe-ingredients";

const DEFAULT_CATEGORY_KEY = "dinner";

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function adaptIngredientItem(
  ingredient: CustomRecipeGeneratedRecipe["ingredientItems"][number],
): RecipeIngredientItem | null {
  const name = ingredient.name?.trim();
  if (!name) {
    return null;
  }

  return {
    name,
    amount: ingredient.amount?.trim() || null,
    category: ingredient.category?.trim() || null,
    quantityValue:
      typeof ingredient.quantityValue === "number" && Number.isFinite(ingredient.quantityValue)
        ? ingredient.quantityValue
        : null,
    unit: ingredient.unit?.trim() || null,
    ingredientKey: ingredient.ingredientKey?.trim() || null,
    ingredientSpecificKey: ingredient.ingredientSpecificKey?.trim() || null,
    pantryComparison: ingredient.pantryComparison ?? null,
  };
}

export function adaptGeneratedRecipeToPreview(
  recipe: CustomRecipeGeneratedRecipe,
): BasicHomeRecipePreview {
  const ingredientItems = recipe.ingredientItems
    .map((ingredient) => adaptIngredientItem(ingredient))
    .filter((ingredient): ingredient is RecipeIngredientItem => ingredient !== null);
  const temporaryId = `recipe-creation:${slugify(recipe.name) || "recipe"}`;
  const isPreferencesOnlyRecipe = recipe.kind === "preferences_only";

  return {
    id: temporaryId,
    slug: slugify(recipe.name) || temporaryId,
    title: recipe.name,
    category: recipe.category,
    categoryKey: normalizeRecipeCategoryKey(recipe.category, DEFAULT_CATEGORY_KEY),
    servings: recipe.servings,
    totalTimeMin: recipe.totalTimeMin,
    calories: recipe.calories,
    proteinG: recipe.proteinG,
    carbsG: recipe.carbohydratesG,
    fatG: recipe.fatG,
    restrictionFlags: [],
    instructions: recipe.instructions,
    dietTags: recipe.tags,
    ingredientItems,
    ingredientPreview:
      recipe.matchedIngredientNames.length > 0
        ? recipe.matchedIngredientNames
        : ingredientItems.map((ingredient) => ingredient.name).slice(0, 4),
    matchedIngredients: isPreferencesOnlyRecipe
      ? []
      : recipe.matchedIngredients.map((ingredient) => ({
          recipeIngredientName: ingredient.recipeIngredientName,
          pantryIngredientName: ingredient.pantryIngredientName,
          matchType: ingredient.matchType,
          displayName: ingredient.displayName,
          amount: ingredient.amount,
        })),
    mealPrepFriendly: recipe.mealPrepFriendly,
    missingIngredients: recipe.missingIngredientNames.length > 0
      ? recipe.missingIngredientNames
      : undefined,
  };
}

export { getRecipeCategoryGradient };