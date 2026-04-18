import { Annotation } from "@langchain/langgraph";
import type { InferSelectModel } from "drizzle-orm";
import type { userProfiles, userInfoTable } from "@/db/schema";
import type {
  MacroTargets,
  ShoppingHistoryItem,
  AiShoppingOutput,
} from "./types";
import type { PantryItem } from "./nodes/inventoryScan";

export const ShoppingListState = Annotation.Root({
  // Identity
  userId: Annotation<string>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => "",
  }),
  userProfileId: Annotation<string>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => "",
  }),

  // Profile data
  userProfile: Annotation<InferSelectModel<typeof userProfiles> | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
  userInfo: Annotation<InferSelectModel<typeof userInfoTable> | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  // Macro targets (computed)
  macroTargets: Annotation<MacroTargets | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  // Pantry health (future use)
  pantryHealthy: Annotation<boolean>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => true,
  }),
  expiredItems: Annotation<string[]>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => [],
  }),
  virtualPantry: Annotation<PantryItem[] | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  // Shopping history
  shoppingHistory: Annotation<ShoppingHistoryItem[]>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => [],
  }),

  // Prompt & AI
  systemPrompt: Annotation<string | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
  feedbackContext: Annotation<string | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
  retryCount: Annotation<number>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => 0,
  }),
  aiOutput: Annotation<AiShoppingOutput | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  // Saved results
  savedShoppingList: Annotation<unknown>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
  savedMealPlan: Annotation<unknown>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  // Error handling
  error: Annotation<string | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
});
