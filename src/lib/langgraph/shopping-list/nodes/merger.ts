import type { ShoppingListState } from "../state";
import { apiLogger } from "@/lib/logger";

export async function merger(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  const { shoppingHistory, aiOutput } = state;

  apiLogger.info("[merger] start", { metadata: { userProfileId: state.userProfileId, hasHistory: shoppingHistory.length > 0, hasAiOutput: !!aiOutput } });

  // Ak máme históriu a AI output, skontrolujeme variáciu
  if (shoppingHistory.length > 0 && aiOutput) {
    const currentTitle = aiOutput.title.toLowerCase();
    const hasSimilar = shoppingHistory.some((h) => {
      const historyTitle = h.title.toLowerCase();
      // Jednoduchá kontrola — ak sa title presne zhoduje
      return currentTitle === historyTitle;
    });

    if (hasSimilar) {
      apiLogger.warn("[merger] duplicate title detected, triggering retry", {
        metadata: { userProfileId: state.userProfileId, title: aiOutput.title, retryCount: state.retryCount + 1 },
      });
      return {
        feedbackContext:
          "Vygenerovaný zoznam je príliš podobný predchádzajúcim. Zaisti väčšiu variáciu jedál a ingrediencií.",
        aiOutput: null,
        retryCount: state.retryCount + 1,
      };
    }
  }

  // virtualPantry je vždy null → deduplikáciu s pantry preskočiť
  apiLogger.info("[merger] PASS — no duplicates found", { metadata: { userProfileId: state.userProfileId } });
  return { feedbackContext: null };
}
