import { validateRecipeIngredientUnit } from "@/lib/recipes/recipe-unit-validation";

interface CanonicalIngredientLike {
  ingredient_key: string | null;
  ingredient_specific_key: string | null;
  canonical_name: string | null;
  quantity: number | null;
  unit: string | null;
  translations: Record<string, unknown>;
}

interface CanonicalRecipeLike {
  default_locale: string;
  translations: Record<string, unknown>;
  ingredients: CanonicalIngredientLike[];
}

export function hasAtLeastOneTranslation(
  translations: Record<string, unknown>,
): boolean {
  return Object.values(translations).some(Boolean);
}

function resolveLocalizedName(
  value: unknown,
  key: "display_name" | "name",
): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}

function resolveCanonicalIngredientLabel(
  ingredient: CanonicalIngredientLike,
  defaultLocale: string,
): string {
  const defaultTranslation = ingredient.translations[defaultLocale];
  const defaultName = resolveLocalizedName(defaultTranslation, "display_name");
  if (defaultName) {
    return defaultName;
  }

  for (const translation of Object.values(ingredient.translations)) {
    const candidate = resolveLocalizedName(translation, "display_name");
    if (candidate) {
      return candidate;
    }
  }

  if (ingredient.canonical_name && ingredient.canonical_name.trim().length > 0) {
    return ingredient.canonical_name.trim();
  }

  return "ingredient";
}

export function validateCanonicalRecipeCollection(payload: {
  recipes: CanonicalRecipeLike[];
}): string[] {
  const issues: string[] = [];

  payload.recipes.forEach((recipe, recipeIndex) => {
    if (!recipe.translations[recipe.default_locale]) {
      issues.push(
        `recipes.${recipeIndex}.translations.${recipe.default_locale}: missing default locale translation`,
      );
    }

    if (!hasAtLeastOneTranslation(recipe.translations)) {
      issues.push(`recipes.${recipeIndex}.translations: at least one locale is required`);
    }

    recipe.ingredients.forEach((ingredient, ingredientIndex) => {
      if (!hasAtLeastOneTranslation(ingredient.translations)) {
        issues.push(
          `recipes.${recipeIndex}.ingredients.${ingredientIndex}.translations: at least one locale is required`,
        );
      }

      if (ingredient.quantity === null) {
        issues.push(
          `recipes.${recipeIndex}.ingredients.${ingredientIndex}.quantity: quantity is required for accepted recipes`,
        );
        return;
      }

      if (ingredient.unit === null) {
        issues.push(
          `recipes.${recipeIndex}.ingredients.${ingredientIndex}.unit: unit is required for accepted recipes`,
        );
        return;
      }

      const ingredientName = resolveCanonicalIngredientLabel(
        ingredient,
        recipe.default_locale,
      );
      const validationIssues = validateRecipeIngredientUnit({
        ingredientName,
        amount: `${ingredient.quantity} ${ingredient.unit}`,
        ingredientKey:
          ingredient.ingredient_specific_key ?? ingredient.ingredient_key,
      });

      if (validationIssues.length > 0) {
        issues.push(
          `recipes.${recipeIndex}.ingredients.${ingredientIndex}: ${validationIssues[0]?.message ?? "invalid ingredient unit"}`,
        );
      }
    });
  });

  return issues;
}