import { Annotation } from "@langchain/langgraph";
import type { InferSelectModel } from "drizzle-orm";

import type { pantryItems, userInfoTable, userProfiles } from "@/db/schema";
import type {
  PantryBatchInputItem,
  PantryBatchProcessedItem,
  PantryBatchSuggestion,
} from "./types";

export const PantryBatchState = Annotation.Root({
  userId: Annotation<string>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => "",
  }),
  userProfileId: Annotation<string>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => "",
  }),
  userProfile: Annotation<InferSelectModel<typeof userProfiles> | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  userInfo: Annotation<InferSelectModel<typeof userInfoTable> | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  locale: Annotation<string>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => "sk",
  }),
  pendingItems: Annotation<PantryBatchInputItem[]>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => [],
  }),
  currentPantry: Annotation<InferSelectModel<typeof pantryItems>[]>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => [],
  }),
  systemPrompt: Annotation<string | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  aiSuggestions: Annotation<PantryBatchSuggestion[]>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => [],
  }),
  processedItems: Annotation<PantryBatchProcessedItem[]>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => [],
  }),
  insertedCount: Annotation<number>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => 0,
  }),
  updatedCount: Annotation<number>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => 0,
  }),
  skippedCount: Annotation<number>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => 0,
  }),
  error: Annotation<string | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
});
