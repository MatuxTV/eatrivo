import { AIMessage } from "@langchain/core/messages";

import type { ChatState } from "../state";
import type { RecipeCreationFormMessageMetadata } from "@/lib/chat/message-metadata";

function buildRecipeCreationFormMetadata(
  initialBrief: string,
): RecipeCreationFormMessageMetadata {
  const hasCapturedBrief = initialBrief.trim().length > 0;

  return {
    type: "recipe_creation_form",
    version: 1,
    title: "Recipe Creation",
    description: hasCapturedBrief
      ? "Zachytil som tvoje zadanie zo správy. Vyber len koľko porcií chceš a či mám zohľadniť špajzu alebo profil."
      : "Vyber koľko porcií chceš a či mám zohľadniť špajzu alebo profil. Potom pripravím jeden finálny recept.",
    submitLabel: "Vytvoriť recept",
    options: [
      {
        id: "includeProfile",
        label: "Zohľadni môj profil",
        description: "Alergie, cieľ, diétu a výživový kontext",
        enabledByDefault: true,
      },
      {
        id: "includePantry",
        label: "Zohľadni moju špajzu",
        description: "Použi ingrediencie, ktoré už mám doma",
        enabledByDefault: true,
      },
    ],
    defaults: {
      includeProfile: true,
      includePantry: true,
      includeBrief: true,
      servings: 2,
      mealType: "dinner",
      mealPrep: false,
      initialBrief,
    },
  };
}

export async function recipeCreationEntry(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const lastHumanMessage = [...state.messages]
    .reverse()
    .find((message) => message.getType() === "human");
  const initialBrief =
    typeof lastHumanMessage?.content === "string"
      ? lastHumanMessage.content.trim()
      : "";
  const metadata = buildRecipeCreationFormMetadata(initialBrief);

  return {
    messages: [
      new AIMessage(
        initialBrief
          ? `Rozumiem. Zachytil som tvoje zadanie: ${initialBrief}`
          : "Otvoril som Recipe Creation. Vyber, čo mám zohľadniť, a potom ti pripravím jeden finálny recept.",
      ),
    ],
    assistantMessageMetadata: metadata,
  };
}