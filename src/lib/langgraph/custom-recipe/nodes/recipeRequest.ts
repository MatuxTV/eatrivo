import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { setMaxListeners } from "events";
import { z } from "zod";

import { CUSTOM_RECIPE_AI_TIMEOUT_MS } from "../constants";
import {
  buildPreviousRecipePromptContext,
  CUSTOM_RECIPE_MIN_DIVERSITY,
} from "@/lib/custom-recipes/diversity";
import { apiLogger } from "@/lib/logger";
import {
  getPreferenceRecipeSuggestionsForUserProfile,
  getRecipeMatchesForUserProfile,
} from "@/lib/recipe-matches";
import { buildPantryPromptContext } from "../pantryPromptContext";
import type { CustomRecipeState } from "../state";

setMaxListeners(30);
const customRecipeProviderIngredientSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().max(80).nullable(),
  pantryStatus: z.enum(["pantry", "missing"]),
  pantryMatchName: z.string().min(1).max(120).nullable(),
});

const customRecipeProviderInstructionSchema = z.object({
  title: z.string().max(120),
  text: z.string().min(1).max(500),
});

const customRecipeProviderNutritionSchema = z.object({
  calories: z.number().int().min(0).max(3000),
  proteinG: z.number().min(0).max(300),
  carbohydratesG: z.number().min(0).max(500),
  fatG: z.number().min(0).max(200),
});

const customRecipeProviderCandidateSchema = z.object({
  status: z.enum(["available", "unavailable"]),
  reason: z
    .enum([
      "INSUFFICIENT_PANTRY",
      "AI_UNABLE_TO_COMPOSE",
      "PANTRY_EMPTY",
      "DIETARY_CONSTRAINTS",
    ])
    .optional(),
  name: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(280).optional(),
  servings: z.number().int().min(1).max(12).optional(),
  servingUnit: z.string().max(40).nullable().optional(),
  prepTimeMin: z.number().int().min(1).max(240).optional(),
  totalTimeMin: z.number().int().min(1).max(360).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  mealPrepFriendly: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(40)).max(8).optional(),
  nutrition: customRecipeProviderNutritionSchema.optional(),
  ingredients: z.array(customRecipeProviderIngredientSchema).min(1).max(20).optional(),
  instructions: z.array(customRecipeProviderInstructionSchema).min(1).max(12).optional(),
});

type CustomRecipeProviderCandidate = z.infer<
  typeof customRecipeProviderCandidateSchema
>;

const customRecipeGeminiSingleCandidateSchema = z.object({
  recipe: customRecipeProviderCandidateSchema,
});

function summarizeCandidate(
  candidate: CustomRecipeProviderCandidate | null | undefined,
) {
  if (!candidate) {
    return {
      status: "missing_candidate",
    };
  }

  if (candidate.status === "unavailable") {
    return {
      status: candidate.status,
      reason: candidate.reason,
    };
  }

  if (!candidate.ingredients || !candidate.instructions || !candidate.tags) {
    return {
      status: candidate.status,
      name: candidate.name,
      missingRequiredFields: [
        candidate.ingredients ? null : "ingredients",
        candidate.instructions ? null : "instructions",
        candidate.tags ? null : "tags",
        candidate.nutrition ? null : "nutrition",
        candidate.servings !== undefined ? null : "servings",
        candidate.servingUnit !== undefined ? null : "servingUnit",
        candidate.prepTimeMin !== undefined ? null : "prepTimeMin",
        candidate.totalTimeMin !== undefined ? null : "totalTimeMin",
        candidate.difficulty ? null : "difficulty",
        candidate.mealPrepFriendly !== undefined ? null : "mealPrepFriendly",
      ].filter(Boolean),
    };
  }

  const missingIngredientCount = candidate.ingredients.filter(
    (ingredient) => ingredient.pantryStatus === "missing",
  ).length;
  const pantryIngredientCount = candidate.ingredients.filter(
    (ingredient) => ingredient.pantryStatus === "pantry",
  ).length;

  return {
    status: candidate.status,
    name: candidate.name,
    servings: candidate.servings,
    servingUnit: candidate.servingUnit,
    prepTimeMin: candidate.prepTimeMin,
    totalTimeMin: candidate.totalTimeMin,
    ingredientCount: candidate.ingredients.length,
    pantryIngredientCount,
    missingIngredientCount,
    instructionCount: candidate.instructions.length,
    tagCount: candidate.tags.length,
    allIngredientsHaveAmount: candidate.ingredients.every(
      (ingredient) => ingredient.amount !== undefined,
    ),
    pantryIngredientsMissingMatchName: candidate.ingredients
      .filter((ingredient) => ingredient.pantryStatus === "pantry")
      .map((ingredient) => ingredient.pantryMatchName)
      .filter((matchName) => !matchName || matchName.trim().length === 0).length,
    missingIngredientsWithMatchName: candidate.ingredients.filter(
      (ingredient) =>
        ingredient.pantryStatus === "missing" && ingredient.pantryMatchName !== null,
    ).length,
  };
}

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

function buildReferenceRecipesSection(
  referenceRecipes: Awaited<ReturnType<typeof getRecipeMatchesForUserProfile>>,
): string {
  const references = [...referenceRecipes.cookable, ...referenceRecipes.almostCookable]
    .slice(0, 1)
    .map((recipe, index) => {
      const ingredientPreview = recipe.ingredientItems
        .slice(0, 4)
        .map((ingredient) => ingredient.name)
        .join(", ");

      return [
        `Reference ${index + 1}:`,
        `- Name: ${recipe.name}`,
        `- Total time: ${recipe.totalTimeMin} min`,
        `- Protein: ${recipe.proteinG}g`,
        `- Matched ingredients: ${recipe.matchedIngredientNames.join(", ") || "none"}`,
        `- Ingredient style: ${ingredientPreview || "none"}`,
      ].join("\n");
    });

  if (references.length === 0) {
    return "";
  }

  return `\nReference recipes from our database:\n${references.join("\n\n")}\n\nUse these only as guidance for realism, structure, and naming style. Do not copy them verbatim.`;
}

function formatMealType(mealType: typeof CustomRecipeState.State.requestedMealType) {
  switch (mealType) {
    case "breakfast":
      return "breakfast";
    case "lunch":
      return "lunch";
    case "dinner":
      return "dinner";
    case "snack":
      return "snack";
    default:
      return "meal";
  }
}

function getDefaultServingUnit(locale: typeof CustomRecipeState.State.locale) {
  return locale === "sk" ? "porcia" : "serving";
}

function buildBasePrompt(
  state: typeof CustomRecipeState.State,
  firstName: string,
  pantrySummary: string,
  pantryContext: ReturnType<typeof buildPantryPromptContext>,
  diet: string,
  allergies: string,
  dislikes: string,
  referenceRecipesSection: string,
  previousRecipeSection: string,
  retryGuidance: string,
): string {
  const pantryRules =
    state.mode === "preferences_only"
      ? `- Ignore pantry inventory completely in this mode.
- Pantry fields are only structural here: every ingredient must use pantryStatus "pantry" and pantryMatchName equal to the ingredient name.
- Do not optimize for ingredients the user already has at home.`
      : `- For pantry ingredients, pantryMatchName must exactly match one pantry item from the list below.
- Never invent pantryMatchName values.
- Pantry ingredients must use pantryStatus "pantry" with a non-null pantryMatchName.
- Missing ingredients must use pantryStatus "missing" with pantryMatchName null.`;
  const pantryContextSection =
    state.mode === "preferences_only"
      ? "Pantry is intentionally ignored for this request."
      : pantrySummary;
  const pantrySummarySection =
    state.mode === "preferences_only"
      ? ""
      : `

Pantry context summary:
- Quantity-tracked pantry items: ${pantryContext.quantityTrackedCount}
- Always-available staples: ${pantryContext.availabilityStapleCount}`;

  return `
You are Rivo, the recipe generation workflow for Eatrivo.

Return one recipe candidate only.

Hard rules:
- Respect allergies, dislikes, and diet preference.
- Keep the recipe realistic and concise.
- If status is "available", include all required fields: name, category, description, servings, servingUnit, prepTimeMin, totalTimeMin, difficulty, mealPrepFriendly, tags, nutrition, ingredients, instructions.
- If status is "unavailable", return only status and reason.
- Always include amount for every ingredient. Use null when amount is unknown.
${pantryRules}
- Ingredients listed under always-available staples are already available in stock even without a tracked pantry quantity.
- Always-available staples should be treated as normal pantry ingredients, not as missing ingredients.
- Never omit servingUnit. Use "${getDefaultServingUnit(state.locale)}" unless there is a better explicit serving label.
- Always include instruction title and text. Title may be an empty string when no short label fits.
- Every ingredient amount must include an explicit unit.
- Allowed ingredient units are only: g, kg, ml, l, dl, ks, bal, plechovka, fľaša, zväzok, hlávka.
- Do not use kitchen units like tbsp, tsp, cup, pinch, handful, scoop, dash, clove.
- Liquids such as oils, vinegars, milk, broths, and sauces should prefer ml, l, or dl.
- Pastes, flours, rice, sugar, oats, spices, and other dry goods should prefer g or kg.
- Countable items like eggs, onions, tomatoes, lemons, and garlic should use ks.
- Tomato paste and olive oil must never use ks.
- Availability staples are especially useful for oils, seasonings, spices, vinegars, and sauces.
- Even when a staple is availability-tracked, still output a realistic recipe amount and unit for it.
- If a previous recipe is provided below, the new recipe must be at least ${Math.round(
    CUSTOM_RECIPE_MIN_DIVERSITY * 100,
  )}% different overall.
- When regenerating after a diversity failure, make a clearly different recipe, not a rename or light tweak.

Request preferences:
- Name: ${firstName}
- Servings requested: ${state.requestedServings}
- Meal type: ${formatMealType(state.requestedMealType)}
- Meal prep friendly: ${state.requestedMealPrep ? "yes" : "no"}

Client food preferences:
- Diet: ${diet}
- Allergies: ${allergies}
- Dislikes: ${dislikes}

Pantry items:
${pantryContextSection}${pantrySummarySection}${referenceRecipesSection}${previousRecipeSection}${retryGuidance}
`.trim();
}

function buildPreviousRecipeSection(state: typeof CustomRecipeState.State): string {
  if (!state.previousGeneratedRecipe) {
    return "";
  }

  return `

Previous generated recipe to avoid repeating:
${buildPreviousRecipePromptContext(state.previousGeneratedRecipe)}

Make this new recipe meaningfully different. Change the ingredient composition, cooking method, and flavor direction enough to avoid obvious repetition.`;
}

function buildRetryGuidance(state: typeof CustomRecipeState.State): string {
  const stapleItems = state.pantryRows
    .filter((row) => row.inStock && row.trackingMode === "availability")
    .map((row) => row.pantryName)
    .slice(0, 5);
  const stapleHint = stapleItems.length
    ? `\n- You already have these always-available staples in stock: ${stapleItems.join(", ")}.`
    : "";

  if (!state.requestError) {
    return "";
  }

  if (state.validationErrorType === "unit_format_error") {
    return `

Previous attempt failed amount formatting validation.
- Every ingredient amount must include a numeric quantity and an explicit allowed unit.
- Do not output bare values like 0,5 or 2 without a unit.
- Use only g, kg, ml, l, dl, ks, bal, plechovka, fľaša, zväzok, hlávka.${stapleHint}`;
  }

  if (state.validationErrorType === "unit_semantic_error") {
    return `

Previous attempt failed ingredient unit semantics.
- Fix the unit so it matches the ingredient form.
- Liquids should use ml/l/dl, dry goods g/kg, countable items ks.
- Never use ks for olive oil, tomato paste, sauces, or other liquids/pastes.${stapleHint}`;
  }

  if (state.validationErrorType === "unit_repair_failed") {
    return `

Previous unit repair attempt still failed validation.
- Rebuild the ingredient amounts from scratch with correct units.
- Use only the allowed unit set and make each amount explicit.${stapleHint}`;
  }

  if (!state.requestError.toLowerCase().includes("similar")) {
    return `

Previous attempt issue:
- ${state.requestError}${stapleHint}`;
  }

  return `

Previous attempt was rejected for being too similar to the last generated recipe.
- Replace multiple core ingredients, not just garnish.
- Use a different preparation or cooking method.
- Shift the flavor profile so the meal feels clearly distinct.${stapleHint}`;
}

function buildCandidatePrompt(
  kind: "pantry" | "almost_cookable",
  basePrompt: string,
  mode: typeof CustomRecipeState.State.mode,
): string {
  if (mode === "preferences_only") {
    return `${basePrompt}

Generate one recipe candidate based only on the user profile and request preferences.
- Ignore pantry availability and home inventory entirely.
- Every ingredient in this mode must use pantryStatus "pantry" and pantryMatchName equal to the ingredient name.
- Match the requested meal type and requested number of servings.
- When meal prep friendly is requested, prefer recipes that store and reheat well.
- Keep ingredients focused, ideally 4 to 10 items.
- Keep instructions to 2 to 6 steps.`;
  }

  if (kind === "pantry") {
    return `${basePrompt}

Generate a pantry recipe candidate.
- It must be fully cookable from pantry ingredients only.
- If not possible, return status unavailable with the best matching reason.
- Keep ingredients focused, ideally 4 to 10 items.
- Keep instructions to 2 to 6 steps.
- Every ingredient in this candidate must have pantryStatus "pantry".
- Match the requested meal type and requested number of servings.
- When meal prep friendly is requested, prefer recipes that store and reheat well.`;
  }

  return `${basePrompt}

Generate an almost-cookable recipe candidate.
- It may require at most 3 missing ingredients.
- Missing ingredients must be marked as missing and pantryMatchName must be null for them.
- If not possible, return status unavailable with the best matching reason.
- Keep ingredients focused, ideally 4 to 10 items.
- Keep instructions to 2 to 6 steps.
- Use no more than 3 ingredients with pantryStatus "missing".
- Match the requested meal type and requested number of servings.
- When meal prep friendly is requested, prefer recipes that store and reheat well.`;
}

function normalizeUnavailableCandidate(
  candidate: CustomRecipeProviderCandidate | null | undefined,
) {
  if (!candidate || candidate.status !== "unavailable") {
    return candidate;
  }

  return {
    ...candidate,
    reason: candidate.reason ?? "AI_UNABLE_TO_COMPOSE",
  };
}

function normalizeCandidate(
  candidate: CustomRecipeProviderCandidate | null | undefined,
  locale: typeof CustomRecipeState.State.locale,
) {
  const normalizedUnavailable = normalizeUnavailableCandidate(candidate);

  if (!normalizedUnavailable || normalizedUnavailable.status !== "available") {
    return normalizedUnavailable;
  }

  return {
    ...normalizedUnavailable,
    servingUnit:
      normalizedUnavailable.servingUnit ?? getDefaultServingUnit(locale),
  };
}

async function requestSingleCandidate(
  model: ChatGoogleGenerativeAI,
  prompt: string,
  timeoutMs: number,
) {
  const structuredModel = model.withStructuredOutput(
    customRecipeGeminiSingleCandidateSchema,
    {
      method: "functionCalling",
      name: "generate_custom_recipe_candidate",
      includeRaw: true,
    },
  );

  return withTimeout(
    structuredModel.invoke([new HumanMessage(prompt)]),
    timeoutMs,
  );
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
  const pantryContext = buildPantryPromptContext(state.pantryRows);
  const pantrySummary = state.mode === "preferences_only"
    ? "Pantry is intentionally ignored in this mode."
    : state.pantryRows.length
    ? pantryContext.summary
    : "Tracked pantry items with quantities:\n- none\n\nAlways-available staples already in stock:\n- none";
  const diet = state.userInfo?.diet_preferences ?? "none";
  const allergies = state.userInfo?.allergies?.trim() || "none";
  const dislikes = state.userInfo?.dislikes?.trim() || "none";
  const referenceRecipeMatches = await (state.mode === "preferences_only"
    ? getPreferenceRecipeSuggestionsForUserProfile(state.userProfileId, {
        locale: state.locale,
        limit: 1,
        mealType: state.requestedMealType,
        mealPrep: state.requestedMealPrep,
      }).then((recipes) => ({
        pantryIsEmpty: false,
        pantryIngredientKeyCount: 0,
        recipeCountAnalyzed: recipes.length,
        cookable: recipes,
        almostCookable: [],
      }))
    : getRecipeMatchesForUserProfile(state.userProfileId, {
        locale: state.locale,
        maxMissingIngredients: 3,
        cookableLimit: 1,
        almostCookableLimit: 1,
      })
  ).catch((error) => {
    apiLogger.warn("[customRecipe.recipeRequest] reference recipe lookup failed", {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
        errorMessage: error instanceof Error ? error.message : "unknown error",
      },
    });

    return {
      pantryIsEmpty: false,
      pantryIngredientKeyCount: 0,
      recipeCountAnalyzed: 0,
      cookable: [],
      almostCookable: [],
    };
  });
  const referenceRecipesSection = buildReferenceRecipesSection(referenceRecipeMatches);
  const previousRecipeSection = buildPreviousRecipeSection(state);
  const retryGuidance = buildRetryGuidance(state);

  const basePrompt = buildBasePrompt(
    state,
    firstName,
    pantrySummary,
    pantryContext,
    diet,
    allergies,
    dislikes,
    referenceRecipesSection,
    previousRecipeSection,
    retryGuidance,
  );

  apiLogger.info("[customRecipe.recipeRequest] pantry prompt context prepared", {
    metadata: {
      userId: state.userId,
      userProfileId: state.userProfileId,
      quantityTrackedCount: pantryContext.quantityTrackedCount,
      availabilityStapleCount: pantryContext.availabilityStapleCount,
      stapleNames: pantryContext.stapleNames,
    },
  });
  const pantryPrompt = buildCandidatePrompt("pantry", basePrompt, state.mode);
  const almostCookablePrompt = buildCandidatePrompt(
    "almost_cookable",
    basePrompt,
    state.mode,
  );

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite-preview",
    temperature: 0.3,
    maxOutputTokens: 2048,
    apiKey,
  });

  try {
    const perCandidateTimeoutMs = Math.max(
      12_000,
      Math.floor(CUSTOM_RECIPE_AI_TIMEOUT_MS * 0.6),
    );
    const [pantryResponse, almostCookableResponse] = state.mode === "preferences_only"
      ? ([
          await Promise.resolve(
            await requestSingleCandidate(model, pantryPrompt, perCandidateTimeoutMs),
          ).then((value) => ({ status: "fulfilled", value } as const)).catch((reason) => ({
            status: "rejected",
            reason,
          } as const)),
          {
            status: "fulfilled",
            value: {
              parsed: {
                recipe: {
                  status: "unavailable" as const,
                  reason: "AI_UNABLE_TO_COMPOSE" as const,
                },
              },
              raw: new AIMessage(""),
            },
          } as const,
        ] satisfies [PromiseSettledResult<Awaited<ReturnType<typeof requestSingleCandidate>>>, PromiseSettledResult<Awaited<ReturnType<typeof requestSingleCandidate>>>])
      : await Promise.allSettled([
          requestSingleCandidate(model, pantryPrompt, perCandidateTimeoutMs),
          requestSingleCandidate(model, almostCookablePrompt, perCandidateTimeoutMs),
        ]);

    const pantryParsed =
      pantryResponse.status === "fulfilled"
        ? normalizeCandidate(pantryResponse.value.parsed?.recipe, state.locale)
        : null;
    const almostCookableParsed =
      almostCookableResponse.status === "fulfilled"
        ? normalizeCandidate(almostCookableResponse.value.parsed?.recipe, state.locale)
        : null;
    const response =
      pantryParsed || almostCookableParsed
        ? {
            parsed: {
              pantryRecipe: pantryParsed ?? {
                status: "unavailable" as const,
                reason: "AI_UNABLE_TO_COMPOSE" as const,
              },
              almostCookableRecipe: almostCookableParsed ?? {
                status: "unavailable" as const,
                reason: "AI_UNABLE_TO_COMPOSE" as const,
              },
            },
            raw: null,
          }
        : null;

    const pantryRawContent =
      pantryResponse.status === "fulfilled" &&
      pantryResponse.value.raw &&
      typeof pantryResponse.value.raw === "object" &&
      "content" in pantryResponse.value.raw
        ? typeof pantryResponse.value.raw.content === "string"
          ? pantryResponse.value.raw.content
          : Array.isArray(pantryResponse.value.raw.content)
            ? pantryResponse.value.raw.content
                .map((part) =>
                  typeof part === "object" &&
                  part !== null &&
                  "text" in part &&
                  typeof part.text === "string"
                    ? part.text
                    : "",
                )
                .join("")
            : JSON.stringify(pantryResponse.value.raw.content)
        : "";
    const almostRawContent =
      almostCookableResponse.status === "fulfilled" &&
      almostCookableResponse.value.raw &&
      typeof almostCookableResponse.value.raw === "object" &&
      "content" in almostCookableResponse.value.raw
        ? typeof almostCookableResponse.value.raw.content === "string"
          ? almostCookableResponse.value.raw.content
          : Array.isArray(almostCookableResponse.value.raw.content)
            ? almostCookableResponse.value.raw.content
                .map((part) =>
                  typeof part === "object" &&
                  part !== null &&
                  "text" in part &&
                  typeof part.text === "string"
                    ? part.text
                    : "",
                )
                .join("")
            : JSON.stringify(almostCookableResponse.value.raw.content)
        : "";

    const content = [pantryRawContent, almostRawContent].filter(Boolean).join("\n");
    const extracted = extractJson(content);
    const likelyTruncated = false;

    // Collect structural metrics for debugging
    const trimmed = extracted.trim();
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;

    // Log output characteristics for monitoring
    apiLogger.info("[customRecipe.recipeRequest] AI response received", {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
        rawContentLength: content.length,
        extractedJsonLength: extracted.length,
        structuredParseSucceeded: response !== null,
        likelyTruncated,
        braceBalance: openBraces === closeBraces,
        bracketBalance: openBrackets === closeBrackets,
        endsWithBrace: trimmed.endsWith("}"),
        pantryCallSucceeded: pantryResponse.status === "fulfilled",
        almostCookableCallSucceeded: almostCookableResponse.status === "fulfilled",
        pantryCandidateSummary: summarizeCandidate(pantryParsed),
        almostCookableCandidateSummary: summarizeCandidate(almostCookableParsed),
        previousGeneratedRecipeName: state.previousGeneratedRecipe?.name ?? null,
        previousGeneratedRecipeJobId: state.previousGeneratedRecipeJobId,
        retryCount: state.retryCount,
      },
    });

    if (response?.parsed) {
      const normalizedOutput = JSON.stringify(response.parsed);

      apiLogger.info(
        "[customRecipe.recipeRequest] structured output parsed successfully",
        {
          metadata: {
            userId: state.userId,
            userProfileId: state.userProfileId,
            mode: state.mode,
            pantryRecipeStatus: response.parsed.pantryRecipe.status,
            almostCookableStatus: response.parsed.almostCookableRecipe.status,
            normalizedOutputLength: normalizedOutput.length,
            referenceRecipeCount:
              referenceRecipeMatches.cookable.length +
              referenceRecipeMatches.almostCookable.length,
            perCandidateTimeoutMs,
            retryCount: state.retryCount,
          },
        },
      );

      return {
        parsedAiOutput: null,
        rawAiOutput: normalizedOutput,
        requestError: null,
      };
    }

    const rejectionReasons = [pantryResponse, almostCookableResponse]
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) =>
        result.reason instanceof Error ? result.reason.message : "unknown error",
      );

    apiLogger.warn(
      "[customRecipe.recipeRequest] both candidate requests failed",
      {
        metadata: {
          userId: state.userId,
          userProfileId: state.userProfileId,
          retryCount: state.retryCount + 1,
          rejectionReasons,
        },
      },
    );

    return {
      rawAiOutput: null,
      parsedAiOutput: null,
      requestError:
        rejectionReasons[0] ?? "Recipe generation request failed",
      retryCount: state.retryCount + 1,
    };
  } catch (error) {
    apiLogger.warn("[customRecipe.recipeRequest] AI request failed", {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
        retryCount: state.retryCount + 1,
        errorMessage: error instanceof Error ? error.message : "unknown error",
        errorType: error instanceof Error ? error.constructor.name : typeof error,
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
