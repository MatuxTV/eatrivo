import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

import type { RecipeUrlImportState } from "../state";

const MODEL_NAME = "gemini-3-flash-preview";

const localeKeySchema = z.enum(["en", "sk", "cs", "de", "hu"]);

const ingredientTranslationSchema = z
  .object({
    display_name: z.string(),
  })
  .strict();

const localizedIngredientTranslationsSchema = z
  .object({
    en: ingredientTranslationSchema.optional(),
    sk: ingredientTranslationSchema.optional(),
    cs: ingredientTranslationSchema.optional(),
    de: ingredientTranslationSchema.optional(),
    hu: ingredientTranslationSchema.optional(),
  })
  .strict();

const recipeIngredientSchema = z
  .object({
    ingredient_key: z.string().nullable(),
    ingredient_specific_key: z.string().nullable(),
    canonical_name: z.string().nullable(),
    pantry_tracking_hint: z.enum(["quantity", "availability"]).nullable(),
    quantity: z.number().nullable(),
    unit: z.string().nullable(),
    optional: z.boolean(),
    sort_order: z.number().int(),
    translations: localizedIngredientTranslationsSchema,
  })
  .strict();

const recipeTranslationSchema = z
  .object({
    name: z.string(),
    category_label: z.string().nullable(),
    serving_unit_label: z.string().nullable(),
    instructions: z.array(z.string()),
    notes: z.string().nullable(),
  })
  .strict();

const localizedRecipeTranslationsSchema = z
  .object({
    en: recipeTranslationSchema.optional(),
    sk: recipeTranslationSchema.optional(),
    cs: recipeTranslationSchema.optional(),
    de: recipeTranslationSchema.optional(),
    hu: recipeTranslationSchema.optional(),
  })
  .strict();

const recipeNutritionSchema = z
  .object({
    calories: z.number(),
    protein_g: z.number(),
    carbohydrates_g: z.number(),
    fat_g: z.number(),
  })
  .strict();

const recipeSchema = z
  .object({
    external_key: z.string(),
    default_locale: localeKeySchema,
    category_key: z.string(),
    diet_tags: z.array(z.string()),
    restriction_flags: z.array(z.string()),
    servings: z.number().int(),
    prep_time_min: z.number().int(),
    total_time_min: z.number().int(),
    nutrition_per_serving: recipeNutritionSchema,
    ingredients: z.array(recipeIngredientSchema),
    translations: localizedRecipeTranslationsSchema,
    meal_prep_friendly: z.boolean(),
  })
  .strict();

const rejectedRecipeSchema = z
  .object({
    external_key: z.string(),
    reason: z.string(),
  })
  .strict();

const normalizedRecipeFileSchema = z
  .object({
    recipes: z.array(recipeSchema),
    rejected: z.array(rejectedRecipeSchema),
  })
  .strict();

function hasAtLeastOneTranslation(
  translations: Record<string, unknown>,
): boolean {
  return Object.values(translations).some(Boolean);
}

function validateCanonicalRecipeFile(
  payload: z.infer<typeof normalizedRecipeFileSchema>,
): string[] {
  const issues: string[] = [];

  payload.recipes.forEach((recipe, recipeIndex) => {
    if (!recipe.translations[recipe.default_locale]) {
      issues.push(
        `recipes.${recipeIndex}.translations.${recipe.default_locale}: missing default locale translation`,
      );
    }

    if (!hasAtLeastOneTranslation(recipe.translations)) {
      issues.push(`recipes.${recipeIndex}.translations: at least one locale is required`);
    }

    recipe.ingredients.forEach((ingredient, ingredientIndex) => {
      if (!hasAtLeastOneTranslation(ingredient.translations)) {
        issues.push(
          `recipes.${recipeIndex}.ingredients.${ingredientIndex}.translations: at least one locale is required`,
        );
      }

      if (ingredient.quantity === null) {
        issues.push(
          `recipes.${recipeIndex}.ingredients.${ingredientIndex}.quantity: quantity is required for accepted recipes`,
        );
      }

      if (ingredient.unit === null) {
        issues.push(
          `recipes.${recipeIndex}.ingredients.${ingredientIndex}.unit: unit is required for accepted recipes`,
        );
      }
    });
  });

  return issues;
}

function stringifyRawContent(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }

  if (
    typeof raw === "object" &&
    raw !== null &&
    "content" in raw
  ) {
    const content = (raw as { content?: unknown }).content;

    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (
            typeof part === "object" &&
            part !== null &&
            "text" in part &&
            typeof (part as { text?: unknown }).text === "string"
          ) {
            return (part as { text: string }).text;
          }

          return JSON.stringify(part);
        })
        .join("\n");
    }

    return JSON.stringify(content);
  }

  return JSON.stringify(raw);
}

function persistRawResponse(outputPath: string, rawAiResponse: string | null): void {
  if (!rawAiResponse) {
    return;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(`${outputPath}.raw.txt`, `${rawAiResponse}\n`, "utf8");
}

export async function normalizeRecipe(
  state: typeof RecipeUrlImportState.State,
): Promise<Partial<typeof RecipeUrlImportState.State>> {
  if (!state.prompt || !state.outputPath) {
    return { error: "Missing prompt or output path for recipe normalization." };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { error: "Missing GOOGLE_AI_API_KEY environment variable." };
  }

  let response:
    | {
        parsed?: z.infer<typeof normalizedRecipeFileSchema>;
        raw?: unknown;
      }
    | undefined;

  try {
    const model = new ChatGoogleGenerativeAI({
      model: MODEL_NAME,
      apiKey,
      temperature: 0,
      maxOutputTokens: 12_288,
    });

    const structuredModel = model.withStructuredOutput(
      normalizedRecipeFileSchema,
      {
        method: "functionCalling",
        name: "normalize_recipe_json",
        includeRaw: true,
      },
    );

    response = await structuredModel.invoke([new HumanMessage(state.prompt)]);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Gemini normalization failed.",
    };
  }

  const rawAiResponse = response?.raw ? stringifyRawContent(response.raw) : null;
  persistRawResponse(state.outputPath, rawAiResponse);

  try {
    const validation = normalizedRecipeFileSchema.safeParse(response?.parsed ?? null);

    if (!validation.success) {
      const issues = validation.error.issues
        .slice(0, 5)
        .map((issue) => {
          const path = issue.path.length > 0 ? issue.path.join(".") : "root";
          return `${path}: ${issue.message}`;
        })
        .join("; ");

      return {
        rawAiResponse,
        error: `Invalid AI JSON output: ${issues}`,
      };
    }

    const canonicalIssues = validateCanonicalRecipeFile(validation.data);

    if (canonicalIssues.length > 0) {
      return {
        rawAiResponse,
        error: `Invalid AI JSON output: ${canonicalIssues.slice(0, 5).join("; ")}`,
      };
    }

    const normalizedJson = `${JSON.stringify(validation.data, null, 2)}\n`;

    mkdirSync(dirname(state.outputPath), { recursive: true });
    writeFileSync(state.outputPath, normalizedJson, "utf8");

    return {
      rawAiResponse,
      normalizedJson,
    };
  } catch (error) {
    return {
      rawAiResponse,
      error:
        error instanceof Error
          ? `Invalid AI JSON output: ${error.message}`
          : "Invalid AI JSON output.",
    };
  }
}