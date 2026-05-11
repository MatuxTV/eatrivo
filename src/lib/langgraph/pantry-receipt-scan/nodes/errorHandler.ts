import { apiLogger } from "@/lib/logger";
import type { PantryReceiptScanState } from "../state";

export async function errorHandler(
  state: typeof PantryReceiptScanState.State,
): Promise<Partial<typeof PantryReceiptScanState.State>> {
  apiLogger.error("[pantryReceiptScan.errorHandler] fatal graph error", undefined, {
    metadata: {
      userId: state.userId,
      userProfileId: state.userProfileId,
      fatalError: state.fatalError,
      fatalErrorCode: state.fatalErrorCode,
      retryCount: state.retryCount,
    },
  });

  return {
    fatalError: state.fatalError,
    fatalErrorCode: state.fatalErrorCode,
  };
}