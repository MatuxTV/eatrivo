// Recipe category visuals. Recipes without a photo fall back to an emoji tile
// on a tinted background, keyed by the recipe's `categoryKey`.

export interface RecipeVisual {
  emoji: string;
  tint: string;
}

const RECIPE_VISUALS: Record<string, RecipeVisual> = {
  breakfast: { emoji: "🍳", tint: "#FEF3C7" },
  lunch: { emoji: "🍲", tint: "#FFEDD5" },
  dinner: { emoji: "🍝", tint: "#E0F2FE" },
  "lunch-and-dinner": { emoji: "🍛", tint: "#FFEDD5" },
  snack: { emoji: "🥨", tint: "#FDE9D3" },
  smoothies: { emoji: "🥤", tint: "#DCFCE7" },
  dessert: { emoji: "🍰", tint: "#FCE7F3" },
  treats: { emoji: "🍪", tint: "#FCE7F3" },
  "pre-workout-fuel": { emoji: "⚡", tint: "#DDF7EE" },
  "post-workout-fuel": { emoji: "💪", tint: "#EFE3FF" },
};

const FALLBACK_VISUAL: RecipeVisual = { emoji: "🍽️", tint: "#F6F0FF" };

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-");
}

export function getRecipeVisual(
  categoryKey: string | null | undefined,
): RecipeVisual {
  if (!categoryKey) {
    return FALLBACK_VISUAL;
  }

  return RECIPE_VISUALS[normalizeCategoryKey(categoryKey)] ?? FALLBACK_VISUAL;
}
