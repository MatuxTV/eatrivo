import { HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { setMaxListeners } from "events";

import { CUSTOM_RECIPE_AI_TIMEOUT_MS } from "../constants";
import type { CustomRecipePantryContextItem } from "@/lib/custom-recipes/contracts";
import { apiLogger } from "@/lib/logger";
import type { CustomRecipeState } from "../state";

setMaxListeners(30);

function extractJson(content: string): string {
  const cleaned = content
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Custom recipe generation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function stringifyPantryItem(
  pantryItem: CustomRecipePantryContextItem,
): string {
  const amount = pantryItem.quantity
    ? `${pantryItem.quantity}${pantryItem.unit ? ` ${pantryItem.unit}` : ""}`
    : "quantity unknown";

  return `${pantryItem.pantryName} (${amount})`;
}

export async function recipeRequest(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return {
      requestError: "GOOGLE_AI_API_KEY is not configured",
      rawAiOutput: null,
      parsedAiOutput: null,
      retryCount: state.retryCount + 1,
    };
  }

  const firstName = state.userProfile?.fullName?.split(" ")[0] ?? "friend";
  const pantrySummary = state.pantryRows.length
    ? state.pantryRows.map(stringifyPantryItem).join(", ")
    : "No pantry items available.";
  const diet = state.userInfo?.diet_preferences ?? "none";
  const allergies = state.userInfo?.allergies?.trim() || "none";
  const likes = state.userInfo?.likes?.trim() || "none";
  const dislikes = state.userInfo?.dislikes?.trim() || "none";
  const kitchenEquipment =
    state.userInfo?.kitchen_equipment?.filter(Boolean).join(", ") || "unknown";

  const prompt = `
You are Rivo, the JSON-first recipe generation workflow for Eatrivo.

Return raw JSON only. No markdown. No commentary.

Generate up to two recipe options for locale "${state.locale}":
1. "pantryRecipe" -> only if it can be cooked entirely from pantry ingredients.
2. "almostCookableRecipe" -> only if it needs at most 3 missing ingredients.

If a recipe cannot be produced, return:
{
  "status": "unavailable",
  "reason": "INSUFFICIENT_PANTRY" | "AI_UNABLE_TO_COMPOSE" | "PANTRY_EMPTY" | "DIETARY_CONSTRAINTS"
}

Use this exact output schema:
{
  "pantryRecipe": {
    "status": "available",
    "name": "string",
    "category": "string",
    "description": "string",
    "servings": number,
    "servingUnit": "string or null",
    "prepTimeMin": number,
    "totalTimeMin": number,
    "difficulty": "easy" | "medium" | "hard",
    "mealPrepFriendly": boolean,
    "tags": ["string"],
    "nutrition": {
      "calories": number,
      "proteinG": number,
      "carbohydratesG": number,
      "fatG": number
    },
    "ingredients": [
      {
        "name": "string",
        "amount": "string or null",
        "pantryStatus": "pantry" | "missing",
        "pantryMatchName": "exact pantry item name or null"
      }
    ],
    "instructions": [{ "title": "string", "text": "string" }]
  },
  "almostCookableRecipe": { ...same contract... }
}

Hard rules:
- For pantry ingredients, pantryMatchName must exactly match one item from the pantry list below.
- Never invent pantryMatchName values.
- pantryRecipe may not contain any "missing" ingredients.
- almostCookableRecipe may contain at most 3 missing ingredients.
- Respect allergies, dislikes, diet preference, goal, activity, height, and weight.
- Prefer recipes that are realistic for the provided pantry and kitchen equipment.

User profile:
- Name: ${firstName}
- Goal: ${state.userInfo?.goal ?? "unknown"}
- Activity: ${state.userInfo?.activity_level ?? "unknown"}
- Height cm: ${state.userInfo?.height ?? "unknown"}
- Weight kg: ${state.userInfo?.weight ?? "unknown"}
- Diet: ${diet}
- Allergies: ${allergies}
- Likes: ${likes}
- Dislikes: ${dislikes}
- Cooking time preference: ${state.userInfo?.cooking_time_pref ?? "unknown"}
- Cooking skill: ${state.userInfo?.cooking_skill_level ?? "unknown"}
- Kitchen equipment: ${kitchenEquipment}
- Meals per day: ${state.userInfo?.meal_per_day ?? "unknown"}

Pantry items:
${pantrySummary}
`.trim();

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3-flash-preview",
    temperature: 0.3,
    maxOutputTokens: 4096,
    apiKey,
  });

  try {
    const response = await withTimeout(
      model.invoke([new HumanMessage(prompt)]),
      CUSTOM_RECIPE_AI_TIMEOUT_MS,
    );

    const content =
      typeof response.content === "string"
        ? response.content
        : Array.isArray(response.content)
          ? response.content
              .map((part) =>
                typeof part === "object" &&
                part !== null &&
                "text" in part &&
                typeof part.text === "string"
                  ? part.text
                  : "",
              )
              .join("")
          : JSON.stringify(response.content);

    return {
      rawAiOutput: extractJson(content),
      requestError: null,
    };
  } catch (error) {
    apiLogger.warn("[customRecipe.recipeRequest] AI request failed", {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
        retryCount: state.retryCount + 1,
      },
    });

    return {
      rawAiOutput: null,
      parsedAiOutput: null,
      requestError:
        error instanceof Error ? error.message : "Recipe generation request failed",
      retryCount: state.retryCount + 1,
    };
  }
}
