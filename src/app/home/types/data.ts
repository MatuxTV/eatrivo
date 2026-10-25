import type { RecipeIngredientItem } from "@/lib/recipes/recipe-ingredients";
import type { RecipeInstruction } from "@/lib/recipes/recipe-instructions";

export interface BasicHomeRecipePreview {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryKey: string;
  servings: number;
  totalTimeMin: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  restrictionFlags: string[];
  instructions: RecipeInstruction[];
  dietTags: string[];
  ingredientItems: RecipeIngredientItem[];
  ingredientPreview: string[];
  matchedIngredients?: {
    recipeIngredientName: string;
    pantryIngredientName: string | null;
    matchType: "exact" | "fallback";
    displayName: string;
    amount: string | null;
  }[];
  mealPrepFriendly: boolean;
  missingIngredients?: string[];
  /** Cover photo (1024px); null/undefined → placeholder tile. */
  imageUrl?: string | null;
  /** Cover photo thumbnail (512px) for cards. */
  imageThumbUrl?: string | null;
  /** A cover photo is being generated in the background (Rivo recipes). */
  imagePending?: boolean;
}

export interface BasicHomePantrySummary {
  itemCount: number;
  cookableCount: number;
}

export interface RecipeBrowseAvailableFilters {
  categoryKeys: string[];
  dietTags: string[];
}