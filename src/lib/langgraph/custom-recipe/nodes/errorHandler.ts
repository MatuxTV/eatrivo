import { apiLogger } from "@/lib/logger";
import type { CustomRecipeState } from "../state";

export async function errorHandler(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  apiLogger.error("[customRecipe.errorHandler] fatal graph error", undefined, {
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
