import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/pool";
import {
  recipeIngredients,
  recipeIngredientTranslations,
  recipes,
  recipeTranslations,
} from "@/db/schema";
import type { CustomRecipeGeneratedRecipe } from "@/lib/custom-recipes/contracts";
import { parseRecipeIngredient } from "@/lib/ingredients";
import { apiLogger } from "@/lib/logger";
import { guessFoodCategory, normalizeUnit } from "@/lib/units";

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildRecipeDisplayIngredient(
  ingredient: CustomRecipeGeneratedRecipe["ingredientItems"][number],
): string {
  const amount = ingredient.amount?.trim();
  const name = ingredient.name.trim();
  return amount ? `${amount} ${name}` : name;
}

function buildPersistedIngredient(
  ingredient: CustomRecipeGeneratedRecipe["ingredientItems"][number],
  locale: "en" | "sk",
  sortOrder: number,
) {
  const displayName = buildRecipeDisplayIngredient(ingredient);
  const parsedIngredient = parseRecipeIngredient(displayName);
  const normalizedQuantity =
    typeof ingredient.quantityValue === "number" &&
    Number.isFinite(ingredient.quantityValue)
      ? ingredient.quantityValue
      : parsedIngredient.quantity;
  const normalizedUnit = ingredient.unit?.trim()
    ? normalizeUnit(ingredient.unit)
    : parsedIngredient.unit;
  const ingredientName = parsedIngredient.ingredientName ?? ingredient.name.trim();
  const category = ingredient.category?.trim()
    ? ingredient.category.trim()
    : guessFoodCategory(ingredientName);

  return {
    category,
    json: {
      ingredient_key: ingredient.ingredientKey ?? parsedIngredient.ingredientKey,
      ingredient_specific_key: ingredient.ingredientSpecificKey ?? null,
      canonical_name: ingredient.name.trim() ? ingredient.name.trim() : ingredientName,
      quantity: normalizedQuantity,
      unit: normalizedUnit,
      optional: false,
      sort_order: sortOrder,
      category,
      translations: {
        [locale]: {
          display_name: displayName,
          ingredient_name: ingredientName,
        },
      },
    },
    row: {
      displayName,
      ingredientName,
      ingredientKey: ingredient.ingredientKey ?? parsedIngredient.ingredientKey,
      ingredientSpecificKey: ingredient.ingredientSpecificKey ?? null,
      quantity: normalizedQuantity !== null ? String(normalizedQuantity) : null,
      unit: normalizedUnit,
      optional: false,
      sortOrder,
    },
    translation: {
      locale,
      displayName,
      ingredientName,
    },
  };
}

function buildRecipeHash(
  userId: string,
  locale: "en" | "sk",
  recipe: CustomRecipeGeneratedRecipe,
): string {
  const normalizedIngredients = recipe.ingredientItems.map((ingredient) => ({
    name: ingredient.name.trim().toLowerCase(),
    amount: ingredient.amount?.trim().toLowerCase() ?? null,
    quantityValue:
      typeof ingredient.quantityValue === "number" && Number.isFinite(ingredient.quantityValue)
        ? ingredient.quantityValue
        : null,
    unit: ingredient.unit?.trim().toLowerCase() ?? null,
  }));

  const normalizedInstructions = recipe.instructions.map((instruction) => ({
    title: instruction.title.trim(),
    text: instruction.text.trim(),
  }));

  return createHash("sha256")
    .update(
      JSON.stringify({
        userId,
        locale,
        name: recipe.name.trim(),
        category: recipe.category.trim(),
        servings: recipe.servings,
        servingUnit: recipe.servingUnit,
        prepTimeMin: recipe.prepTimeMin,
        totalTimeMin: recipe.totalTimeMin,
        calories: recipe.calories,
        proteinG: recipe.proteinG,
        carbohydratesG: recipe.carbohydratesG,
        fatG: recipe.fatG,
        ingredientItems: normalizedIngredients,
        instructions: normalizedInstructions,
      }),
    )
    .digest("hex")
    .slice(0, 24);
}

export interface PersistAcceptedCustomRecipeInput {
  userId: string;
  locale: "en" | "sk";
  recipe: CustomRecipeGeneratedRecipe;
  sourceJobId?: string | null;
}

export async function persistAcceptedCustomRecipe(
  input: PersistAcceptedCustomRecipeInput,
) {
  const categoryKey = slugify(input.recipe.category) || "custom-recipe";
  const recipeHash = buildRecipeHash(input.userId, input.locale, input.recipe);
  const externalKey = `ai-custom:${input.userId}:${recipeHash}`;
  const slugBase = slugify(input.recipe.name) || "custom-recipe";
  const slug = `${slugBase}-${recipeHash.slice(0, 8)}`;
  const persistedIngredients = input.recipe.ingredientItems.map((ingredient, index) =>
    buildPersistedIngredient(ingredient, input.locale, index),
  );

  const recipePayload = {
    slug,
    externalKey,
    source: "ai_custom" as const,
    userGenerated: true,
    createdByUserId: input.userId,
    sourceJobId: input.sourceJobId ?? null,
    name: input.recipe.name,
    category: input.recipe.category,
    categoryKey,
    defaultLocale: input.locale,
    servings: input.recipe.servings,
    servingUnit: input.recipe.servingUnit,
    prepTimeMin: input.recipe.prepTimeMin,
    totalTimeMin: input.recipe.totalTimeMin,
    calories: input.recipe.calories,
    proteinG: Math.round(input.recipe.proteinG),
    carbohydratesG: Math.round(input.recipe.carbohydratesG),
    fatG: Math.round(input.recipe.fatG),
    dietTags: input.recipe.tags,
    restrictionFlags: [],
    ingredients: persistedIngredients.map((ingredient) => ingredient.json),
    instructions: input.recipe.instructions,
    notes: input.recipe.description,
    mealPrepFriendly: input.recipe.mealPrepFriendly,
  };

  const [upsertedRecipe] = await db
    .insert(recipes)
    .values(recipePayload)
    .onConflictDoUpdate({
      target: recipes.externalKey,
      set: {
        slug: recipePayload.slug,
        source: recipePayload.source,
        userGenerated: recipePayload.userGenerated,
        createdByUserId: recipePayload.createdByUserId,
        sourceJobId: recipePayload.sourceJobId,
        name: recipePayload.name,
        category: recipePayload.category,
        categoryKey: recipePayload.categoryKey,
        defaultLocale: recipePayload.defaultLocale,
        servings: recipePayload.servings,
        servingUnit: recipePayload.servingUnit,
        prepTimeMin: recipePayload.prepTimeMin,
        totalTimeMin: recipePayload.totalTimeMin,
        calories: recipePayload.calories,
        proteinG: recipePayload.proteinG,
        carbohydratesG: recipePayload.carbohydratesG,
        fatG: recipePayload.fatG,
        dietTags: recipePayload.dietTags,
        restrictionFlags: recipePayload.restrictionFlags,
        ingredients: recipePayload.ingredients,
        instructions: recipePayload.instructions,
        notes: recipePayload.notes,
        mealPrepFriendly: recipePayload.mealPrepFriendly,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: recipes.id,
      slug: recipes.slug,
      externalKey: recipes.externalKey,
    });

  await db.delete(recipeTranslations).where(eq(recipeTranslations.recipeId, upsertedRecipe.id));
  await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, upsertedRecipe.id));

  await db.insert(recipeTranslations).values({
    recipeId: upsertedRecipe.id,
    locale: input.locale,
    name: input.recipe.name,
    categoryLabel: input.recipe.category,
    servingUnitLabel: input.recipe.servingUnit,
    instructions: input.recipe.instructions,
    notes: input.recipe.description,
    updatedAt: new Date(),
  });

  for (const ingredient of persistedIngredients) {
    const [insertedIngredient] = await db
      .insert(recipeIngredients)
      .values({
        recipeId: upsertedRecipe.id,
        displayName: ingredient.row.displayName,
        ingredientName: ingredient.row.ingredientName,
        ingredientKey: ingredient.row.ingredientKey,
          ingredientSpecificKey: ingredient.row.ingredientSpecificKey,
        quantity: ingredient.row.quantity,
        unit: ingredient.row.unit,
        optional: ingredient.row.optional,
        sortOrder: ingredient.row.sortOrder,
        updatedAt: new Date(),
      })
      .returning({ id: recipeIngredients.id });

    await db.insert(recipeIngredientTranslations).values({
      recipeIngredientId: insertedIngredient.id,
      locale: ingredient.translation.locale,
      displayName: ingredient.translation.displayName,
      ingredientName: ingredient.translation.ingredientName,
      updatedAt: new Date(),
    });
  }

  apiLogger.info("[customRecipe.accept] recipe persisted", {
    metadata: {
      userId: input.userId,
      recipeId: upsertedRecipe.id,
      externalKey: upsertedRecipe.externalKey,
      locale: input.locale,
      sourceJobId: input.sourceJobId ?? null,
    },
  });

  return upsertedRecipe;
}