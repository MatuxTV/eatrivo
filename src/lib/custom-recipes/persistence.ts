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
import { apiLogger } from "@/lib/logger";

type PersistableCanonicalRecipe = NonNullable<
  CustomRecipeGeneratedRecipe["canonicalRecipe"]
>;

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildLegacyCanonicalRecipe(
  recipe: CustomRecipeGeneratedRecipe,
  locale: "en" | "sk",
): PersistableCanonicalRecipe {
  return {
    default_locale: locale,
    category_key: slugify(recipe.category) || "custom-recipe",
    diet_tags: recipe.tags.map(slugify).filter(Boolean),
    restriction_flags: [],
    servings: recipe.servings,
    prep_time_min: recipe.prepTimeMin,
    total_time_min: recipe.totalTimeMin,
    nutrition_per_serving: {
      calories: recipe.calories,
      protein_g: recipe.proteinG,
      carbohydrates_g: recipe.carbohydratesG,
      fat_g: recipe.fatG,
    },
    ingredients: recipe.ingredientItems.map((ingredient, index) => ({
      ingredient_key: ingredient.ingredientKey ?? null,
      ingredient_specific_key: ingredient.ingredientSpecificKey ?? null,
      canonical_name: ingredient.name.trim() || null,
      pantry_tracking_hint: ingredient.pantryTrackingMode ?? null,
      quantity:
        typeof ingredient.quantityValue === "number"
        && Number.isFinite(ingredient.quantityValue)
          ? ingredient.quantityValue
          : null,
      unit: ingredient.unit?.trim() || null,
      optional: false,
      sort_order: index,
      translations: {
        en: { display_name: ingredient.name.trim() },
        sk: { display_name: ingredient.name.trim() },
      },
    })),
    translations: {
      en: {
        name: recipe.name,
        category_label: recipe.category,
        serving_unit_label: recipe.servingUnit,
        instructions: recipe.instructions.map((instruction) => instruction.text.trim()),
        notes: recipe.description,
      },
      sk: {
        name: recipe.name,
        category_label: recipe.category,
        serving_unit_label: recipe.servingUnit,
        instructions: recipe.instructions.map((instruction) => instruction.text.trim()),
        notes: recipe.description,
      },
    },
    meal_prep_friendly: recipe.mealPrepFriendly,
  };
}

function buildRecipeHash(
  userId: string,
  recipe: PersistableCanonicalRecipe,
): string {
  const normalizedIngredients = recipe.ingredients.map((ingredient) => ({
    canonicalName: ingredient.canonical_name?.trim().toLowerCase() ?? null,
    ingredientKey: ingredient.ingredient_key?.trim().toLowerCase() ?? null,
    ingredientSpecificKey:
      ingredient.ingredient_specific_key?.trim().toLowerCase() ?? null,
    quantity: ingredient.quantity,
    unit: ingredient.unit?.trim().toLowerCase() ?? null,
    pantryTrackingHint: ingredient.pantry_tracking_hint,
    translations: ingredient.translations,
  }));

  return createHash("sha256")
    .update(
      JSON.stringify({
        userId,
        defaultLocale: recipe.default_locale,
        categoryKey: recipe.category_key,
        dietTags: recipe.diet_tags,
        restrictionFlags: recipe.restriction_flags,
        servings: recipe.servings,
        prepTimeMin: recipe.prep_time_min,
        totalTimeMin: recipe.total_time_min,
        calories: recipe.nutrition_per_serving.calories,
        proteinG: recipe.nutrition_per_serving.protein_g,
        carbohydratesG: recipe.nutrition_per_serving.carbohydrates_g,
        fatG: recipe.nutrition_per_serving.fat_g,
        ingredientItems: normalizedIngredients,
        translations: recipe.translations,
      }),
    )
    .digest("hex")
    .slice(0, 24);
}

function buildPersistedIngredient(
  ingredient: PersistableCanonicalRecipe["ingredients"][number],
  sortOrder: number,
) {
  return {
    row: {
      canonicalName: ingredient.canonical_name,
      ingredientKey: ingredient.ingredient_key,
      ingredientSpecificKey: ingredient.ingredient_specific_key,
      quantity: ingredient.quantity !== null ? String(ingredient.quantity) : null,
      unit: ingredient.unit,
      optional: ingredient.optional,
      sortOrder,
    },
    translations: (["en", "sk"] as const).map((locale) => ({
      locale,
      displayName: ingredient.translations[locale].display_name,
    })),
  };
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
  const canonicalRecipe =
    input.recipe.canonicalRecipe ?? buildLegacyCanonicalRecipe(input.recipe, input.locale);
  const categoryKey = canonicalRecipe.category_key;
  const recipeHash = buildRecipeHash(input.userId, canonicalRecipe);
  const externalKey = `ai-custom:${input.userId}:${recipeHash}`;
  const slugBase =
    slugify(canonicalRecipe.translations[canonicalRecipe.default_locale].name)
    || "custom-recipe";
  const slug = `${slugBase}-${recipeHash.slice(0, 8)}`;
  const persistedIngredients = canonicalRecipe.ingredients.map((ingredient, index) =>
    buildPersistedIngredient(ingredient, index),
  );

  const recipePayload = {
    slug,
    externalKey,
    source: "ai_custom" as const,
    userGenerated: true,
    createdByUserId: input.userId,
    sourceJobId: input.sourceJobId ?? null,
    categoryKey,
    defaultLocale: canonicalRecipe.default_locale,
    servings: canonicalRecipe.servings,
    prepTimeMin: canonicalRecipe.prep_time_min,
    totalTimeMin: canonicalRecipe.total_time_min,
    calories: canonicalRecipe.nutrition_per_serving.calories,
    proteinG: Math.round(canonicalRecipe.nutrition_per_serving.protein_g),
    carbohydratesG: Math.round(
      canonicalRecipe.nutrition_per_serving.carbohydrates_g,
    ),
    fatG: Math.round(canonicalRecipe.nutrition_per_serving.fat_g),
    dietTags: canonicalRecipe.diet_tags,
    restrictionFlags: canonicalRecipe.restriction_flags,
    mealPrepFriendly: canonicalRecipe.meal_prep_friendly,
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
        categoryKey: recipePayload.categoryKey,
        defaultLocale: recipePayload.defaultLocale,
        servings: recipePayload.servings,
        prepTimeMin: recipePayload.prepTimeMin,
        totalTimeMin: recipePayload.totalTimeMin,
        calories: recipePayload.calories,
        proteinG: recipePayload.proteinG,
        carbohydratesG: recipePayload.carbohydratesG,
        fatG: recipePayload.fatG,
        dietTags: recipePayload.dietTags,
        restrictionFlags: recipePayload.restrictionFlags,
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

  await db.insert(recipeTranslations).values(
    (["en", "sk"] as const).map((locale) => ({
      recipeId: upsertedRecipe.id,
      locale,
      name: canonicalRecipe.translations[locale].name,
      categoryLabel: canonicalRecipe.translations[locale].category_label,
      servingUnitLabel: canonicalRecipe.translations[locale].serving_unit_label,
      instructions: canonicalRecipe.translations[locale].instructions,
      notes: canonicalRecipe.translations[locale].notes,
      updatedAt: new Date(),
    })),
  );

  for (const ingredient of persistedIngredients) {
    const [insertedIngredient] = await db
      .insert(recipeIngredients)
      .values({
        recipeId: upsertedRecipe.id,
        canonicalName: ingredient.row.canonicalName,
        ingredientKey: ingredient.row.ingredientKey,
        ingredientSpecificKey: ingredient.row.ingredientSpecificKey,
        quantity: ingredient.row.quantity,
        unit: ingredient.row.unit,
        optional: ingredient.row.optional,
        sortOrder: ingredient.row.sortOrder,
        updatedAt: new Date(),
      })
      .returning({ id: recipeIngredients.id });

    await db.insert(recipeIngredientTranslations).values(
      ingredient.translations.map((translation) => ({
        recipeIngredientId: insertedIngredient.id,
        locale: translation.locale,
        displayName: translation.displayName,
        updatedAt: new Date(),
      })),
    );
  }

  apiLogger.info("[customRecipe.accept] recipe persisted", {
    metadata: {
      userId: input.userId,
      recipeId: upsertedRecipe.id,
      externalKey: upsertedRecipe.externalKey,
      locale: canonicalRecipe.default_locale,
      sourceJobId: input.sourceJobId ?? null,
    },
  });

  return upsertedRecipe;
}