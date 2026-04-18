import { apiLogger } from "@/lib/logger";
import { buildPantryNormalizationPrompt } from "@/lib/pantry/ai-normalization";
import type { PantryBatchState } from "../state";

export async function buildPrompt(
  state: typeof PantryBatchState.State,
): Promise<Partial<typeof PantryBatchState.State>> {
  if (!state.userProfile) {
    return { error: "Missing user profile context." };
  }

  const systemPrompt = await buildPantryNormalizationPrompt({
    locale: state.locale,
    currentPantry: state.currentPantry,
    pendingItems: state.pendingItems,
  });

  apiLogger.info("[pantryBatch.buildPrompt] built prompt", {
    metadata: {
      userProfileId: state.userProfileId,
      promptLength: systemPrompt.length,
      pantryCount: state.currentPantry.length,
      pendingCount: state.pendingItems.length,
    },
  });

  return { systemPrompt };
}
