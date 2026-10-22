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

  const visible =
    ingredients.length > 0 ? ingredients.join(", ") : "the main ingredients";

  return [
    `Top-down overhead photo of ${input.nameEn}, ${resolveServingPhrase(input.categoryKey)} on a light neutral stone surface, soft natural daylight from the left, shallow shadows, realistic home-cooked food, appetizing, true-to-life colors.`,
    `Clearly visible: ${visible}.`,
    "No text, no labels, no logos, no hands, no people, no cutlery clutter, no extra dishes.",
    "Square 1:1 composition, dish centered, fills about 70% of the frame.",
  ].join(" ");
}
