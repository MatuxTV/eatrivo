import { z } from "zod";

import type { MatchedRecipe } from "@/lib/recipes/recipe-matches";
import { parseRecipeIngredient } from "@/lib/ingredients/ingredients";
import { buildRecipeIngredientPantryComparison } from "@/lib/recipes/recipe-quantity-comparison";
import { guessFoodCategory } from "@/lib/ingredients/units";
import { validateCustomRecipeIngredientAmountFormat } from "./unit-validation";

const localeSchema = z.enum(["en", "sk"]);
const customRecipeJobIdSchema = z.string().uuid();
export const customRecipeModeSchema = z.enum(["pantry", "preferences_only"]);
export const customRecipeMealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

const messageValuesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);

export const messageDescriptorSchema = z.object({
  key: z.string().min(1),
  values: messageValuesSchema.optional(),
});

export const customRecipeStartRequestSchema = z.object({
  locale: localeSchema.optional(),
  fallbackSuggestionLimit: z.coerce.number().int().min(1).max(6).default(4),
  servings: z.coerce.number().int().min(1).max(8).default(2),
  mealType: customRecipeMealTypeSchema.default("dinner"),
  mealPrep: z.coerce.boolean().default(false),
  mode: customRecipeModeSchema.default("pantry"),
});

export const customRecipeInstructionSchema = z.object({
  title: z.string().max(120),
  text: z.string().min(1).max(500),
});

const localeNeutralKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const customRecipeAllowedCategoryKeySchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
]);

const customRecipeIngredientTranslationSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
});

const customRecipeIngredientTranslationsSchema = z.object({
  en: customRecipeIngredientTranslationSchema,
  sk: customRecipeIngredientTranslationSchema,
});

const customRecipeRecipeTranslationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category_label: z.string().trim().min(1).max(80).nullable(),
  serving_unit_label: z.string().trim().min(1).max(40).nullable(),
  instructions: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
  notes: z.string().trim().min(1).max(280).nullable(),
});

const customRecipeRecipeTranslationsSchema = z.object({
  en: customRecipeRecipeTranslationSchema,
  sk: customRecipeRecipeTranslationSchema,
});

const customRecipeCanonicalIngredientSchema = z.object({
  ingredient_key: z.string().max(160).nullable(),
  ingredient_specific_key: z.string().max(200).nullable(),
  canonical_name: z.string().max(120).nullable(),
  pantry_tracking_hint: z.enum(["quantity", "availability"]).nullable(),
  quantity: z.number().finite().nullable(),
  unit: z.string().max(40).nullable(),
  optional: z.boolean(),
  sort_order: z.number().int().min(0),
  translations: customRecipeIngredientTranslationsSchema,
});

export const customRecipeCanonicalRecipeSchema = z.object({
  default_locale: localeSchema,
  category_key: customRecipeAllowedCategoryKeySchema,
  diet_tags: z.array(localeNeutralKeySchema).max(8),
  restriction_flags: z.array(localeNeutralKeySchema).max(12),
  servings: z.number().int().min(1).max(12),
  prep_time_min: z.number().int().min(1).max(240),
  total_time_min: z.number().int().min(1).max(360),
  nutrition_per_serving: z.object({
    calories: z.number().int().min(0).max(3000),
    protein_g: z.number().min(0).max(300),
    carbohydrates_g: z.number().min(0).max(500),
    fat_g: z.number().min(0).max(200),
  }),
  ingredients: z.array(customRecipeCanonicalIngredientSchema).min(1).max(20),
  translations: customRecipeRecipeTranslationsSchema,
  meal_prep_friendly: z.boolean(),
});

export const customRecipeIngredientItemSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().max(80).nullable(),
  category: z.string().max(80).nullable().optional(),
  quantityValue: z.number().finite().nullable().optional(),
  unit: z.string().max(40).nullable().optional(),
  ingredientKey: z.string().max(160).nullable().optional(),
  ingredientSpecificKey: z.string().max(200).nullable().optional(),
  pantryMatchName: z.string().max(120).nullable().optional(),
  pantryTrackingMode: z.enum(["quantity", "availability"]).nullable().optional(),
  pantryInStock: z.boolean().nullable().optional(),
  isAvailabilityStaple: z.boolean().optional(),
  pantryComparison: z
    .object({
      status: z.enum([
        "enough",
        "insufficient",
        "unit-mismatch",
        "missing-pantry-quantity",
        "missing-recipe-quantity",
        "available-staple",
        "unavailable",
      ]),
      canCompare: z.boolean(),
      isEnough: z.boolean().nullable(),
      requiredQuantity: z.number().finite().nullable(),
      requiredUnit: z.string().max(40).nullable(),
      requiredLabel: z.string().max(80).nullable(),
      availableQuantity: z.number().finite().nullable(),
      availableUnit: z.string().max(40).nullable(),
      availableLabel: z.string().max(80).nullable(),
      missingQuantity: z.number().finite().nullable(),
      missingLabel: z.string().max(80).nullable(),
      matchingPantryItems: z.number().int().min(0),
    })
    .nullable()
    .optional(),
});

const customRecipeMatchedIngredientSchema = z.object({
  recipeIngredientName: z.string().min(1).max(120),
  pantryIngredientName: z.string().min(1).max(120).nullable(),
  matchType: z.enum(["exact", "fallback"]),
  displayName: z.string().min(1).max(180),
  amount: z.string().max(80).nullable(),
  pantryTrackingMode: z.enum(["quantity", "availability"]).nullable().optional(),
  isAvailabilityStaple: z.boolean().optional(),
});

export const customRecipeAiIngredientSchema = z
  .object({
    name: z.string().min(1).max(120),
    amount: z.string().max(80).nullable(),
    pantryStatus: z.enum(["pantry", "missing"]),
    pantryMatchName: z.string().min(1).max(120).nullable(),
    translations: customRecipeIngredientTranslationsSchema,
  })
  .superRefine((ingredient, ctx) => {
    if (
      ingredient.pantryStatus === "pantry" &&
      (!ingredient.pantryMatchName || ingredient.pantryMatchName.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pantry ingredients must include pantryMatchName",
      });
    }

    if (ingredient.pantryStatus === "missing" && ingredient.pantryMatchName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Missing ingredients cannot include pantryMatchName",
      });
    }

    for (const issue of validateCustomRecipeIngredientAmountFormat({
      ingredientName: ingredient.name,
      amount: ingredient.amount,
    })) {
      // Allow flexible amounts or missing amounts if the ingredient is already in the pantry.
      // This prevents the AI from catastrophically failing generation if it describes
      // user's availability items with vague quantities like "podľa chuti" or "1 balenie".
      if (ingredient.pantryStatus === "pantry" && issue.errorType === "unit_format_error") {
        continue;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
      });
    }
  });

const customRecipeAiNutritionSchema = z.object({
  calories: z.number().int().min(0).max(3000),
  proteinG: z.number().min(0).max(300),
  carbohydratesG: z.number().min(0).max(500),
  fatG: z.number().min(0).max(200),
});

const customRecipeAvailableAiCandidateSchema = z
  .object({
    status: z.literal("available"),
    name: z.string().min(1).max(120),
    category: customRecipeAllowedCategoryKeySchema,
    description: z.string().min(1).max(280),
    dietTags: z.array(localeNeutralKeySchema).max(8),
    restrictionFlags: z.array(localeNeutralKeySchema).max(12),
    servings: z.number().int().min(1).max(12),
    servingUnit: z.string().max(40).nullable(),
    prepTimeMin: z.number().int().min(1).max(240),
    totalTimeMin: z.number().int().min(1).max(360),
    difficulty: z.enum(["easy", "medium", "hard"]),
    mealPrepFriendly: z.boolean(),
    tags: z.array(z.string().min(1).max(40)).max(8),
    nutrition: customRecipeAiNutritionSchema,
    ingredients: z.array(customRecipeAiIngredientSchema).min(1).max(20),
    instructions: z.array(customRecipeInstructionSchema).min(1).max(12),
    translations: customRecipeRecipeTranslationsSchema,
  })
  .superRefine((candidate, ctx) => {
    if (candidate.totalTimeMin < candidate.prepTimeMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalTimeMin must be greater than or equal to prepTimeMin",
      });
    }
  });

const customRecipeUnavailableAiCandidateSchema = z.object({
  status: z.literal("unavailable"),
  reason: z.enum([
    "INSUFFICIENT_PANTRY",
    "AI_UNABLE_TO_COMPOSE",
    "PANTRY_EMPTY",
    "DIETARY_CONSTRAINTS",
  ]),
});

export const customRecipeAiCandidateSchema = z.union([
  customRecipeAvailableAiCandidateSchema,
  customRecipeUnavailableAiCandidateSchema,
]);

export const customRecipeAiOutputSchema = z
  .object({
    pantryRecipe: customRecipeAiCandidateSchema,
    almostCookableRecipe: customRecipeAiCandidateSchema,
  })
  .superRefine((output, ctx) => {
    if (
      output.pantryRecipe.status === "available" &&
      output.pantryRecipe.ingredients.some(
        (ingredient) => ingredient.pantryStatus !== "pantry",
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pantryRecipe can only contain pantry ingredients",
        path: ["pantryRecipe"],
      });
    }

    if (
      output.almostCookableRecipe.status === "available" &&
      output.almostCookableRecipe.ingredients.filter(
        (ingredient) => ingredient.pantryStatus === "missing",
      ).length > 3
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "almostCookableRecipe cannot have more than 3 missing ingredients",
        path: ["almostCookableRecipe"],
      });
    }
  });

export const customRecipeUnavailableSchema = z.object({
  status: z.literal("unavailable"),
  reason: z.enum([
    "INSUFFICIENT_PANTRY",
    "AI_UNABLE_TO_COMPOSE",
    "PANTRY_EMPTY",
    "DIETARY_CONSTRAINTS",
  ]),
  message: messageDescriptorSchema,
});

export const customRecipeGeneratedRecipeSchema = z.object({
  status: z.literal("available"),
  kind: z.enum(["pantry", "almost_cookable", "preferences_only"]),
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80),
  description: z.string().min(1).max(280),
  servings: z.number().int().min(1).max(12),
  servingUnit: z.string().max(40).nullable(),
  prepTimeMin: z.number().int().min(1).max(240),
  totalTimeMin: z.number().int().min(1).max(360),
  difficulty: z.enum(["easy", "medium", "hard"]),
  mealPrepFriendly: z.boolean(),
  tags: z.array(z.string().min(1).max(40)).max(8),
  calories: z.number().int().min(0).max(3000),
  proteinG: z.number().min(0).max(300),
  carbohydratesG: z.number().min(0).max(500),
  fatG: z.number().min(0).max(200),
  ingredientItems: z.array(customRecipeIngredientItemSchema).min(1).max(20),
  instructions: z.array(customRecipeInstructionSchema).min(1).max(12),
  matchedIngredients: z.array(customRecipeMatchedIngredientSchema).max(20).default([]),
  matchedIngredientNames: z.array(z.string().min(1).max(120)).max(20),
  missingIngredientNames: z.array(z.string().min(1).max(120)).max(3),
  canonicalRecipe: customRecipeCanonicalRecipeSchema.optional(),
});

export const customRecipeAcceptRequestSchema = z.object({
  locale: localeSchema,
  recipe: customRecipeGeneratedRecipeSchema,
  waitForPersist: z.coerce.boolean().default(false),
});

export const customRecipeAcceptResponseSchema = z.object({
  accepted: z.literal(true),
  recipeId: z.string().uuid().optional(),
  slug: z.string().min(1).optional(),
  externalKey: z.string().min(1).optional(),
});

export const customRecipeSuggestionSchema = z.object({
  kind: z.literal("suggestion"),
  availability: z.enum(["pantry", "almost_cookable", "preferences_only"]),
  id: z.string().uuid(),
  slug: z.string().min(1),
  externalKey: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  categoryKey: z.string().min(1),
  servings: z.number().int().min(1),
  servingUnit: z.string().nullable(),
  prepTimeMin: z.number().int().min(0),
  totalTimeMin: z.number().int().min(0),
  calories: z.number().int().min(0),
  proteinG: z.number().min(0),
  carbohydratesG: z.number().min(0),
  fatG: z.number().min(0),
  instructions: z.array(customRecipeInstructionSchema),
  ingredientItems: z.array(customRecipeIngredientItemSchema),
  mealPrepFriendly: z.boolean(),
  totalRequiredIngredients: z.number().int().min(0),
  matchedRequiredIngredients: z.number().int().min(0),
  quantityMatchedIngredients: z.number().int().min(0),
  availabilityMatchedIngredients: z.number().int().min(0),
  missingRequiredIngredients: z.number().int().min(0).max(3),
  matchRatio: z.number().min(0).max(1),
  matchedIngredientNames: z.array(z.string().min(1)),
  missingIngredientNames: z.array(z.string().min(1)).max(3),
});

export const customRecipeResultSchema = z.object({
  pantryRecipe: z.union([
    customRecipeGeneratedRecipeSchema,
    customRecipeUnavailableSchema,
  ]),
  almostCookableRecipe: z.union([
    customRecipeGeneratedRecipeSchema,
    customRecipeUnavailableSchema,
  ]),
  fallbackDatabaseSuggestions: z.array(customRecipeSuggestionSchema).max(6),
  userMessage: messageDescriptorSchema,
  meta: z.object({
    locale: localeSchema,
    mode: customRecipeModeSchema,
    pantryItemCount: z.number().int().min(0),
    pantryIngredientKeyCount: z.number().int().min(0),
    fallbackUsed: z.boolean(),
    retryCount: z.number().int().min(0),
  }),
});

export const customRecipeCurrentGenerationResponseSchema = z.object({
  jobId: customRecipeJobIdSchema.nullable(),
  isGenerating: z.boolean(),
  progress: z.number().int().min(0).max(100).optional(),
  label: z.string().min(1).optional(),
  node: z.string().min(1).optional(),
  retryCount: z.number().int().min(0).optional(),
});

export const customRecipeLatestResultResponseSchema = z.object({
  jobId: customRecipeJobIdSchema,
  createdAt: z.string().datetime(),
  result: customRecipeResultSchema,
});

export const customRecipeProgressStreamEventSchema = z.object({
  type: z.literal("progress"),
  jobId: customRecipeJobIdSchema,
  progress: z.number().int().min(0).max(100),
  label: z.string().min(1),
  node: z.string().min(1),
  retryCount: z.number().int().min(0),
  done: z.boolean(),
  failed: z.boolean(),
});

export const customRecipeFinalStreamEventSchema = z.object({
  type: z.literal("final"),
  jobId: customRecipeJobIdSchema,
  progress: z.literal(100),
  label: z.string().min(1),
  node: z.string().min(1),
  retryCount: z.number().int().min(0),
  done: z.literal(true),
  userCreated: z.literal(true),
  result: customRecipeResultSchema,
});

export const customRecipeErrorStreamEventSchema = z.object({
  type: z.literal("error"),
  jobId: customRecipeJobIdSchema,
  code: z.string().min(1),
  message: z.string().min(1),
  progress: z.number().int().min(0).max(100),
  label: z.string().min(1),
  node: z.string().min(1),
});

export const customRecipeStreamEventSchema = z.discriminatedUnion("type", [
  customRecipeProgressStreamEventSchema,
  customRecipeFinalStreamEventSchema,
  customRecipeErrorStreamEventSchema,
]);

export type MessageDescriptor = z.infer<typeof messageDescriptorSchema>;
export type CustomRecipeStartRequest = z.infer<
  typeof customRecipeStartRequestSchema
>;
export type CustomRecipeMode = z.infer<typeof customRecipeModeSchema>;
export type CustomRecipeAcceptRequest = z.infer<
  typeof customRecipeAcceptRequestSchema
>;
export type CustomRecipeAiOutput = z.infer<typeof customRecipeAiOutputSchema>;
export type CustomRecipeGeneratedRecipe = z.infer<
  typeof customRecipeGeneratedRecipeSchema
>;
export type CustomRecipeUnavailable = z.infer<
  typeof customRecipeUnavailableSchema
>;
export type CustomRecipeSuggestion = z.infer<
  typeof customRecipeSuggestionSchema
>;
export type CustomRecipeResult = z.infer<typeof customRecipeResultSchema>;
export type CustomRecipeCurrentGenerationResponse = z.infer<
  typeof customRecipeCurrentGenerationResponseSchema
>;
export type CustomRecipeLatestResultResponse = z.infer<
  typeof customRecipeLatestResultResponseSchema
>;
export type CustomRecipeStreamEvent = z.infer<
  typeof customRecipeStreamEventSchema
>;
export type CustomRecipeProgressStreamEvent = z.infer<
  typeof customRecipeProgressStreamEventSchema
>;
export type CustomRecipeFinalStreamEvent = z.infer<
  typeof customRecipeFinalStreamEventSchema
>;
export type CustomRecipeErrorStreamEvent = z.infer<
  typeof customRecipeErrorStreamEventSchema
>;

export interface CustomRecipePantryContextItem {
  id: string;
  pantryName: string;
  ingredientName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  trackingMode: "quantity" | "availability";
  inStock: boolean;
  quantity: string | null;
  unit: string | null;
  category: string | null;
}

function normalizeLookup(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeLocaleNeutralKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function resolveRecipeTranslation(
  translations: Extract<
    CustomRecipeAiOutput["pantryRecipe"],
    { status: "available" }
  >["translations"],
  locale: "en" | "sk",
) {
  return translations[locale] ?? translations.en;
}

function resolveIngredientDisplayName(
  ingredient: Extract<
    CustomRecipeAiOutput["pantryRecipe"],
    { status: "available" }
  >["ingredients"][number],
  locale: "en" | "sk",
): string {
  return ingredient.translations[locale]?.display_name?.trim()
    || ingredient.translations.en.display_name.trim()
    || ingredient.name.trim();
}

function buildMatchedIngredientDisplayName(
  recipeIngredientName: string,
  pantryIngredientName: string | null,
  matchType: "exact" | "fallback",
): string {
  if (
    matchType === "fallback" &&
    pantryIngredientName &&
    normalizeLookup(pantryIngredientName) !== normalizeLookup(recipeIngredientName)
  ) {
    return `${recipeIngredientName} (${pantryIngredientName})`;
  }

  return recipeIngredientName;
}

function findPantryMatch(
  pantryRows: CustomRecipePantryContextItem[],
  pantryMatchName: string | null,
): CustomRecipePantryContextItem | null {
  const normalizedPantryMatchName = normalizeLookup(pantryMatchName);

  if (!normalizedPantryMatchName) {
    return null;
  }

  return (
    pantryRows.find(
      (row) => normalizeLookup(row.pantryName) === normalizedPantryMatchName,
    ) ?? null
  );
}

export function buildMessageDescriptor(
  key: string,
  values?: Record<string, string | number | boolean>,
): MessageDescriptor {
  return values ? { key, values } : { key };
}

export function buildUnavailableRecipe(
  reason: CustomRecipeUnavailable["reason"],
  message: MessageDescriptor,
): CustomRecipeUnavailable {
  return {
    status: "unavailable",
    reason,
    message,
  };
}

function normalizeCustomRecipeIngredientItem(
    ingredient: Extract<
      CustomRecipeAiOutput["pantryRecipe"],
      { status: "available" }
    >["ingredients"][number],
  options?: {
    pantryRows?: CustomRecipePantryContextItem[];
    locale?: "en" | "sk";
  },
): CustomRecipeGeneratedRecipe["ingredientItems"][number] {
  const previewLocale = options?.locale ?? "en";
  const localizedName = resolveIngredientDisplayName(ingredient, previewLocale);
  const combinedValue = [ingredient.amount?.trim(), ingredient.name.trim()]
    .filter(Boolean)
    .join(" ");
  const parsedIngredient = parseRecipeIngredient(combinedValue || ingredient.name);
  let pantryMatch = findPantryMatch(
    options?.pantryRows ?? [],
    ingredient.pantryStatus === "pantry" ? ingredient.pantryMatchName : null,
  );

  // If the AI flagged it as a pantry item but we didn't find it in the user's specific rows,
  // and the amount is null/omitted (which identifies it as a basic seasoning/oil staple according to our prompt),
  // we synthetically inject an availability match so the UI knows the user inherently has it.
  if (!pantryMatch && ingredient.pantryStatus === "pantry" && !ingredient.amount) {
    pantryMatch = {
      pantryName: ingredient.pantryMatchName || ingredient.name,
      trackingMode: "availability",
      inStock: true,
    } as unknown as CustomRecipePantryContextItem;
  }

  const pantryComparison = options?.locale
    ? buildRecipeIngredientPantryComparison(
        parsedIngredient.quantity,
        parsedIngredient.unit,
        pantryMatch ? [pantryMatch] : [],
        options.locale,
      )
    : null;

  return {
    name: localizedName,
    amount: ingredient.amount,
    category:
      pantryMatch?.category ??
      guessFoodCategory(parsedIngredient.ingredientName ?? ingredient.name),
    quantityValue: parsedIngredient.quantity,
    unit: parsedIngredient.unit,
    ingredientKey: pantryMatch?.ingredientKey ?? parsedIngredient.ingredientKey,
    ingredientSpecificKey: pantryMatch?.ingredientSpecificKey ?? null,
    pantryMatchName: pantryMatch?.pantryName ?? ingredient.pantryMatchName ?? null,
    pantryTrackingMode: pantryMatch?.trackingMode ?? null,
    pantryInStock: pantryMatch?.inStock ?? null,
    isAvailabilityStaple: pantryMatch?.trackingMode === "availability",
    pantryComparison,
  };
}

function buildGeneratedMatchedIngredients(
  candidate: Extract<
    CustomRecipeAiOutput["pantryRecipe"],
    { status: "available" }
  >,
  ingredientItems: CustomRecipeGeneratedRecipe["ingredientItems"],
  locale: "en" | "sk",
): CustomRecipeGeneratedRecipe["matchedIngredients"] {
  return candidate.ingredients
    .filter((ingredient) => ingredient.pantryStatus === "pantry")
    .map((ingredient, index) => {
      const matchedItem = ingredientItems[index];
      const pantryIngredientName =
        matchedItem?.pantryMatchName ?? ingredient.pantryMatchName ?? null;
      const recipeIngredientName =
        matchedItem?.name ?? resolveIngredientDisplayName(ingredient, locale);
      const matchType =
        pantryIngredientName
        && normalizeLookup(pantryIngredientName) === normalizeLookup(recipeIngredientName)
          ? "exact"
          : "fallback";

      return {
        recipeIngredientName,
        pantryIngredientName,
        matchType,
        displayName: buildMatchedIngredientDisplayName(
          recipeIngredientName,
          pantryIngredientName,
          matchType,
        ),
        amount: matchedItem?.amount ?? ingredient.amount,
        pantryTrackingMode: matchedItem?.pantryTrackingMode ?? null,
        isAvailabilityStaple: matchedItem?.isAvailabilityStaple ?? false,
      };
    });
}

function buildCanonicalRecipe(
  candidate: Extract<
    CustomRecipeAiOutput["pantryRecipe"],
    { status: "available" }
  >,
  ingredientItems: CustomRecipeGeneratedRecipe["ingredientItems"],
): NonNullable<CustomRecipeGeneratedRecipe["canonicalRecipe"]> {
  return customRecipeCanonicalRecipeSchema.parse({
    default_locale: "en",
    category_key: candidate.category,
    diet_tags: [...new Set(candidate.dietTags.map(normalizeLocaleNeutralKey).filter(Boolean))],
    restriction_flags: [
      ...new Set(candidate.restrictionFlags.map(normalizeLocaleNeutralKey).filter(Boolean)),
    ],
    servings: candidate.servings,
    prep_time_min: candidate.prepTimeMin,
    total_time_min: candidate.totalTimeMin,
    nutrition_per_serving: {
      calories: candidate.nutrition.calories,
      protein_g: candidate.nutrition.proteinG,
      carbohydrates_g: candidate.nutrition.carbohydratesG,
      fat_g: candidate.nutrition.fatG,
    },
    ingredients: candidate.ingredients.map((ingredient, index) =>
      customRecipeCanonicalIngredientSchema.parse({
        ingredient_key: ingredientItems[index]?.ingredientKey ?? null,
        ingredient_specific_key: ingredientItems[index]?.ingredientSpecificKey ?? null,
        canonical_name: normalizeNullableString(ingredient.name),
        pantry_tracking_hint: ingredientItems[index]?.pantryTrackingMode ?? null,
        quantity:
          typeof ingredientItems[index]?.quantityValue === "number"
          && Number.isFinite(ingredientItems[index]?.quantityValue)
            ? ingredientItems[index]?.quantityValue ?? null
            : null,
        unit: normalizeNullableString(ingredientItems[index]?.unit),
        optional: false,
        sort_order: index,
        translations: {
          en: {
            display_name: ingredient.translations.en.display_name.trim(),
          },
          sk: {
            display_name: ingredient.translations.sk.display_name.trim(),
          },
        },
      }),
    ),
    translations: {
      en: {
        name: candidate.translations.en.name.trim(),
        category_label: normalizeNullableString(candidate.translations.en.category_label),
        serving_unit_label: normalizeNullableString(
          candidate.translations.en.serving_unit_label,
        ),
        instructions: candidate.translations.en.instructions.map((instruction) =>
          instruction.trim(),
        ),
        notes: normalizeNullableString(candidate.translations.en.notes),
      },
      sk: {
        name: candidate.translations.sk.name.trim(),
        category_label: normalizeNullableString(candidate.translations.sk.category_label),
        serving_unit_label: normalizeNullableString(
          candidate.translations.sk.serving_unit_label,
        ),
        instructions: candidate.translations.sk.instructions.map((instruction) =>
          instruction.trim(),
        ),
        notes: normalizeNullableString(candidate.translations.sk.notes),
      },
    },
    meal_prep_friendly: candidate.mealPrepFriendly,
  });
}

export function mapAiCandidateToGeneratedRecipe(
  candidate: Extract<
    CustomRecipeAiOutput["pantryRecipe"],
    { status: "available" }
  >,
  kind: CustomRecipeGeneratedRecipe["kind"],
  options?: {
    pantryRows?: CustomRecipePantryContextItem[];
    locale?: "en" | "sk";
  },
): CustomRecipeGeneratedRecipe {
  const previewLocale = options?.locale ?? "en";
  const ingredientItems = candidate.ingredients.map((ingredient) =>
    normalizeCustomRecipeIngredientItem(ingredient, options),
  );
  const matchedIngredients = buildGeneratedMatchedIngredients(
    candidate,
    ingredientItems,
    previewLocale,
  );
  const localizedTranslation = resolveRecipeTranslation(
    candidate.translations,
    previewLocale,
  );
  const matchedIngredientNames = matchedIngredients.map(
    (ingredient) => ingredient.displayName,
  );
  const missingIngredientNames = candidate.ingredients
    .filter((ingredient) => ingredient.pantryStatus === "missing")
    .map((ingredient) => resolveIngredientDisplayName(ingredient, previewLocale));
  const canonicalRecipe = buildCanonicalRecipe(candidate, ingredientItems);

  return {
    status: "available",
    kind,
    name: localizedTranslation.name,
    category:
      localizedTranslation.category_label
      ?? candidate.translations.en.category_label
      ?? candidate.category,
    description: localizedTranslation.notes ?? candidate.description,
    servings: candidate.servings,
    servingUnit:
      localizedTranslation.serving_unit_label
      ?? candidate.translations.en.serving_unit_label
      ?? candidate.servingUnit,
    prepTimeMin: candidate.prepTimeMin,
    totalTimeMin: candidate.totalTimeMin,
    difficulty: candidate.difficulty,
    mealPrepFriendly: candidate.mealPrepFriendly,
    tags: candidate.tags,
    calories: candidate.nutrition.calories,
    proteinG: candidate.nutrition.proteinG,
    carbohydratesG: candidate.nutrition.carbohydratesG,
    fatG: candidate.nutrition.fatG,
    ingredientItems,
    instructions: localizedTranslation.instructions.map((instruction) => ({
      title: "",
      text: instruction,
    })),
    matchedIngredients,
    matchedIngredientNames,
    missingIngredientNames,
    canonicalRecipe,
  };
}

export function mapMatchedRecipeToSuggestion(
  recipe: MatchedRecipe,
  availability: CustomRecipeSuggestion["availability"],
): CustomRecipeSuggestion {
  const availabilityMatchedIngredients = recipe.matchedIngredients.filter(
    (ingredient) => ingredient.pantryComparison?.status === "available-staple",
  ).length;

  return {
    kind: "suggestion",
    availability,
    id: recipe.id,
    slug: recipe.slug,
    externalKey: recipe.externalKey,
    name: recipe.name,
    category: recipe.category,
    categoryKey: recipe.categoryKey,
    servings: recipe.servings,
    servingUnit: recipe.servingUnit,
    prepTimeMin: recipe.prepTimeMin,
    totalTimeMin: recipe.totalTimeMin,
    calories: recipe.calories,
    proteinG: recipe.proteinG,
    carbohydratesG: recipe.carbohydratesG,
    fatG: recipe.fatG,
    instructions: recipe.instructions,
    ingredientItems: recipe.ingredientItems,
    mealPrepFriendly: recipe.mealPrepFriendly,
    totalRequiredIngredients: recipe.totalRequiredIngredients,
    matchedRequiredIngredients: recipe.matchedRequiredIngredients,
    quantityMatchedIngredients:
      recipe.matchedRequiredIngredients - availabilityMatchedIngredients,
    availabilityMatchedIngredients,
    missingRequiredIngredients: recipe.missingRequiredIngredients,
    matchRatio: recipe.matchRatio,
    matchedIngredientNames: recipe.matchedIngredientNames,
    missingIngredientNames: recipe.missingIngredientNames,
  };
}
