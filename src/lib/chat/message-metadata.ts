import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import type { CustomRecipeGeneratedRecipe } from "@/lib/custom-recipes/contracts";

export type RecipeCreationMealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface RecipeCreationFormDefaults {
  includeProfile: boolean;
  includePantry: boolean;
  includeBrief: boolean;
  servings: number;
  mealType: RecipeCreationMealType;
  mealPrep: boolean;
  initialBrief: string;
}

export interface RecipeCreationFormOption {
  id: "includeProfile" | "includePantry";
  label: string;
  description: string;
  enabledByDefault: boolean;
}

export interface RecipeCreationFormMessageMetadata {
  type: "recipe_creation_form";
  version: 1;
  title: string;
  description: string;
  submitLabel: string;
  options: RecipeCreationFormOption[];
  defaults: RecipeCreationFormDefaults;
}

export interface RecipeCreationResultMessageMetadata {
  type: "recipe_creation_result";
  version: 1;
  recipe: CustomRecipeGeneratedRecipe;
  preview: BasicHomeRecipePreview;
}

export type ChatAssistantMessageMetadata =
  | RecipeCreationFormMessageMetadata
  | RecipeCreationResultMessageMetadata;

export type ChatMessageMetadata = ChatAssistantMessageMetadata | null;

export function isChatAssistantMessageMetadata(
  value: unknown,
): value is ChatAssistantMessageMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { type?: unknown; version?: unknown };
  return typeof candidate.type === "string" && candidate.version === 1;
}