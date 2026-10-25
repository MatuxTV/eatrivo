// Pure configuration for AI recipe image generation. No db or network access
// here on purpose — this module is safe to import from anywhere.

export const RECIPE_IMAGE_SIZES = { full: 1024, thumb: 512 } as const;

export type RecipeImageSize = keyof typeof RECIPE_IMAGE_SIZES;

export const DEFAULT_RECIPE_IMAGE_MODEL = "gemini-2.5-flash-image";

export const DEFAULT_MONTHLY_BUDGET_USD = 10;

/** USD per image; unknown models fall back to the most expensive known price. */
export const RECIPE_IMAGE_PRICE_USD: Record<
  string,
  { live: number; batch: number }
> = {
  "gemini-2.5-flash-image": { live: 0.039, batch: 0.0195 },
};

type Env = Record<string, string | undefined>;

export function getRecipeImageModel(env: Env = process.env): string {
  const configured = env.RECIPE_IMAGE_MODEL?.trim();
  return configured ? configured : DEFAULT_RECIPE_IMAGE_MODEL;
}

export function getMonthlyBudgetUsd(env: Env = process.env): number {
  const raw = env.RECIPE_IMAGE_MONTHLY_BUDGET_USD?.trim();
  if (!raw) {
    return DEFAULT_MONTHLY_BUDGET_USD;
  }

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_MONTHLY_BUDGET_USD;
  }

  return parsed;
}

export function getImagePriceUsd(model: string, mode: "live" | "batch"): number {
  const known = RECIPE_IMAGE_PRICE_USD[model];
  if (known) {
    return known[mode];
  }

  const prices = Object.values(RECIPE_IMAGE_PRICE_USD).map((price) => price[mode]);
  return prices.length > 0 ? Math.max(...prices) : 0;
}
