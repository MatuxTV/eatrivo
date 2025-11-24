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
}

export class EatrivoAIService {
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
      const userAge =
        new Date().getFullYear() -
        new Date(userProfile.dateofBirth).getFullYear();
      const totalMeals = userProfile.mealsPerDay * 7;

      const prompt = `Vytvor 7-dňový jedálny plán (Pondelok–Nedeľa) z tohto nákupného zoznamu.

📋 PROFIL KLIENTA:
Vek: ${userAge} rokov
Pohlavie: ${userProfile.sex}
Váha: ${userProfile.weight} kg
Výška: ${userProfile.height} cm
Cieľ: ${userProfile.goal}
Aktivita: ${userProfile.activityLevel}
Jedál/deň: ${userProfile.mealsPerDay}
Alergie: ${userProfile.allergies || "žiadne"}

🛒 NÁKUPNÝ ZOZNAM:
${shoppingListData.markdown}

⚙️ PRAVIDLÁ:
1. Použi IBA potraviny z nákupného zoznamu
2. Množstvá v gramoch/ml (realistické porcie)
3. Každé jedlo min. 2 ingrediencie
4. Slovenské názvy jedál
5. Čas prípravy: 10–30 minút
6. Rozumne opakuj jedlá (raňajky môžu byť 2× rovnaké)

⚠️ KRITICKÉ - FORMÁT DÁTOVÝCH TYPOV:

JEDLO (meal objekty) - nutričné hodnoty sú ČÍSLA:
{
  "calories": 420,
  "protein": 28,
  "carbs": 52,
  "fat": 11
}

DEŇ (day objekty) - denné súčty sú STRINGY s jednotkou:
{
  "totalDailyCalories": "1850 kcal",
  "totalDailyProtein": "120 g",
  "totalDailyCarbs": "170 g",
  "totalDailyFats": "50 g"
}

INGREDIENCIE - amount je STRING s jednotkou:
{
  "name": "Kuracie prsia",
  "amount": "120 g",
  "type": "protein"
}

Typy ingrediencií: protein, carb, fat, vegetable, fruit, seasoning

📊 VÝSTUPNÝ FORMÁT:

{
  "week": [
    {
      "day": "Pondelok",
      "totalDailyCalories": "1850 kcal",
      "totalDailyProtein": "120 g",
      "totalDailyCarbs": "170 g",
      "totalDailyFats": "50 g",
      "meals": [
        {
          "name": "Proteínová ovsená kaša",
          "meal_type": "raňajky",
          "prepTime": 10,
          "difficulty": "ľahké",
          "calories": 420,
          "protein": 28,
          "carbs": 52,
          "fat": 11,
          "ingredients": [
            {"name": "Ovsené vločky", "amount": "60 g", "type": "carb"},
            {"name": "Proteinový jogurt", "amount": "150 g", "type": "protein"},
            {"name": "Banán", "amount": "100 g", "type": "fruit"}
          ],
          "ingredientCount": 3
        }
      ]
    }
  ]
}

📈 NUTRIČNÉ CIELE:
- Počet jedál: ${
        userProfile.mealsPerDay
      } jedál/deň × 7 dní = ${totalMeals} jedál celkom
- Kalórie podľa cieľa:
  * lose_weight: 1700–1900 kcal/deň
  * maintain_weight: 2000–2300 kcal/deň
  * gain_muscle: 2800–3200 kcal/deň
- Makrá: protein 25-30%, tuky 25-30%, sacharidy 40-50%
- Súčet calories všetkých meals = totalDailyCalories (±5%)

💡 FALLBACK:
- Ak chýbajú suroviny, použi najbližšie alternatívy
- Opakuj vhodné kombinácie namiesto nových jedál
- Prioritizuj nutričnú hodnotu

✅ VALIDÁCIA:
1. Všetky calories/protein/carbs/fat v meals sú NUMBER (nie string)
2. Všetky totalDaily* sú STRING s jednotkou
3. Každé jedlo má min. 2 ingrediencie
4. Každá ingrediencia má name, amount, type
5. Presne 7 dní (Pondelok–Nedeľa)
6. Presne ${userProfile.mealsPerDay} meals na deň

VÝSTUP: Čistý JSON objekt. Začni {, skonči }. Žiadne markdown, žiadne komentáre.`;

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
      });
      throw new Error("Failed to generate AI meal plan");
    }
  }

  static async generateShoppingList(userInfo: ShoppingListUserInfo) {
    try {
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
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        athlete: 1.9,
      };

      let tdee = bmr * activityMultipliers[userInfo.activity_level];

      if (userInfo.goal === "lose_weight") {
        tdee *= 0.85;
      } else if (userInfo.goal === "gain_muscle") {
        tdee *= 1.15;
      }

      const dailyCalories = Math.round(tdee);
      const dailyProtein = Math.round(Number(userInfo.weight) * 2);
      const dailyFat = Math.round((dailyCalories * 0.25) / 9);
      const dailyCarbs = Math.round(
        (dailyCalories - (dailyProtein * 4 + dailyFat * 9)) / 4
      );

      const prompt = `Si expert nutricionista. Vytvor detailný týždenný nákupný zoznam pre klienta.

📋 PROFIL KLIENTA:
Vek: ${userAge} rokov
Pohlavie: ${userInfo.sex === "man" ? "muž" : "žena"}
Váha: ${userInfo.weight} kg
Výška: ${userInfo.height} cm
Cieľ: ${userInfo.goal}
Aktivita: ${userInfo.activity_level}
Jedál/deň: ${userInfo.meal_per_day}
Diéta: ${userInfo.diet_preferences || "žiadna"}
Rozpočet: ${userInfo.budget_preference}
Obľúbené: ${userInfo.likes || "žiadne špecifické"}
Neobľúbené: ${userInfo.dislikes || "žiadne"}
Alergie: ${userInfo.allergies || "žiadne"}

📊 VYPOČÍTANÉ NUTRIČNÉ CIELE (na deň):
Kalórie: ~${dailyCalories} kcal
Bielkoviny: ${dailyProtein} g
Sacharidy: ${dailyCarbs} g
Tuky: ${dailyFat} g

⚙️ PRAVIDLÁ:
1. Vytvor zoznam na 7 dní
2. Zohľadni rozpočet (low = lacné, medium = mix, high = prémiové)
3. Rešpektuj diétne preferencie a alergie
4. Zahrň potraviny ktoré klient má rád, vyhni sa tým čo nemá rád
5. Každá kategória má tabuľku: | Potravina | Množstvo | Poznámka |
6. Uvádzaj realistické množstvá na týždeň
7. Používaj slovenské názvy
8. Emojis pre kategórie

📝 FORMÁT:

# 🛒 Týždenný nákupný zoznam
**Denný príjem:** ~${dailyCalories} kcal • ${dailyProtein} g bielkovín • ${dailyCarbs} g sacharidov • ${dailyFat} g tukov
---

## 🥩 Bielkovinové zdroje
| Potravina | Množstvo | Poznámka |
|------------|-----------|----------|

## 🌾 Sacharidové zdroje
| Potravina | Množstvo | Poznámka |
|------------|-----------|----------|

## 🥦 Zelenina
| Potravina | Množstvo | Poznámka |
|------------|-----------|----------|

## 🍓 Ovocie
| Potravina | Množstvo | Poznámka |
|------------|-----------|----------|

## 🌰 Zdravé tuky a semienka
| Potravina | Množstvo | Poznámka |
|------------|-----------|----------|

## 🧂 Dochucovadlá a základné potraviny
| Potravina | Množstvo | Poznámka |
|------------|-----------|----------|

## 💧 Nápoje
| Nápoj | Množstvo | Poznámka |
|--------|-----------|----------|

## 💊 Doplnky výživy
| Doplnok | Denná dávka | Kedy užívať | Účel |
|----------|--------------|--------------|-------|

### ✅ Tipy
- Tip 1
- Tip 2

💡 DÔLEŽITÉ:
- Odhaduj množstvá ako skúsený nutricionista
- Pre lose_weight: menšie porcie, viac zeleniny
- Pre gain_muscle: viac bielkovín
- Pre vegan: len rastlinné
- Pre low budget: vajcia, ryža, kurča, mrazená zelenina
- Pre high budget: losos, avokádo, quinoa
- Personalizuj tipy

VÝSTUP: Len markdown. Začni "# 🛒"`;

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
