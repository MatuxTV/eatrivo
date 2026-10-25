// Pantry match helpers. The Home recipe card shows how much of a recipe the
// user already has in their pantry and what is still missing.

import type { BasicHomeRecipePreview } from "@/app/home/types/data";

export interface PantryMatch {
  have: number;
  total: number;
  missing: string[];
}

export function getPantryMatch(
  recipe: Pick<
    BasicHomeRecipePreview,
    "matchedIngredients" | "missingIngredients"
  > &
    Partial<Pick<BasicHomeRecipePreview, "ingredientPreview">>,
): PantryMatch | null {
  if (
    recipe.matchedIngredients === undefined &&
    recipe.missingIngredients === undefined
  ) {
    return null;
  }

  // Server matching fills `matchedIngredients`. The client-side fallback
  // (RecipesSection `enrichRecipes`) and the cookable lists only narrow
  // `ingredientPreview` down to the matched names, so count those instead.
  const have =
    recipe.matchedIngredients?.length ?? recipe.ingredientPreview?.length ?? 0;
  const seen = new Set<string>();
  const missing: string[] = [];

  for (const raw of recipe.missingIngredients ?? []) {
    const name = raw.trim();

    if (!name) {
      continue;
    }

    const key = name.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    missing.push(name);
  }

  const total = have + missing.length;

  if (total === 0) {
    return null;
  }

  return { have, total, missing };
}

export function splitMissing(
  missing: string[],
  max = 2,
): { shown: string[]; rest: number } {
  return {
    shown: missing.slice(0, Math.max(0, max)),
    rest: Math.max(0, missing.length - max),
  };
}
