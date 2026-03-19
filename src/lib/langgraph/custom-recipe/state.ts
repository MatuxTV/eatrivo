import { Annotation } from "@langchain/langgraph";
import type { InferSelectModel } from "drizzle-orm";

import type { pantryItems, userInfoTable, userProfiles } from "@/db/schema";
import type {
  CustomRecipeAiOutput,
  CustomRecipePantryContextItem,
  CustomRecipeResult,
  CustomRecipeSuggestion,
} from "@/lib/custom-recipes/contracts";

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
  fallbackSuggestionLimit: Annotation<number>({
    value: (current, update) => (update !== undefined ? update : current),
    default: () => 4,
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
