import type { ShoppingListState } from "../state";
import { apiLogger } from "@/lib/logger";

export async function buildPrompt(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  const {
    userInfo,
    macroTargets,
    shoppingHistory,
    feedbackContext,
    retryCount,
  } = state;

  if (!userInfo || !macroTargets) {
    return { error: "buildPrompt: userInfo or macroTargets is null" };
  }

  const weight = Number(userInfo.weight);

  // ── Season ──
  const currentMonth = new Date().getMonth() + 1;
  const season =
    currentMonth >= 3 && currentMonth <= 5
      ? "jar"
      : currentMonth >= 6 && currentMonth <= 8
        ? "leto"
        : currentMonth >= 9 && currentMonth <= 11
          ? "jeseň"
          : "zima";

  // ── BMI ──
  const heightInMeters = userInfo.height / 100;
  const bmi =
    Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  const bmiCategory =
    bmi < 18.5
      ? "podváha"
      : bmi < 25
        ? "normálna"
        : bmi < 30
          ? "nadváha"
          : "obezita";

  // ── Carb percentage ──
  let carbPercentage: number;
  if (userInfo.goal === "lose_weight") {
    carbPercentage =
      userInfo.activity_level === "athlete" ||
      userInfo.activity_level === "very_active"
        ? 0.35
        : 0.3;
  } else if (userInfo.goal === "gain_muscle") {
    carbPercentage = userInfo.activity_level === "athlete" ? 0.5 : 0.45;
  } else {
    carbPercentage =
      userInfo.activity_level === "athlete" ||
      userInfo.activity_level === "very_active"
        ? 0.45
        : 0.4;
  }

  // ── Protein multiplier ──
  const proteinMultiplier =
    userInfo.goal === "lose_weight"
      ? 1.2
      : userInfo.goal === "gain_muscle"
        ? 2.0
        : 1.6;

  // ── Week dates ──
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const dayOfWeek = now.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + daysUntilSunday);

  const language: "sk" | "en" = userInfo.language === "en" ? "en" : "sk";
  const startDate = weekStart.toLocaleDateString(
    language === "en" ? "en-US" : "sk-SK",
    { month: "long", day: "numeric" },
  );
  const endDate = weekEnd.toLocaleDateString(
    language === "en" ? "en-US" : "sk-SK",
    { month: "long", day: "numeric" },
  );

  const {
    dailyCalories,
    protein: dailyProtein,
    fat: dailyFat,
    carbs: dailyCarbs,
  } = macroTargets;

  // ── History block ──
  let historyBlock = "";
  if (shoppingHistory.length > 0) {
    historyBlock = `
## Predošlé nákupné zoznamy (pre variáciu)
${shoppingHistory.map((h) => `- ${h.title} (${new Date(h.weekStartDate).toLocaleDateString(language === "en" ? "en-US" : "sk")})`).join("\n")}
Zaisti variáciu - nepoužívaj rovnaké jedlá ako minulý týždeň.
`;
  }

  // ── Feedback / retry block ──
  let feedbackBlock = "";
  if (feedbackContext) {
    feedbackBlock = `
## Korekcia (pokus ${retryCount}/3)
${feedbackContext}
Oprav tieto problémy v novom zozname.
`;
  }

  const today = new Date();
  const birthDate = new Date(userInfo.dateOfBirth!);
  let userAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    userAge--;
  }

  const prompt = `Si expert AI nutricionista. Vytvor týždenný nákupný zoznam s presnými množstvami.

📋 PROFIL:
${userInfo.sex === "man" ? "Muž" : "Žena"}, ${userAge}r, ${userInfo.weight}kg, ${userInfo.height}cm (BMI: ${bmi} - ${bmiCategory})
Cieľ: ${userInfo.goal} | Aktivita: ${userInfo.activity_level} | Jedál: ${userInfo.meal_per_day}/deň
Diéta: ${userInfo.diet_preferences || "žiadna"} | Čas: ${userInfo.cooking_time_pref || "normal"} | Budget: ${userInfo.budget_preference}
Obľúbené: ${userInfo.likes || "-"} | Neobľúbené: ${userInfo.dislikes || "-"} | Alergie: ${userInfo.allergies || "-"}

📊 VYPOČÍTANÉ ENERGETICKÉ POTREBY:
Cieľové kalórie: ${dailyCalories} kcal

💪 MAKRONUTRIENTY:
Proteín: ${dailyProtein}g/deň (${proteinMultiplier}g/kg váhy) = ${Math.round(((dailyProtein * 4) / dailyCalories) * 100)}% kalórií
Tuky: ${dailyFat}g/deň = 25% kalórií
Sacharidy: ${dailyCarbs}g/deň = ${Math.round(carbPercentage * 100)}% kalórií (prispôsobené ${userInfo.activity_level})

🎯 7-DŇOVÉ CIELE:
${dailyCalories * 7} kcal | ${dailyProtein * 7}g proteín | ${dailyFat * 7}g tuky | ${dailyCarbs * 7}g sacharidy | ${(userInfo.meal_per_day ?? 3) * 7} jedál

🌡️ ROČNÉ OBDOBIE: ${season.toUpperCase()}
Skus sezónne ovocie a zeleninu (${season}) pre čerstvosť a cenu.Zohladni najblizsi sviatok aby klient zazil pravu atmosferu toho sviatku(napr.Vianoce a pridame punc ci vianocne pecivo)

📅 OBDOBIE NÁKUPU:
Od: ${startDate}
Do: ${endDate}

💡 KONTEXT VÝŠKY A VÁHY:
• Výška ${userInfo.height}cm významne ovplyvňuje BMR (+6.25 kcal za každý cm)
• Osoba s výškou 200cm má o ~220 kcal vyšší BMR než osoba s výškou 165cm (pri rovnakej váhe/veku/pohlaví)
• BMI ${bmi} (${bmiCategory}) ukazuje proporcie tela - ${
    bmi < 18.5
      ? "zvýš porcie, kaloricky husté potraviny"
      : bmi < 25
        ? "vyvážené porcie"
        : bmi < 30
          ? "menšie porcie, viac zeleniny"
          : "menšie porcie, nízkokalorické"
  }

⚙️ PRAVIDLÁ:
1. Presné množstvá na 7 dní
2. Rešpektuj diétu, alergie, obľúbené/neobľúbené
3. Tabuľky s emojis, slovenské názvy, min. 3-4 položky/kategória
4. NAJDOLEZITEJSIE : vystupny prompt bude v jazyku ${language} (en = English || sk = Slovakia)

💰 BUDGET (7-dňový nákup):
**LOW (~30€)**: Vajcia, kuracie stehná/prsia, tuniak konzerva, ryža, ovos, cestoviny, mrazená zelenina, banány, sezónne ovocie, slnečnicový olej
**MEDIUM (~50€)**: Mix kuracie/hovädzie, losos mrazený, cottage cheese, jogurt, basmati/quinoa, mix čerstvé+mrazené zelenina, avokádo, bobuľové ovocie, olivový olej, orechy
**HIGH (~100€)**: Bio/organic produkty, losos čerstvý/údený, morské plody, bio kuracie, quinoa tricolor, čerstvá bio zelenina, šparágla, čerstvé bobuľové ovocie, prémiové orechy, mandľové maslo, avokádový olej

🍽️ ${userInfo.meal_per_day} jedál/deň → ${
    (userInfo.meal_per_day ?? 3) <= 3
      ? "Väčšie porcie"
      : (userInfo.meal_per_day ?? 3) >= 5
        ? "Menšie porcie, rychlé"
        : "Stredné porcie"
  }
🎨 ${userInfo.cooking_time_pref || "normal"} → ${
    userInfo.cooking_time_pref === "quick"
      ? "Mrazené, instant"
      : userInfo.cooking_time_pref === "slow"
        ? "Čerstvé, celé kusy"
        : "Mix"
  }

💡 CIEĽ ${userInfo.goal}:
${
  userInfo.goal === "lose_weight"
    ? "• Viac zeleniny, chudé proteíny, zelený čaj"
    : userInfo.goal === "gain_muscle"
      ? `• ${proteinMultiplier}g proteín/kg, kaloricky husté, protein shaky`
      : "• Vyvážené makro"
}

🥗 DIÉTA ${userInfo.diet_preferences || "žiadna"}:
${
  userInfo.diet_preferences === "vegan"
    ? "⛔ Živočíšne | ✅ Tofu 800g, tempeh 400g, fazuľa 500g, orechy 300g, B12 POVINNE"
    : userInfo.diet_preferences === "vegetarian"
      ? "⛔ Mäso/ryby | ✅ Vajcia 10-15ks, cottage 500g, jogurt 500g, fazuľa 400g"
      : userInfo.diet_preferences === "lactosefree"
        ? "⛔ Laktóza | ✅ Rastlinné mlieka, lactofree jogurty, ghee"
        : userInfo.diet_preferences === "ketogenic"
          ? "✅ Tuky 70%, proteín 20% | ⛔ Sacharidy <10%"
          : userInfo.diet_preferences === "paleolithic"
            ? "✅ Mäso, ryby, vajcia, zelenina, ovocie | ⛔ Obilniny, strukoviny, mliečne"
            : "• Bez obmedzení"
}
${historyBlock}${feedbackBlock}
📝 FORMÁT:

# 🛒 Týždenný nákupný zoznam
**Denný príjem:** ${dailyCalories} kcal • ${dailyProtein}g proteín • ${dailyCarbs}g sacharidy • ${dailyFat}g tuky
**Budget:** ${userInfo.budget_preference} | **Jedál:** ${userInfo.meal_per_day}/deň | **Cieľ:** ${userInfo.goal}
---

## 🥩 Bielkovinové zdroje
| Potravina | Množstvo | Poznámka |

## 🌾 Sacharidové zdroje
| Potravina | Množstvo | Poznámka |

## 🥦 Zelenina
| Potravina | Množstvo | Poznámka |

## 🍓 Ovocie
| Potravina | Množstvo | Poznámka |

## 🌰 Zdravé tuky
| Potravina | Množstvo | Poznámka |

## 🧂 Dochucovadlá
| Potravina | Množstvo | Poznámka |

## 💧 Nápoje
| Nápoj | Množstvo | Poznámka |

## 💊 Doplnky výživy (personalizované)
| Doplnok | Dávka | Kedy | Účel |
|----------|-------|------|------|

**POVINNÉ zahrň podľa profilu:**
• **VEGAN**: Vitamín B12 (1000 mcg/deň), Vitamín D3 (2000 IU), Omega-3 EPA/DHA (alebo ALA z ľanu)
• **VEGETARIAN**: Vitamín B12 (500 mcg/deň), Vitamín D3 (1000 IU)
• **ZIMA (dec-feb)**: Vitamín D3 (2000-4000 IU) - nedostatok slnka
• **LETO (jún-aug)**: Menej D3, viac hydratácia, elektrolyty pri ${
    userInfo.activity_level === "very_active" ||
    userInfo.activity_level === "athlete"
      ? "vysokej aktivite"
      : "aktivite"
  }
• **JAR/JESEŇ**: Vitamín C (500-1000mg), Zinok (15mg) - podpora imunity
• **GAIN_MUSCLE**: Kreatin monohydrát (5g/deň), Protein powder (20-30g), BCAA
• **LOSE_WEIGHT**: Multivitamín (deficit kalórií), Omega-3, Vláknina
• **VYSOKÁ AKTIVITA**: Horčík (300-400mg), Elektrolyty, Koenzým Q10
• **ŽENY**: Železo (pri menštruácii), Kyselina listová
• **MUŽI 40+**: Vitamín D3, Omega-3, Magnézium

**VŽDY odporúč:** Vitamín D3 (všetci), Omega-3 (ak nie je dosť rýb), Multivitamín (pri deficit)

### ✅ Tipy
- 3 konkrétne tipy

---
💰 **Odhadovaná cena:** ${
    userInfo.budget_preference === "low"
      ? "25-35€"
      : userInfo.budget_preference === "medium"
        ? "45-55€"
        : "90-110€"
  } | 🕐 **Čas nákupu:** [XX] min | 📦 **Hmotnosť:** [XX] kg

✅ VALIDÁCIA:
1. Množstvá na 7 dní: ${dailyProtein * 7}g proteín, ${dailyFat * 7}g tuky, ${dailyCarbs * 7}g sacharidy (${Math.round(carbPercentage * 100)}% podľa aktivity)
2. Žiadne alergie/neobľúbené, diéta ${userInfo.diet_preferences || "žiadna"}
3. Budget ${userInfo.budget_preference} (${
    userInfo.budget_preference === "low"
      ? "~30€"
      : userInfo.budget_preference === "medium"
        ? "~50€"
        : "~100€"
  }), min. 3-4 položky/kategória
4. Doplnky: Zohľadni ${season}, ${userInfo.sex === "man" ? "muž" : "žena"}, ${userInfo.goal}, ${userInfo.diet_preferences || "žiadna diéta"}, aktivita ${userInfo.activity_level}
⚡ VÝSTUP: Vráť VÝHRADNE JSON objekt s nasledovnými kľúčmi:
1. "title": Kreatívny a chytľavý názov pre tento nákupný zoznam, ktorý VŽDY obsahuje zadaný počiatočný a koncový dátum z "OBDOBIE NÁKUPU" (napríklad "Nákup: ${startDate} - ${endDate}").
2. "description": Krátky, motivujúci popis k tomuto nákupnému zoznamu (maximálne 2 vety).
3. "markdown": Samotný nákupný zoznam vo formáte Markdown (začni "# 🛒" ako doteraz).
4. "estimatedMacros": Objekt s kľúčmi "totalCalories" (number, denné kcal), "protein" (number, g), "fat" (number, g), "carbs" (number, g) — odhadované skutočné makrá z nakúpených potravín.

Uisti sa, že vrátiš čistý JSON (začni { a skonči }), bez markdown wrapperov (bez \`\`\`json alebo podobne) a nepridávaj žiadny text pred ani za JSON.`;

  apiLogger.info("[buildPrompt] Shopping list prompt built", {
    metadata: {
      userProfileId: state.userProfileId,
      hasHistory: shoppingHistory.length > 0,
      hasFeedback: !!feedbackContext,
      retryCount,
    },
  });

  return { systemPrompt: prompt };
}
