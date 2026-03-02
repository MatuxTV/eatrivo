import type { ShoppingListState } from "../state";

export async function merger(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  const { shoppingHistory, aiOutput } = state;

  // Ak máme históriu a AI output, skontrolujeme variáciu
  if (shoppingHistory.length > 0 && aiOutput) {
    const currentTitle = aiOutput.title.toLowerCase();
    const hasSimilar = shoppingHistory.some((h) => {
      const historyTitle = h.title.toLowerCase();
      // Jednoduchá kontrola — ak sa title presne zhoduje
      return currentTitle === historyTitle;
    });

    if (hasSimilar) {
      return {
        feedbackContext:
          "Vygenerovaný zoznam je príliš podobný predchádzajúcim. Zaisti väčšiu variáciu jedál a ingrediencií.",
        aiOutput: null,
        retryCount: state.retryCount + 1,
      };
    }
  }

  // virtualPantry je vždy null → deduplikáciu s pantry preskočiť
  return { feedbackContext: null };
}
