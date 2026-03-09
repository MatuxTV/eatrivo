import { apiLogger } from "@/lib/logger";
import { getPantryAiSuggestions } from "@/lib/pantry/ai-normalization";
import type { PantryBatchState } from "../state";

export async function aiNormalize(
  state: typeof PantryBatchState.State,
): Promise<Partial<typeof PantryBatchState.State>> {
  if (!state.systemPrompt) {
    return { error: "Missing pantry batch prompt." };
  }

  try {
    const aiSuggestions = await getPantryAiSuggestions({
      userProfileId: state.userProfileId,
      systemPrompt: state.systemPrompt,
    });

    apiLogger.info("[pantryBatch.aiNormalize] AI normalization completed", {
      metadata: {
        userProfileId: state.userProfileId,
        suggestionCount: aiSuggestions.length,
      },
    });

    return { aiSuggestions };
  } catch (error) {
    apiLogger.error("[pantryBatch.aiNormalize] AI normalization failed", error, {
      metadata: { userProfileId: state.userProfileId },
    });

    return { aiSuggestions: [] };
  }
}
