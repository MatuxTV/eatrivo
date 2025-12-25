// src/lib/langchain.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { apiLogger } from "./logger";

interface UserProfile {
  dateofBirth: Date;
  weight: number;
  height: number;
  sex: "man" | "woman";
  goal: "lose_weight" | "gain_muscle" | "maintain_weight";
  activityLevel:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "athlete";
  mealsPerDay: number;
  maxPrepTime: "quick" | "normal" | "slow";
  dietType?:
    | "none"
    | "lactosefree"
    | "vegetarian"
    | "vegan"
    | "pescatarian"
    | "ketogenic"
    | "paleolithic";
  budget: "low" | "medium" | "high";
  likedFoods: string;
  dislikedFoods: string;
  allergies: string;
  language:"sk"|"en";
}

interface ShoppingData {
  markdown: string;
}

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  maxOutputTokens: 150000,
  temperature: 0.7,
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

interface ShoppingListUserInfo {
  sex: "man" | "woman";
  dateOfBirth: Date;
  height: number;
  weight: number;
  activity_level:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "athlete";
  goal: "lose_weight" | "maintain_weight" | "gain_muscle";
  meal_per_day: number;
  cooking_time_pref?: "quick" | "normal" | "slow";
  diet_preferences?:
    | "none"
    | "lactosefree"
    | "vegetarian"
    | "vegan"
    | "pescatarian"
    | "ketogenic"
    | "paleolithic";
  budget_preference: "low" | "medium" | "high";
  likes?: string;
  dislikes?: string;
  allergies?: string;
  language?:string;
}

export class EatrivoAIService {
  private static getErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      const anyError = error as unknown as {
        cause?: unknown;
        attemptNumber?: unknown;
        retriesLeft?: unknown;
      };

      const cause = anyError.cause;
      const causeDetails =
        cause instanceof Error
          ? { name: cause.name, message: cause.message }
          : typeof cause === "object" && cause !== null
            ? cause
            : cause;

      return {
        name: error.name,
        message: error.message,
        attemptNumber: anyError.attemptNumber,
        retriesLeft: anyError.retriesLeft,
        cause: causeDetails,
      };
    }

    return { error };
  }

  private static extractJSON(content: string): string {
    // Pokus 1: Odstráň markdown wrapper
    let cleaned = content
      .replace(/```(?:json|JSON)?\s*/g, "")
      .replace(/```\s*$/g, "")
      .trim();

    // Pokus 2: Ak stále začína s ```
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/```$/, "")
        .trim();
    }

    // Pokus 3: Nájdi prvý { a posledný }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned;
  }

  static async generateWeeklyMealPlan(
    userProfile: UserProfile,
    shoppingListData: ShoppingData
  ) {
    try {
      if (!process.env.GOOGLE_AI_API_KEY) {
        apiLogger.error("GOOGLE_AI_API_KEY is not set", undefined, {
          context: "LangChain",
        });
        throw new Error("GOOGLE_AI_API_KEY is not set");
      }

      const userAge =
        new Date().getFullYear() -
        new Date(userProfile.dateofBirth).getFullYear();
      const totalMeals = userProfile.mealsPerDay * 7;

      // Realistic protein: 1.2g/kg for normal goals, 2g/kg for muscle gain
      const proteinMultiplier = userProfile.goal === "gain_muscle" ? 2.0 : 1.2;
      const dailyProtein = Math.round(userProfile.weight * proteinMultiplier);

      // Calculate BMI for context
      const heightInMeters = userProfile.height / 100;
      const bmi =
        Math.round(
          (userProfile.weight / (heightInMeters * heightInMeters)) * 10
        ) / 10;
      const bmiCategory =
        bmi < 18.5
          ? "podváha"
          : bmi < 25
          ? "normálna"
          : bmi < 30
          ? "nadváha"
          : "obezita";

      const prompt = `Si expert AI nutricionista. Vytvor personalizovaný 7-dňový jedálny plán (Pondelok–Nedeľa) VÝHRADNE z poskytnutého nákupného zoznamu.
JAZYK:
Vysledok bude v jazyku = ${userProfile.language}

📋 PROFIL:
${userProfile.sex === "man" ? "Muž" : "Žena"}, ${userAge}r, ${
        userProfile.weight
      }kg, ${userProfile.height}cm (BMI: ${bmi} - ${bmiCategory})
Cieľ: ${userProfile.goal} | Aktivita: ${userProfile.activityLevel} | Jedál: ${
        userProfile.mealsPerDay
      }/deň
Diéta: ${userProfile.dietType || "žiadna"} | Čas: ${
        userProfile.maxPrepTime
      } | Budget: ${userProfile.budget}
Obľúbené: ${userProfile.likedFoods || "-"} | Neobľúbené: ${
        userProfile.dislikedFoods || "-"
      } | Alergie: ${userProfile.allergies || "-"}

💡 VÝŠKA & VÁHA KONTEXT:
• Výška ${userProfile.height}cm + váha ${
        userProfile.weight
      }kg = BMI ${bmi} (${bmiCategory})
• Vyššie osoby (napr. 200cm) potrebujú viac kalórií než nižšie (165cm) pri rovnakej váhe - výška priamo ovplyvňuje BMR
• ${
        bmi < 18.5
          ? "Pri podváhe: Väčšie porcie, kaloricky husté potraviny"
          : bmi < 25
          ? "Normálna váha: Vyvážené porcie"
          : bmi < 30
          ? "Nadváha: Primerane menšie porcie, viac zeleniny"
          : "Obezita: Výrazne menšie porcie, nízkokalorické potraviny"
      }

🛒 NÁKUP:
${shoppingListData.markdown}

⚙️ PRAVIDLÁ:
1. LEN ingrediencie z nákupu
2. Rešpektuj diétu, alergie, obľúbené/neobľúbené
3. Čas: quick≤15min, normal 15-30min, slow 30-45min
4. ${userProfile.mealsPerDay} jedál/deň, 2-8 ingrediencií/jedlo, slovenské názvy
5. Bielkoviny: ${dailyProtein}g/deň (${proteinMultiplier}g/kg)
6. NAJDOLEZITEJSIE : vystupny prompt bude v jazyku ${userProfile.language} (en = English || sk = Slovakia)

🎯 MEAL_TYPE (${userProfile.mealsPerDay}/deň):
${
  userProfile.mealsPerDay === 3
    ? "raňajky, obed, večera"
    : userProfile.mealsPerDay === 4
    ? "raňajky, desiata, obed, večera"
    : userProfile.mealsPerDay === 5
    ? "raňajky, desiata, obed, olovrant, večera"
    : "raňajky, desiata, obed, olovrant, večera, druhá večera"
}

⚠️ TYPY:
• meal: calories/protein/carbs/fat = NUMBER
• day: totalDaily... = STRING s jednotkou
• ingredient: amount = STRING s jednotkou, type = protein|carb|fat|vegetable|fruit|seasoning

📊 JSON: {"week": [{"day": "Pondelok", "totalDailyCalories": "1800 kcal", "totalDailyProtein": "90 g", "totalDailyCarbs": "180 g", "totalDailyFats": "60 g", "meals": [{"name": "Ovsená kaša", "meal_type": "raňajky", "prepTime": 10, "difficulty": "ľahké", "calories": 400, "protein": 25, "carbs": 50, "fat": 10, "ingredients": [{"name": "Ovos", "amount": "60 g", "type": "carb"}], "ingredientCount": 3}]}]}

📈 CIELE:
• ${totalMeals} jedál (${userProfile.mealsPerDay}/deň × 7)
• Bielkoviny: ${dailyProtein}g/deň (${proteinMultiplier}g/kg)
• Kalórie podľa cieľa a aktivity:
  - lose_weight: TDEE - deficit (sedentary -300 kcal | lightly -280 | moderate -260 | very active -240 | athlete -220)
  - maintain_weight: TDEE (udržanie)
  - gain_muscle: TDEE +15% (rast)
• Makro rozdelenie:
  - lose_weight: Proteín ${proteinMultiplier}g/kg, Tuky 25%, Sacharidy 30-35% (znížené pre deficit)
  - maintain_weight: Proteín ${proteinMultiplier}g/kg, Tuky 25%, Sacharidy 40-45%
  - gain_muscle: Proteín 2g/kg, Tuky 25%, Sacharidy 45-50% (zvýšené pre energiu)

💡 STRATÉGIE:
• Difficulty: ľahké(≤2 kroky), stredne(3-5), náročné(6+)
• Chýbajúca surovina → alternatíva z nákupu
• Vegan → B12 + omega-3
• lose_weight → viac zeleniny | gain_muscle → viac proteínu

✅ VALIDÁCIA:
1. Meal nutričné hodnoty = NUMBER, day totals = STRING
2. 7 dní, ${userProfile.mealsPerDay} meals/deň, 2-8 ingrediencií
3. LEN ingrediencie z nákupu
4. Žiadne alergie/neobľúbené
5. Proteín ~${dailyProtein}g/deň

⚡ VÝSTUP: Vráť VÝHRADNE čistý JSON objekt. Začni {, skonči }. Žiadny markdown wrapper, žiadne \`\`\`json, žiadne komentáre, žiadny text pred/po JSON.`;

      const response = await model.invoke([new HumanMessage(prompt)]);

      // Spracuj odpoveď
      let contentText: string;
      if (typeof response.content === "string") {
        contentText = response.content;
      } else if (Array.isArray(response.content)) {
        contentText = response.content
          .filter(
            (part): part is { type: string; text: string } =>
              typeof part === "object" && part !== null && "text" in part
          )
          .map((part) => part.text)
          .join("");
      } else {
        contentText = JSON.stringify(response.content);
      }

      contentText = this.extractJSON(contentText);

      return JSON.parse(contentText);
    } catch (error) {
      apiLogger.error("Error generating meal plan", error, {
        context: "LangChain",
        metadata: {
          model: "gemini-2.5-flash",
          hasApiKey: Boolean(process.env.GOOGLE_AI_API_KEY),
          promptChars: typeof shoppingListData?.markdown === "string" ? shoppingListData.markdown.length : undefined,
          errorDetails: this.getErrorDetails(error),
        },
      });
      throw new Error("Failed to generate AI meal plan");
    }
  }

  static async generateShoppingList(userInfo: ShoppingListUserInfo) {
    try {
      if (!process.env.GOOGLE_AI_API_KEY) {
        apiLogger.error("GOOGLE_AI_API_KEY is not set", undefined, {
          context: "LangChain",
        });
        throw new Error("GOOGLE_AI_API_KEY is not set");
      }

      const userAge =
        new Date().getFullYear() - new Date(userInfo.dateOfBirth).getFullYear();

      let bmr;
      if (userInfo.sex === "man") {
        bmr =
          10 * Number(userInfo.weight) +
          6.25 * userInfo.height -
          5 * userAge +
          5;
      } else {
        bmr =
          10 * Number(userInfo.weight) +
          6.25 * userInfo.height -
          5 * userAge -
          161;
      }

      const activityMultipliers = {
        sedentary: 1,
        lightly_active: 1.175,
        moderately_active: 1.35,
        very_active: 1.52,
        athlete: 1.7,
      };

      const tdee = bmr * activityMultipliers[userInfo.activity_level];

      // Optimized calorie calculation based on goal and activity level
      let dailyCalories;
      if (userInfo.goal === "lose_weight") {
        // For weight loss: Deficit adjusted by activity level
        const deficitByActivity = {
          sedentary: 300, // Less active = can handle bigger deficit
          lightly_active: 280,
          moderately_active: 260,
          very_active: 240,
          athlete: 220, // Very active = smaller deficit to maintain performance
        };
        const deficit = deficitByActivity[userInfo.activity_level];
        dailyCalories = Math.round(tdee - deficit);
      } else if (userInfo.goal === "gain_muscle") {
        // For muscle gain: TDEE + 15%
        dailyCalories = Math.round(tdee * 1.15);
      } else {
        // Maintain weight: TDEE
        dailyCalories = Math.round(tdee);
      }
      // Realistic protein: 1.2g/kg for normal goals, 2g/kg for muscle gain
      const proteinMultiplier = userInfo.goal === "gain_muscle" ? 2.0 : 1.2;
      const dailyProtein = Math.round(
        Number(userInfo.weight) * proteinMultiplier
      );
      const dailyFat = Math.round((dailyCalories * 0.25) / 9);

      // Optimized carbs calculation: Lower for weight loss, higher for muscle gain/athletes
      let carbPercentage;
      if (userInfo.goal === "lose_weight") {
        // Weight loss: 30-35% carbs (lower to create better deficit)
        carbPercentage = userInfo.activity_level === "athlete" || userInfo.activity_level === "very_active" 
          ? 0.35 
          : 0.30;
      } else if (userInfo.goal === "gain_muscle") {
        // Muscle gain: 45-50% carbs (higher for energy)
        carbPercentage = userInfo.activity_level === "athlete" 
          ? 0.50 
          : 0.45;
      } else {
        // Maintain: 40-45% carbs
        carbPercentage = userInfo.activity_level === "athlete" || userInfo.activity_level === "very_active"
          ? 0.45 
          : 0.40;
      }
      const dailyCarbs = Math.round((dailyCalories * carbPercentage) / 4);

      // Get current season
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const season =
        currentMonth >= 3 && currentMonth <= 5
          ? "jar"
          : currentMonth >= 6 && currentMonth <= 8
          ? "leto"
          : currentMonth >= 9 && currentMonth <= 11
          ? "jeseň"
          : "zima";

      // Calculate BMI for body composition context
      const heightInMeters = userInfo.height / 100;
      const bmi =
        Math.round(
          (Number(userInfo.weight) / (heightInMeters * heightInMeters)) * 10
        ) / 10;
      const bmiCategory =
        bmi < 18.5
          ? "podváha"
          : bmi < 25
          ? "normálna"
          : bmi < 30
          ? "nadváha"
          : "obezita";

      const prompt = `Si expert AI nutricionista. Vytvor týždenný nákupný zoznam s presnými množstvami.

📋 PROFIL:
${userInfo.sex === "man" ? "Muž" : "Žena"}, ${userAge}r, ${
        userInfo.weight
      }kg, ${userInfo.height}cm (BMI: ${bmi} - ${bmiCategory})
Cieľ: ${userInfo.goal} | Aktivita: ${userInfo.activity_level} | Jedál: ${
        userInfo.meal_per_day
      }/deň
Diéta: ${userInfo.diet_preferences || "žiadna"} | Čas: ${
        userInfo.cooking_time_pref || "normal"
      } | Budget: ${userInfo.budget_preference}
Obľúbené: ${userInfo.likes || "-"} | Neobľúbené: ${
        userInfo.dislikes || "-"
      } | Alergie: ${userInfo.allergies || "-"}

📊 VYPOČÍTANÉ ENERGETICKÉ POTREBY:
BMR (základný metabolizmus): ${Math.round(bmr)} kcal - zohľadňuje pohlavie (${
        userInfo.sex === "man" ? "+5" : "-161"
      } kcal), vek (-5×${userAge}), výšku (+6.25×${
        userInfo.height
      }cm), váhu (+10×${userInfo.weight}kg)
TDEE (celková spotreba): ${Math.round(tdee)} kcal - BMR × ${
        activityMultipliers[userInfo.activity_level]
      } (aktivita ${userInfo.activity_level})
Cieľové kalórie: ${dailyCalories} kcal ${
        userInfo.goal === "lose_weight"
          ? `(TDEE -${Math.round(tdee - dailyCalories)} kcal deficit)`
          : userInfo.goal === "gain_muscle"
          ? "(TDEE +15% surplus)"
          : "(udržanie TDEE)"
      }

💪 MAKRONUTRIENTY:
Proteín: ${dailyProtein}g/deň (${proteinMultiplier}g/kg váhy) = ${Math.round(
        ((dailyProtein * 4) / dailyCalories) * 100
      )}% kalórií
Tuky: ${dailyFat}g/deň = 25% kalórií
Sacharidy: ${dailyCarbs}g/deň = ${Math.round(
        carbPercentage * 100
      )}% kalórií (prispôsobené ${userInfo.activity_level})

🎯 7-DŇOVÉ CIELE:
${dailyCalories * 7} kcal | ${dailyProtein * 7}g proteín | ${
        dailyFat * 7
      }g tuky | ${dailyCarbs * 7}g sacharidy | ${
        userInfo.meal_per_day * 7
      } jedál

🌡️ ROČNÉ OBDOBIE: ${season.toUpperCase()}
Skus sezónne ovocie a zeleninu (${season}) pre čerstvosť a cenu.Zohladni najblizsi sviatok aby klient zazil pravu atmosferu toho sviatku(napr.Vianoce a pridame punc ci vianocne pecivo)

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
4. NAJDOLEZITEJSIE : vystupny prompt bude v jazyku ${userInfo.language} (en = English || sk = Slovakia)

💰 BUDGET (7-dňový nákup):
**LOW (~30€)**: Vajcia, kuracie stehná/prsia, tuniak konzerva, ryža, ovos, cestoviny, mrazená zelenina, banány, sezónne ovocie, slnečnicový olej
**MEDIUM (~50€)**: Mix kuracie/hovädzie, losos mrazený, cottage cheese, jogurt, basmati/quinoa, mix čerstvé+mrazené zelenina, avokádo, bobuľové ovocie, olivový olej, orechy
**HIGH (~100€)**: Bio/organic produkty, losos čerstvý/údený, morské plody, bio kuracie, quinoa tricolor, čerstvá bio zelenina, šparágla, čerstvé bobuľové ovocie, prémiové orechy, mandľové maslo, avokádový olej

🍽️ ${userInfo.meal_per_day} jedál/deň → ${
        userInfo.meal_per_day <= 3
          ? "Väčšie porcie"
          : userInfo.meal_per_day >= 5
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

📝 FORMÁT:

# 🛒 Týždenný nákupný zoznam
**Denný príjem:** ${dailyCalories} kcal • ${dailyProtein}g proteín • ${dailyCarbs}g sacharidy • ${dailyFat}g tuky
**Budget:** ${userInfo.budget_preference} | **Jedál:** ${
        userInfo.meal_per_day
      }/deň | **Cieľ:** ${userInfo.goal}
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
1. Množstvá na 7 dní: ${dailyProtein * 7}g proteín, ${dailyFat * 7}g tuky, ${
        dailyCarbs * 7
      }g sacharidy (${Math.round(carbPercentage * 100)}% podľa aktivity)
2. Žiadne alergie/neobľúbené, diéta ${userInfo.diet_preferences || "žiadna"}
3. Budget ${userInfo.budget_preference} (${
        userInfo.budget_preference === "low"
          ? "~30€"
          : userInfo.budget_preference === "medium"
          ? "~50€"
          : "~100€"
      }), min. 3-4 položky/kategória
4. Doplnky: Zohľadni ${season}, ${userInfo.sex === "man" ? "muž" : "žena"}, ${
        userInfo.goal
      }, ${userInfo.diet_preferences || "žiadna diéta"}, aktivita ${
        userInfo.activity_level
      }
5. Tipy pre ${userInfo.goal}

⚡ VÝSTUP: Len markdown. Začni "# 🛒", žiadne \`\`\`markdown wrappery.`;

      const response = await model.invoke([new HumanMessage(prompt)]);

      let contentText: string;
      if (typeof response.content === "string") {
        contentText = response.content;
      } else if (Array.isArray(response.content)) {
        contentText = response.content
          .filter(
            (part): part is { type: string; text: string } =>
              typeof part === "object" && part !== null && "text" in part
          )
          .map((part) => part.text)
          .join("");
      } else {
        contentText = JSON.stringify(response.content);
      }

      contentText = contentText
        .replace(/```(?:markdown|md)?\s*/g, "")
        .replace(/```\s*$/g, "")
        .trim();

      return contentText;
    } catch (error) {
      apiLogger.error("Error generating shopping list", error, {
        context: "LangChain",
      });
      throw new Error("Failed to generate AI shopping list");
    }
  }
}
