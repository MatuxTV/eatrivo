import type { RecipeIngredientItem } from "@/lib/recipe-ingredients";
import type { RecipeInstruction } from "@/lib/recipe-instructions";

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
}

export interface BasicHomePantrySummary {
  itemCount: number;
  cookableCount: number;
}