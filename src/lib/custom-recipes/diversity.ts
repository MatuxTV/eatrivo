import type {
  CustomRecipeGeneratedRecipe,
  CustomRecipeResult,
} from "@/lib/custom-recipes/contracts";

export const CUSTOM_RECIPE_MIN_DIVERSITY = 0.4;
export const CUSTOM_RECIPE_MAX_SIMILARITY = 1 - CUSTOM_RECIPE_MIN_DIVERSITY;

export interface CustomRecipeDiversityCheck {
  previousRecipeName: string;
  candidateRecipeName: string;
  similarityScore: number;
  diversityScore: number;
  passed: boolean;
  componentSimilarity: {
    title: number;
    ingredients: number;
    instructions: number;
    tags: number;
    category: number;
  };
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function unique(values: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(values).filter(Boolean)));
}

function jaccardSimilarity(left: Iterable<string>, right: Iterable<string>): number {
  const leftSet = new Set(unique(left));
  const rightSet = new Set(unique(right));

  if (leftSet.size === 0 && rightSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const value of leftSet) {
    if (rightSet.has(value)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function getRecipeIngredientFingerprint(recipe: CustomRecipeGeneratedRecipe): string[] {
  return recipe.ingredientItems.map((ingredient) => {
    const preferredKey =
      ingredient.ingredientSpecificKey ??
      ingredient.ingredientKey ??
      ingredient.pantryMatchName ??
      ingredient.name;

    return normalizeTokens(preferredKey).join(" ");
  });
}

function getRecipeInstructionFingerprint(recipe: CustomRecipeGeneratedRecipe): string[] {
  return recipe.instructions.flatMap((instruction) =>
    normalizeTokens(`${instruction.title} ${instruction.text}`),
  );
}

function getRecipeTitleFingerprint(recipe: CustomRecipeGeneratedRecipe): string[] {
  return normalizeTokens(recipe.name);
}

function getRecipeTagFingerprint(recipe: CustomRecipeGeneratedRecipe): string[] {
  return recipe.tags.flatMap((tag) => normalizeTokens(tag));
}

function getRecipeCategoryFingerprint(recipe: CustomRecipeGeneratedRecipe): string[] {
  return normalizeTokens(recipe.category);
}

export function getLatestGeneratedCustomRecipe(
  result: CustomRecipeResult | null | undefined,
): CustomRecipeGeneratedRecipe | null {
  if (!result) {
    return null;
  }

  if (result.pantryRecipe.status === "available") {
    return result.pantryRecipe;
  }

  if (result.almostCookableRecipe.status === "available") {
    return result.almostCookableRecipe;
  }

  return null;
}

export function buildPreviousRecipePromptContext(
  recipe: CustomRecipeGeneratedRecipe,
): string {
  const ingredientPreview = recipe.ingredientItems
    .slice(0, 8)
    .map((ingredient) => ingredient.name)
    .join(", ");
  const instructionPreview = recipe.instructions
    .slice(0, 3)
    .map((instruction, index) => {
      const title = instruction.title.trim();
      const prefix = title ? `${title}: ` : "";
      return `${index + 1}. ${prefix}${instruction.text}`;
    })
    .join(" ");

  return [
    `- Previous recipe name: ${recipe.name}`,
    `- Category: ${recipe.category}`,
    `- Tags: ${recipe.tags.join(", ") || "none"}`,
    `- Ingredients: ${ingredientPreview || "none"}`,
    `- Method preview: ${instructionPreview || "none"}`,
  ].join("\n");
}

export function evaluateCustomRecipeDiversity(
  previousRecipe: CustomRecipeGeneratedRecipe,
  candidateRecipe: CustomRecipeGeneratedRecipe,
): CustomRecipeDiversityCheck {
  const componentSimilarity = {
    title: jaccardSimilarity(
      getRecipeTitleFingerprint(previousRecipe),
      getRecipeTitleFingerprint(candidateRecipe),
    ),
    ingredients: jaccardSimilarity(
      getRecipeIngredientFingerprint(previousRecipe),
      getRecipeIngredientFingerprint(candidateRecipe),
    ),
    instructions: jaccardSimilarity(
      getRecipeInstructionFingerprint(previousRecipe),
      getRecipeInstructionFingerprint(candidateRecipe),
    ),
    tags: jaccardSimilarity(
      getRecipeTagFingerprint(previousRecipe),
      getRecipeTagFingerprint(candidateRecipe),
    ),
    category: jaccardSimilarity(
      getRecipeCategoryFingerprint(previousRecipe),
      getRecipeCategoryFingerprint(candidateRecipe),
    ),
  };

  const similarityScore = Math.min(
    1,
    componentSimilarity.title * 0.1 +
      componentSimilarity.ingredients * 0.55 +
      componentSimilarity.instructions * 0.2 +
      componentSimilarity.tags * 0.1 +
      componentSimilarity.category * 0.05,
  );
  const diversityScore = Math.max(0, 1 - similarityScore);

  return {
    previousRecipeName: previousRecipe.name,
    candidateRecipeName: candidateRecipe.name,
    similarityScore,
    diversityScore,
    passed: diversityScore >= CUSTOM_RECIPE_MIN_DIVERSITY,
    componentSimilarity,
  };
}