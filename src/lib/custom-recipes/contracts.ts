import { z } from "zod";

import type { MatchedRecipe } from "@/lib/recipe-matches";

const localeSchema = z.enum(["en", "sk"]);
const customRecipeJobIdSchema = z.string().uuid();

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
});

export const customRecipeInstructionSchema = z.object({
  title: z.string().max(120),
  text: z.string().min(1).max(500),
});

export const customRecipeIngredientItemSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().max(80).nullable(),
  category: z.string().max(80).nullable().optional(),
  quantityValue: z.number().finite().nullable().optional(),
  unit: z.string().max(40).nullable().optional(),
});

export const customRecipeAiIngredientSchema = z
  .object({
    name: z.string().min(1).max(120),
    amount: z.string().max(80).nullable(),
    pantryStatus: z.enum(["pantry", "missing"]),
    pantryMatchName: z.string().min(1).max(120).nullable(),
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
    category: z.string().min(1).max(80),
    description: z.string().min(1).max(280),
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
  kind: z.enum(["pantry", "almost_cookable"]),
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
  matchedIngredientNames: z.array(z.string().min(1).max(120)).max(20),
  missingIngredientNames: z.array(z.string().min(1).max(120)).max(3),
});

export const customRecipeSuggestionSchema = z.object({
  kind: z.literal("suggestion"),
  availability: z.enum(["pantry", "almost_cookable"]),
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
  quantity: string | null;
  unit: string | null;
  category: string | null;
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

export function mapAiCandidateToGeneratedRecipe(
  candidate: Extract<
    CustomRecipeAiOutput["pantryRecipe"],
    { status: "available" }
  >,
  kind: CustomRecipeGeneratedRecipe["kind"],
): CustomRecipeGeneratedRecipe {
  const matchedIngredientNames = candidate.ingredients
    .filter((ingredient) => ingredient.pantryStatus === "pantry")
    .map((ingredient) => ingredient.name);
  const missingIngredientNames = candidate.ingredients
    .filter((ingredient) => ingredient.pantryStatus === "missing")
    .map((ingredient) => ingredient.name);

  return {
    status: "available",
    kind,
    name: candidate.name,
    category: candidate.category,
    description: candidate.description,
    servings: candidate.servings,
    servingUnit: candidate.servingUnit,
    prepTimeMin: candidate.prepTimeMin,
    totalTimeMin: candidate.totalTimeMin,
    difficulty: candidate.difficulty,
    mealPrepFriendly: candidate.mealPrepFriendly,
    tags: candidate.tags,
    calories: candidate.nutrition.calories,
    proteinG: candidate.nutrition.proteinG,
    carbohydratesG: candidate.nutrition.carbohydratesG,
    fatG: candidate.nutrition.fatG,
    ingredientItems: candidate.ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount,
      category: null,
      quantityValue: null,
      unit: null,
    })),
    instructions: candidate.instructions,
    matchedIngredientNames,
    missingIngredientNames,
  };
}

export function mapMatchedRecipeToSuggestion(
  recipe: MatchedRecipe,
  availability: CustomRecipeSuggestion["availability"],
): CustomRecipeSuggestion {
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
    missingRequiredIngredients: recipe.missingRequiredIngredients,
    matchRatio: recipe.matchRatio,
    matchedIngredientNames: recipe.matchedIngredientNames,
    missingIngredientNames: recipe.missingIngredientNames,
  };
}
