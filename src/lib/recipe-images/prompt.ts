// Deterministic prompt builder for AI recipe photos. One fixed style so every
// generated image looks like it came from the same food-photography set.

function resolveServingPhrase(categoryKey?: string | null): string {
  const key = (categoryKey ?? "").trim().toLowerCase();
  if (!key) {
    return "a single plated serving";
  }

  if (key.includes("smoothie")) {
    return "a single serving in a clear glass";
  }

  if (key.includes("breakfast") || key.includes("brunch")) {
    return "a single plated breakfast serving";
  }

  if (
    key.includes("dessert") ||
    key.includes("treat") ||
    key.includes("sweet")
  ) {
    return "a single plated dessert serving";
  }

  return "a single plated serving";
}

export function buildRecipeImagePrompt(input: {
  nameEn: string;
  mainIngredients: string[];
  categoryKey?: string | null;
}): string {
  const ingredients = input.mainIngredients
    .map((ingredient) => ingredient.trim())
    .filter((ingredient) => ingredient.length > 0)
    .slice(0, 6);

  const madeWith =
    ingredients.length > 0
      ? `The finished dish is made with ${ingredients.join(", ")}; show only the cooked dish, not the raw ingredients.`
      : "Show only the finished, cooked dish.";

  return [
    `Top-down overhead photo of ${input.nameEn}, ${resolveServingPhrase(input.categoryKey)} on a light neutral stone surface, soft natural daylight from the left, shallow shadows, realistic home-cooked food, appetizing, true-to-life colors.`,
    madeWith,
    "No text, no labels, no captions, no lettering, no logos, no packaging, no bottles, no hands, no people, no cutlery clutter, no extra dishes or bowls of ingredients.",
    "Square 1:1 composition, dish centered, fills about 70% of the frame.",
  ].join(" ");
}
