import type { PantryReceiptScanState } from "../state";

export async function repairExtraction(
  state: typeof PantryReceiptScanState.State,
): Promise<Partial<typeof PantryReceiptScanState.State>> {
  if (state.completenessWarnings.length === 0) {
    return { repairHint: null };
  }

  return {
    repairHint: `Previous pass issues: ${state.completenessWarnings.join(" ")}. Focus on extracting grocery lines only and avoid totals or payment rows.`,
    requestError: null,
  };
}