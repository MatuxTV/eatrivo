import { Annotation } from "@langchain/langgraph";
import type { InferSelectModel } from "drizzle-orm";

import type { pantryItems, userInfoTable, userProfiles } from "@/db/schema";
import type {
  CustomRecipeAiOutput,
  CustomRecipeGeneratedRecipe,
  CustomRecipeMode,
  CustomRecipeStartRequest,
  CustomRecipePantryContextItem,
  CustomRecipeResult,
  CustomRecipeSuggestion,
} from "@/lib/custom-recipes/contracts";
import type { CustomRecipeDiversityCheck } from "@/lib/custom-recipes/diversity";
import type { CustomRecipeUnitSemanticAudit, CustomRecipeValidationErrorType } from "@/lib/custom-recipes/unit-validation";

export const CustomRecipeState = Annotation.Root({
  userId: Annotation<string>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "",
  }),
  userProfileId: Annotation<string>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "",
  }),
  locale: Annotation<"en" | "sk">({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "en",
  }),
  mode: Annotation<CustomRecipeMode>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "pantry",
  }),
  fallbackSuggestionLimit: Annotation<number>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => 4,
  }),
  requestedServings: Annotation<CustomRecipeStartRequest["servings"]>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => 2,
  }),
  requestedMealType: Annotation<CustomRecipeStartRequest["mealType"]>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => "dinner",
  }),
  requestedMealPrep: Annotation<CustomRecipeStartRequest["mealPrep"]>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => false,
  }),

  userProfile: Annotation<InferSelectModel<typeof userProfiles> | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  userInfo: Annotation<InferSelectModel<typeof userInfoTable> | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  pantryRows: Annotation<CustomRecipePantryContextItem[]>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => [],
  }),
  previousGeneratedRecipe: Annotation<CustomRecipeGeneratedRecipe | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  previousGeneratedRecipeJobId: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  diversityCheck: Annotation<CustomRecipeDiversityCheck | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  unitSemanticAudit: Annotation<CustomRecipeUnitSemanticAudit | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  pantryItemCount: Annotation<number>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => 0,
  }),
  pantryIngredientKeyCount: Annotation<number>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => 0,
  }),
  rawAiOutput: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  parsedAiOutput: Annotation<CustomRecipeAiOutput | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  fallbackSuggestions: Annotation<CustomRecipeSuggestion[]>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => [],
  }),
  fallbackSuggestionsFetched: Annotation<boolean>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => false,
  }),
  finalResult: Annotation<CustomRecipeResult | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  retryCount: Annotation<number>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => 0,
  }),
  requestError: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  validationErrorType: Annotation<CustomRecipeValidationErrorType | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  fatalError: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
  fatalErrorCode: Annotation<string | null>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => null,
  }),
});

export type CustomRecipeRow = InferSelectModel<typeof pantryItems>;
