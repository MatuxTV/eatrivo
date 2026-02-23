import type { ChatState } from "../state";
import { logger } from "@/lib/logger";

export async function buildPrompt(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const {
    userProfile,
    userInfo,
    intent,
    todaysPlan,
    macroTargets,
    pantryItems,
  } = state;

  const name = userProfile?.fullName?.split(" ")[0] ?? "kamarát";
  const goal = userInfo?.goal?.replace("_", " ") ?? "zdravší životný štýl";
  const diet =
    userInfo?.diet_preferences && userInfo.diet_preferences !== "none"
      ? userInfo.diet_preferences
      : "žiadna špeciálna";
  const allergies = userInfo?.allergies ?? "žiadne";

  let contextBlock = "";

  if ((intent === "meal_swap" || intent === "recipe") && todaysPlan?.meals) {
    // Skrátiť na 1500 znakov — nechceme premíňať tokeny na celý JSON
    contextBlock += `\nDnešný jedálny plán (JSON): ${JSON.stringify(todaysPlan.meals).slice(0, 1500)}`;
  }

  if (intent === "macros" && macroTargets) {
    contextBlock += `\nCieľové makrá: ${macroTargets.dailyCalories} kcal`;
    contextBlock += ` | Bielkoviny: ${macroTargets.protein}g`;
    contextBlock += ` | Tuky: ${macroTargets.fat}g`;
    contextBlock += ` | Sacharidy: ${macroTargets.carbs}g`;
    contextBlock += `\nBMR: ${macroTargets.bmr} kcal | TDEE: ${macroTargets.tdee} kcal`;
  }

  if (intent === "pantry" && pantryItems && pantryItems.length > 0) {
    contextBlock += `\nV špajzi má: ${pantryItems.map((p) => p.name).join(", ")}`;
  }

  const systemPrompt =
    `Si Rivo — priateľský AI výživový asistent aplikácie EatRivo.
Hovoríš po slovensky (alebo v jazyku, v ktorom sa používateľ pýta).
Si empatický, motivačný a konkrétny. Nikdy nevymýšľaš medicínske diagnózy.
Ak si nie si istý, odporuč konzultáciu s odborníkom.
Odpovedáš stručne (max 3-4 vety) pokiaľ sa nepýtajú na detail.

Kontext používateľa:
- Meno: ${name}
- Cieľ: ${goal}
- Diéta: ${diet}
- Alergény: ${allergies}
${contextBlock}`.trim();

  logger.info(`[buildPrompt] Built prompt for user`, {
    metadata: {
      intent,
      name,
      hasContextBlock: !!contextBlock,
      contextBlockLength: contextBlock.length,
    },
  });

  return {
    systemPrompt: systemPrompt,
  };
}
