import { Annotation } from "@langchain/langgraph";

import type { CustomRecipeGeneratedRecipe } from "@/lib/custom-recipes/contracts";
import type { RecipeCreationMealType } from "@/lib/chat/message-metadata";

export const RecipeCreationState = Annotation.Root({
  userId: Annotation<string>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "",
  }),
  userProfileId: Annotation<string>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "",
  }),
  sessionId: Annotation<string>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "",
  }),
  locale: Annotation<"en" | "sk">({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "sk",
  }),
  includeProfile: Annotation<boolean>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => true,
  }),
  includePantry: Annotation<boolean>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => true,
  }),
  brief: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  servings: Annotation<number>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => 2,
  }),
  mealType: Annotation<RecipeCreationMealType>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "dinner",
  }),
  mealPrep: Annotation<boolean>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => false,
  }),
  generatedRecipe: Annotation<CustomRecipeGeneratedRecipe | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  fatalError: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
});