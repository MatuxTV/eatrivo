// src/lib/langchain.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

interface UserProfile {
  age: number;
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
      const prompt = `Vytvor jedálniček na CELÝ TÝŽDEŇ (7 dní: Pondelok-Nedeľa) zo nakupneho zoznamu. Použi LEN ingrediencie zo zoznamu. Vyuzi vsetky potraviny aj s presným množstvom ako v nakupnom zozname.

        PROFIL: ${userProfile.age}r, ${userProfile.weight}kg, ${
                userProfile.height
              }cm, ${userProfile.sex}, cieľ: ${userProfile.goal}, aktivita: ${
                userProfile.activityLevel
              }, jedál/deň: ${userProfile.mealsPerDay}, alergie: ${
                userProfile.allergies || "žiadne"
              }

        Nakupny zoznam:
        ${shoppingListData.markdown}

        VÝSTUP: Čistý JSON objekt (začni {, skonči }), BEZ markdown wrapperu!

        {"week":[{"day":"Pondelok","totalDailyCalories":"2400kcal","totalDailyProtein":"120g","totalDailyCarbs":"130g","totalDailyFats":"62g","meals":[{"name":"Názov","prepTime":20,"difficulty":"ľahké","calories":450,"protein":30,"carbs":40,"fat":15}]},{"day":"Utorok",...},{"day":"Streda",...},{"day":"Štvrtok",...},{"day":"Piatok",...},{"day":"Sobota",...},{"day":"Nedeľa",...}]}

        DÔLEŽITÉ: Vytvor ${
                userProfile.mealsPerDay
              } jedál/deň pre VŠETKÝCH 7 dní. Celkom ${
                userProfile.mealsPerDay * 7
              } jedál. Slovenské názvy.`
      ;

      const response = await model.invoke([new HumanMessage(prompt)]);
      console.log(response);

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
      console.error("❌ Error generating meal plan:", error);
      throw new Error("Failed to generate AI meal plan");
    }
  }
}
