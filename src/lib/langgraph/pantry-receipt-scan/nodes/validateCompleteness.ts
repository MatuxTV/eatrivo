import {
  RECEIPT_SCAN_MAX_RETRIES,
  RECEIPT_SCAN_MAX_UNKNOWN_ITEMS,
  RECEIPT_SCAN_MIN_CONFIDENCE,
} from "../constants";
import type { PantryReceiptScanState } from "../state";

export async function validateCompleteness(
  state: typeof PantryReceiptScanState.State,
): Promise<Partial<typeof PantryReceiptScanState.State>> {
  const warnings: string[] = [];
  const parsedReceipt = state.parsedReceipt;
  const reviewItems = state.reviewItems;

  if (!parsedReceipt || reviewItems.length === 0) {
    const retryCount = state.retryCount + 1;
    return {
      retryCount,
      requestError: "No pantry-ready receipt items were detected.",
      completenessWarnings: ["No usable grocery lines detected."],
      partial: retryCount > RECEIPT_SCAN_MAX_RETRIES,
    };
  }

  const unknownCount = parsedReceipt.unknownLineCount;
  const lowConfidenceCount = reviewItems.filter(
    (item) => item.confidence !== null && item.confidence < RECEIPT_SCAN_MIN_CONFIDENCE,
  ).length;
  const unnamedCount = reviewItems.filter((item) => item.name.trim().length === 0).length;

  if (unknownCount > RECEIPT_SCAN_MAX_UNKNOWN_ITEMS) {
    warnings.push("Too many ambiguous receipt lines detected.");
  }

  if (lowConfidenceCount > Math.max(2, Math.floor(reviewItems.length / 2))) {
    warnings.push("A large portion of detected items has low confidence.");
  }

  if (unnamedCount > 0) {
    warnings.push("Some detected lines are missing item names.");
  }

  if (warnings.length > 0 && state.retryCount < RECEIPT_SCAN_MAX_RETRIES) {
    return {
      retryCount: state.retryCount + 1,
      requestError: "Receipt scan needs another extraction pass.",
      completenessWarnings: warnings,
      partial: false,
    };
  }

  return {
    requestError: null,
    completenessWarnings: warnings,
    partial: warnings.length > 0,
  };
}