import { guessFoodCategory, normalizeUnit } from "@/lib/ingredients/units";
import type { ReceiptScanReviewItem } from "@/lib/pantry/receipt-scan-contracts";
import type { PantryReceiptScanState } from "../state";

function createReviewId(name: string, index: number): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "item"}-${index + 1}`;
}

export async function mapReceiptItems(
  state: typeof PantryReceiptScanState.State,
): Promise<Partial<typeof PantryReceiptScanState.State>> {
  const parsedReceipt = state.parsedReceipt;
  if (!parsedReceipt) {
    return { requestError: "Missing extracted receipt payload." };
  }

  const reviewItems: ReceiptScanReviewItem[] = parsedReceipt.items.map((item, index) => ({
    id: createReviewId(item.name, index),
    name: item.name,
    quantity: item.quantity,
    unit: item.unit ? normalizeUnit(item.unit) : null,
    category: item.category?.trim() || guessFoodCategory(item.name),
    expiryDate: null,
    confidence: item.confidence,
    source: "detected",
    needsReview: !item.confidence || item.confidence < 0.7 || item.quantity === null,
  }));

  return {
    reviewItems,
    requestError: null,
  };
}