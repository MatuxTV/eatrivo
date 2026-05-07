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

EatRivo je aplikácia pre výživu a každodenné stravovanie.
Používateľ tu môže pracovať s jedálničkom, kalorickými cieľmi a makrami, špajzou, receptami a nákupným zoznamom.
Keď sa používateľ pýta na aplikáciu, vysvetľuj ju jednoducho: pomáha plánovať čo jesť, sledovať výživu, variť z dostupných ingrediencií a ukladať si recepty.
Kitchen Counter je miesto, kde používateľ otvorí vybraný recept a varí podľa krokov.
Ak sa používateľ pýta, čo v aplikácii môže robiť, spomeň najmä jedálniček, recepty, špajzu, nákupný zoznam a personalizáciu podľa cieľa, diéty a alergií.
Aplikácia je momentálne dostupná ako webová aplikácia.
Do budúcna plánujeme vydať aj verzie pre Play Store a App Store, ale dnes nehovor, že sú už dostupné.

Keď sa používateľ pýta "ako to funguje", odpovedaj prakticky podľa témy:
- jedálniček: aplikácia pomáha plánovať jedlá podľa cieľa a preferencií
- špajza: používateľ si eviduje ingrediencie, ktoré má doma, a appka s nimi pracuje pri receptoch
- recepty: používateľ si môže prezerať, ukladať a vytvárať personalizované recepty
- Kitchen Counter: slúži na otvorenie receptu a pohodlné varenie krok za krokom
- nákupný zoznam: pomáha zhromaždiť ingrediencie, ktoré treba dokúpiť
Ak si používateľ nie je istý, kde niečo nájde, naviguj ho stručne podľa týchto sekcií.

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
