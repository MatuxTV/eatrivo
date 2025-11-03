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
      const prompt = `Vytvor JEDÁLNIČEK NA CELÝ TÝŽDEŇ (7 dní: Pondelok–Nedeľa) z nasledujúceho nákupného zoznamu. 
Použi IBA suroviny z tohto zoznamu a zachovaj reálne množstvá podľa dostupných potravín.

🎯 CIEĽ:
Vytvoriť realistický, nutrične vyvážený a praktický 7-dňový plán stravovania pre klienta.

📋 PROFIL KLIENTA:
Narodený/á: ${userProfile.dateofBirth},  
Pohlavie: ${userProfile.sex},  
Váha: ${userProfile.weight} kg,  
Výška: ${userProfile.height} cm,  
Cieľ: ${userProfile.goal},  
Úroveň aktivity: ${userProfile.activityLevel},  
Jedál denne: ${userProfile.mealsPerDay},  
Alergie: ${userProfile.allergies || "žiadne"}

🛒 NÁKUPNÝ ZOZNAM:
${shoppingListData.markdown}

---

⚙️ PRAVIDLÁ TVORBY:
1. Použi výlučne potraviny z nákupného zoznamu.  
2. Každé jedlo musí obsahovať realistické **množstvo ingrediencií v gramoch alebo ml**.  
3. Zachovaj logiku cieľa (napr. chudnutie → menej kalórií, naberanie → viac sacharidov a tukov).  
4. Rozdeľ makrá rovnomerne počas dňa.  
5. Použi slovenské názvy jedál.  
6. Jedlá musia byť jednoduché, rýchle (10–30 minút).  
7. Opakuj len vhodné jedlá (napr. raňajky 1–2× týždenne).  
8. V každom jedle uveď **zoznam ingrediencií s názvom, množstvom a typom**.  
9. Typ suroviny musí byť jedna z kategórií: "bielkovina", "sacharid", "tuk", "zelenina", "ovocie", "dochucovadlo".

---

📦 VÝSTUP:
Čistý **JSON objekt** (začni {, skonči }), BEZ markdown wrapperu.

Každý deň obsahuje:
- day: názov dňa (Pondelok–Nedeľa)
- totalDailyCalories, totalDailyProtein, totalDailyCarbs, totalDailyFats
- meals: zoznam jedál dňa

Každé jedlo obsahuje:
- name: názov jedla
- meal_type: raňajky, desiata, obed, olovrant, večera
- prepTime: čas prípravy (min)
- difficulty: “ľahké”, “stredné”, “pokročilé”
- calories, protein, carbs, fat: nutričné hodnoty
- ingredients: zoznam ingrediencií vo forme:
  - name: názov potraviny
  - amount: množstvo (g, ml, ks)
  - type: kategória potraviny (bielkovina/sacharid/tuk/zelenina/ovocie/dochucovadlo)
- ingredientCount: automaticky počet položiek z poľa ingredients

---

📊 Príklad formátu výstupu:
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
          "name": "Ovsená kaša s jogurtom a mangom",
          "meal_type": "raňajky",
          "prepTime": 10,
          "difficulty": "ľahké",
          "calories": 400,
          "protein": 25,
          "carbs": 50,
          "fat": 10,
          "ingredients": [
            {"name": "Ovsené vločky", "amount": "50 g"},
            {"name": "Skyr", "amount": "150 g"},
            {"name": "Mango", "amount": "80 g"},
            {"name": "Chia semienka", "amount": "5 g"},
            {"name": "Med", "amount": "5 g"}
          ],
          "ingredientCount": 5
        },
        {
          "name": "Kuracie prsia s ryžou a brokolicou",
          "meal_type": "obed",
          "prepTime": 25,
          "difficulty": "stredné",
          "calories": 500,
          "protein": 40,
          "carbs": 45,
          "fat": 12,
          "ingredients": [
            {"name": "Kuracie prsia", "amount": "120 g"},
            {"name": "Ryža", "amount": "100 g"},
            {"name": "Brokolica", "amount": "80 g"},
            {"name": "Olivový olej", "amount": "5 ml"}
          ],
          "ingredientCount": 4
        }
      ]
    }
  ]
}

---

📈 NUTRIČNÉ CIELE:
- Vytvor presne ${userProfile.mealsPerDay} jedál na deň × 7 dní (spolu ${
        userProfile.mealsPerDay * 7
      } jedál).
- Kalorické hodnoty podľa cieľa (napr. 1700–1900 kcal pre chudnutie, 2800–3200 pre objem).
- Pomery makronutrientov: bielkoviny 25–30 %, tuky 25–30 %, sacharidy 40–50 %.
- Použi výhradne potraviny z nákupného zoznamu.
- Názvy jedál musia byť **v slovenčine**.

---

🧠 POZNÁMKA:
Výstup musí byť **syntakticky validný JSON** – bez markdownu, komentárov, alebo textového vysvetlenia.
`;
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
}
