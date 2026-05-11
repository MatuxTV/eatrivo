import { Annotation } from "@langchain/langgraph";
import type { InferSelectModel } from "drizzle-orm";

import type { pantryItems, userInfoTable, userProfiles } from "@/db/schema";
import type { ReceiptScanReviewItem } from "@/lib/pantry/receipt-scan-contracts";
import type { ReceiptScanAiOutput } from "./types";

export const PantryReceiptScanState = Annotation.Root({
  userId: Annotation<string>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => "",
  }),
  userProfileId: Annotation<string>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => "",
  }),
  fileName: Annotation<string>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => "receipt-upload",
  }),
  mimeType: Annotation<"image/jpeg" | "image/png" | "image/webp">({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => "image/jpeg",
  }),
  imageBase64: Annotation<string>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => "",
  }),
  locale: Annotation<string>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => "sk",
  }),
  userProfile: Annotation<InferSelectModel<typeof userProfiles> | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  userInfo: Annotation<InferSelectModel<typeof userInfoTable> | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  currentPantry: Annotation<InferSelectModel<typeof pantryItems>[]>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => [],
  }),
  rawAiOutput: Annotation<string | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  parsedReceipt: Annotation<ReceiptScanAiOutput | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  reviewItems: Annotation<ReceiptScanReviewItem[]>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => [],
  }),
  completenessWarnings: Annotation<string[]>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => [],
  }),
  repairHint: Annotation<string | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  retryCount: Annotation<number>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => 0,
  }),
  partial: Annotation<boolean>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => false,
  }),
  requestError: Annotation<string | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  fatalError: Annotation<string | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
  fatalErrorCode: Annotation<string | null>({
    value: (left, right) => (right !== undefined ? right : left),
    default: () => null,
  }),
});