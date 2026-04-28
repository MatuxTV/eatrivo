import type { PantryReceiptScanState } from "../state";

export async function finalizeReviewPayload(
  state: typeof PantryReceiptScanState.State,
): Promise<Partial<typeof PantryReceiptScanState.State>> {
  return {
    reviewItems: state.reviewItems,
    partial: state.partial,
    completenessWarnings: state.completenessWarnings,
  };
}