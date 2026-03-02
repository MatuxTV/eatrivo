import { apiLogger } from "@/lib/logger";
import type { ShoppingListState } from "../state";

export async function errorHandler(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  apiLogger.error("[ShoppingListGraph] Error handler reached", undefined, {
    metadata: {
      error: state.error,
      userId: state.userId,
      userProfileId: state.userProfileId,
      retryCount: state.retryCount,
    },
  });

  return { error: state.error };
}
