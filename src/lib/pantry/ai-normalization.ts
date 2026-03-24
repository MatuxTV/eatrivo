import { HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import type { pantryItems } from "@/db/schema";
import type {
  PantryBatchInputItem,
  PantryBatchSuggestion,
} from "@/lib/langgraph/pantry-batch/types";
import { apiLogger } from "@/lib/logger";
import {
  getAliasCandidateKeysForName,
  loadIngredientAliasIndex,
} from "@/lib/pantry/ingredient-resolution";

type PantryContextItem = Pick<
  typeof pantryItems.$inferSelect,
  | "name"
  | "ingredientKey"
  | "ingredientSpecificKey"
  | "ingredientName"
  | "quantity"
  | "unit"
  | "category"
>;

interface BuildPantryNormalizationPromptInput {
  locale: string;
  currentPantry: PantryContextItem[];
  pendingItems: PantryBatchInputItem[];
}

interface GetPantryAiSuggestionsInput {
  userProfileId: string;
  systemPrompt?: string | null;
  locale?: string;
  currentPantry?: PantryContextItem[];
  pendingItems?: PantryBatchInputItem[];
}

function extractJSONArray(raw: string): string {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return cleaned.slice(firstBracket, lastBracket + 1);
  }

  return cleaned;
}

function normalizeSuggestionArray(value: unknown): PantryBatchSuggestion[] {
  if (!Array.isArray(value)) {
    throw new Error("AI normalization output is not an array.");
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("AI normalization output contains an invalid item.");
    }

    const item = entry as Record<string, unknown>;
    return {
      rawName: typeof item.rawName === "string" ? item.rawName : "",
      normalizedName:
        typeof item.normalizedName === "string" ? item.normalizedName : null,
      ingredientKey:
        typeof item.ingredientKey === "string" ? item.ingredientKey : null,
      ingredientSpecificKey:
        typeof item.ingredientSpecificKey === "string"
          ? item.ingredientSpecificKey
          : null,
      recommendedTrackingMode:
        item.recommendedTrackingMode === "quantity" ||
        item.recommendedTrackingMode === "availability"
          ? item.recommendedTrackingMode
          : null,
      alreadyExists: Boolean(item.alreadyExists),
      matchedExistingIngredientKey:
        typeof item.matchedExistingIngredientKey === "string"
          ? item.matchedExistingIngredientKey
          : null,
      matchedExistingIngredientSpecificKey:
        typeof item.matchedExistingIngredientSpecificKey === "string"
          ? item.matchedExistingIngredientSpecificKey
          : null,
      category: typeof item.category === "string" ? item.category : null,
      confidence:
        typeof item.confidence === "number" ? item.confidence : null,
      reason: typeof item.reason === "string" ? item.reason : null,
    };
  });
}

export async function buildPantryNormalizationPrompt(
  input: BuildPantryNormalizationPromptInput,
): Promise<string> {
  const pantryLines = input.currentPantry.map((item) => {
    const parts = [
      `name=${item.name}`,
      `ingredientSpecificKey=${item.ingredientSpecificKey ?? "null"}`,
      `ingredientKey=${item.ingredientKey ?? "null"}`,
      `ingredientName=${item.ingredientName ?? "null"}`,
      `quantity=${item.quantity ?? "null"}`,
      `unit=${item.unit ?? "null"}`,
      `category=${item.category ?? "null"}`,
    ];

    return `- ${parts.join(" | ")}`;
  });

  const aliasIndex = await loadIngredientAliasIndex(input.locale);

  const pendingLines = input.pendingItems.map((item, index) => {
    const candidateKeys = getAliasCandidateKeysForName(item.name, aliasIndex);
    return `${index + 1}. name=${item.name} | quantity=${item.quantity ?? "null"} | unit=${item.unit ?? "null"} | category=${item.category ?? "null"} | candidateKeys=${candidateKeys.length > 0 ? candidateKeys.join(", ") : "none"}`;
  });

  return [
    "You normalize pantry items into existing canonical ingredient keys used by recipes.",
    `Primary locale: ${input.locale}`,
    "Return ONLY valid JSON array.",
    'Each item must be: {"rawName": string, "normalizedName": string | null, "ingredientSpecificKey": string | null, "ingredientKey": string | null, "recommendedTrackingMode": "quantity" | "availability" | null, "alreadyExists": boolean, "matchedExistingIngredientSpecificKey": string | null, "matchedExistingIngredientKey": string | null, "category": string | null, "confidence": number | null, "reason": string | null}',
    "Rules:",
    "- normalizedName is ONLY a grammar/display correction of rawName.",
    "- normalizedName may only fix uppercase/lowercase and restore Slovak diacritics like dlzne and makcene.",
    "- normalizedName must NOT translate, shorten, expand, singularize, pluralize, reorder, or otherwise change the meaning of rawName.",
    "- If you are not sure you can preserve the exact same wording, return normalizedName as null.",
    "- Reuse existing pantry ingredientSpecificKey and ingredientKey when the pending item clearly refers to an item already in pantry.",
    "- ingredientSpecificKey is the main exact ingredient variant, like jasmine-rice, mozzarella-cheese, olive-oil, cherry-tomato.",
    "- ingredientKey is the broader fallback family, like rice, cheese, oil, tomato.",
    "- If an item is generic, ingredientSpecificKey may equal ingredientKey, for example milk -> milk and tomato -> tomato.",
    "- ingredientSpecificKey and ingredientKey must be English recipe-style canonical slugs, never Slovak words or direct slugified local phrases.",
    "- If candidateKeys are provided for an item, choose from candidateKeys unless you are highly confident that none of them fit.",
    "- If you are not confident about the exact variant, return ingredientSpecificKey as null and still try to return a broader ingredientKey.",
    "- If you are not confident about both, return both as null.",
    '- recommendedTrackingMode should be "availability" only for pantry staples that are usually tracked as simply on hand, for example garlic, salt, pepper, olive oil, soy sauce, vinegar.',
    '- recommendedTrackingMode should be "quantity" for quantity-sensitive or packaged ingredients like milk, eggs, onion, apple, rice, yogurt, chicken, pasta, bread, vegetables, fruit, meat, and dairy.',
    '- If the pending item includes an explicit quantity, prefer recommendedTrackingMode="quantity" unless the amount is clearly meaningless.',
    '- If you are unsure, return recommendedTrackingMode as null instead of guessing.',
    "- Prefer stable recipe-style exact keys like olive-oil, chicken-breast, greek-yogurt, tomato, green-bean, jasmine-rice, mozzarella-cheese.",
    "- Prefer broad fallback keys like oil, chicken, yogurt, tomato, bean, rice, cheese when they fit.",
    "- Never output localized keys like paradajky, kuracie-prsia, zelene-fazulky, cestoviny-penne.",
    "- Do not invent quantities or units.",
    "Valid examples:",
    '- rawName="malinove smoothie" -> normalizedName="Malinové smoothie" -> ingredientSpecificKey=null -> ingredientKey=null -> recommendedTrackingMode="quantity"',
    '- rawName="Jasminova ryza" -> normalizedName="Jazmínová ryža" -> ingredientSpecificKey="jasmine-rice" -> ingredientKey="rice" -> recommendedTrackingMode="quantity"',
    '- rawName="kuracie prsia" -> normalizedName="Kuracie prsia" -> ingredientSpecificKey="chicken-breast" -> ingredientKey="chicken" -> recommendedTrackingMode="quantity"',
    '- rawName="Mozzarella" -> normalizedName="Mozzarella" -> ingredientSpecificKey="mozzarella-cheese" -> ingredientKey="cheese" -> recommendedTrackingMode="quantity"',
    '- rawName="Mlieko" -> normalizedName="Mlieko" -> ingredientSpecificKey="milk" -> ingredientKey="milk" -> recommendedTrackingMode="quantity"',
    '- rawName="Cesnak" -> normalizedName="Cesnak" -> ingredientSpecificKey="garlic" -> ingredientKey="garlic" -> recommendedTrackingMode="availability"',
    "Invalid examples:",
    '- rawName="Paradajky" -> normalizedName="paradajka"  // invalid because meaning changed from plural form to singular form',
    '- rawName="Proteínový shake" -> normalizedName="Proteínový nápoj"  // invalid because wording changed',
    '- rawName="Paradajky" -> ingredientSpecificKey="paradajky"  // invalid because localized slug',
    '- rawName="Kuracie prsia" -> ingredientSpecificKey="kuracie-prsia"  // invalid because localized slug',
    '- rawName="Mozzarella" -> ingredientKey="mozzarella-cheese" and ingredientSpecificKey=null  // invalid because broad fallback cannot be more specific than the exact key',
    '- rawName="Kuracie prsia" -> recommendedTrackingMode="availability"  // invalid because meat is quantity-sensitive',
    "CURRENT PANTRY:",
    pantryLines.join("\n") || "- none",
    "PENDING ITEMS:",
    pendingLines.join("\n"),
    "Return one JSON object per pending item in the same order.",
  ].join("\n\n");
}

export async function getPantryAiSuggestions(
  input: GetPantryAiSuggestionsInput,
): Promise<PantryBatchSuggestion[]> {
  const systemPrompt =
    input.systemPrompt ??
    (input.locale && input.currentPantry && input.pendingItems
      ? await buildPantryNormalizationPrompt({
          locale: input.locale,
          currentPantry: input.currentPantry,
          pendingItems: input.pendingItems,
        })
      : null);

  if (!systemPrompt) {
    throw new Error("Missing pantry AI normalization prompt input.");
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    apiLogger.warn("[pantry.aiNormalize] GOOGLE_AI_API_KEY missing, skipping AI normalization", {
      metadata: { userProfileId: input.userProfileId },
    });
    return [];
  }

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey,
    maxOutputTokens: 8192,
    temperature: 0,
  });

  try {
    const response = await model.invoke([new HumanMessage(systemPrompt)]);
    const contentText =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
    const parsed = JSON.parse(extractJSONArray(contentText));
    const suggestions = normalizeSuggestionArray(parsed);

    apiLogger.info("[pantry.aiNormalize] AI normalization completed", {
      metadata: {
        userProfileId: input.userProfileId,
        suggestionCount: suggestions.length,
      },
    });

    return suggestions;
  } catch (error) {
    apiLogger.error("[pantry.aiNormalize] AI normalization failed", error, {
      metadata: { userProfileId: input.userProfileId },
    });
    return [];
  }
}

export function findPantrySuggestionForItem(
  suggestions: PantryBatchSuggestion[],
  rawName: string,
  index: number,
): PantryBatchSuggestion | null {
  const exactMatch = suggestions.find((item) => item.rawName === rawName);
  if (exactMatch) {
    return exactMatch;
  }

  return suggestions[index] ?? null;
}