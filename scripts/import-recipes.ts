import "dotenv/config";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { eq } from "drizzle-orm";

import { db } from "../src";
import {
  recipeIngredients,
  recipeIngredientTranslations,
  recipes,
  recipeTranslations,
} from "../src/db/schema";
import { parseRecipeIngredient } from "../src/lib/ingredients";

interface StructuredRecipeIngredient {
  display_name: string;
  ingredient_name: string | null;
  ingredient_key: string | null;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
  sort_order: number;
}

interface RecipeTranslationJson {
  name: string;
  instructions: string[];
  notes: string | null;
  serving_unit_label?: string | null;
  category_label?: string | null;
}

interface IngredientTranslationJson {
  display_name: string;
  ingredient_name: string | null;
}

interface MultilingualRecipeIngredient {
  ingredient_key: string | null;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
  sort_order: number;
  translations: Record<string, IngredientTranslationJson>;
}

interface RecipeJson {
  external_key?: string;
  default_locale?: string;
  name?: string;
  category?: string;
  category_key?: string;
  diet_tags?: string[];
  restriction_flags?: string[];
  servings: number;
  serving_unit?: string | null;
  prep_time_min: number;
  total_time_min: number;
  nutrition_per_serving: {
    calories: number;
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
  };
  ingredients: Array<
    string | StructuredRecipeIngredient | MultilingualRecipeIngredient
  >;
  instructions?: string[];
  notes?: string | null;
  translations?: Record<string, RecipeTranslationJson>;
  meal_prep_friendly: boolean;
}

interface RecipeFile {
  recipes: RecipeJson[];
}

function normalizeStringArrayField(
  value: string[] | undefined,
  fieldName: string,
  recipeKey: string,
): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Recipe \"${recipeKey}\" has invalid ${fieldName}.`);
  }

  const normalized = value.map((entry) => {
    if (typeof entry !== "string") {
      throw new Error(`Recipe \"${recipeKey}\" has invalid ${fieldName} entry.`);
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      throw new Error(`Recipe \"${recipeKey}\" has empty ${fieldName} entry.`);
    }

    return trimmed;
  });

  return [...new Set(normalized)];
}

function readJsonFile(filePath: string): RecipeFile {
  return JSON.parse(readFileSync(filePath, "utf8")) as RecipeFile;
}

function resolveRecipeFilePath(inputPath: string): string {
  const directPath = resolve(inputPath);
  const recipesDirectoryPath = resolve("receipes", inputPath);
  const resolvedPath = existsSync(directPath)
    ? directPath
    : existsSync(recipesDirectoryPath)
      ? recipesDirectoryPath
      : null;

  if (!resolvedPath) {
    throw new Error(`Recipe file not found: ${inputPath}`);
  }

  if (!resolvedPath.toLowerCase().endsWith(".json")) {
    throw new Error(`Recipe file must be a .json file: ${resolvedPath}`);
  }

  return resolvedPath;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildUniqueSlug(baseSlug: string, seenSlugs: Map<string, number>): string {
  const currentCount = seenSlugs.get(baseSlug) ?? 0;
  seenSlugs.set(baseSlug, currentCount + 1);

  if (currentCount === 0) {
    return baseSlug;
  }

  return `${baseSlug}-${currentCount + 1}`;
}

function loadRecipes(filePath: string): RecipeJson[] {
  return readJsonFile(filePath).recipes;
}

function isMultilingualStructuredIngredient(
  ingredient: string | StructuredRecipeIngredient | MultilingualRecipeIngredient,
): ingredient is MultilingualRecipeIngredient {
  return typeof ingredient !== "string" && "translations" in ingredient;
}

function isStructuredIngredient(
  ingredient: string | StructuredRecipeIngredient | MultilingualRecipeIngredient,
): ingredient is StructuredRecipeIngredient {
  return typeof ingredient !== "string" && !isMultilingualStructuredIngredient(ingredient);
}

function assertRecipeTranslation(
  translation: RecipeTranslationJson,
  recipeKey: string,
  locale: string,
): void {
  if (!translation.name || typeof translation.name !== "string") {
    throw new Error(`Recipe \"${recipeKey}\" has invalid name for locale \"${locale}\".`);
  }

  if (!Array.isArray(translation.instructions)) {
    throw new Error(
      `Recipe \"${recipeKey}\" has invalid instructions for locale \"${locale}\".`,
    );
  }

  if (
    translation.notes !== null &&
    translation.notes !== undefined &&
    typeof translation.notes !== "string"
  ) {
    throw new Error(`Recipe \"${recipeKey}\" has invalid notes for locale \"${locale}\".`);
  }

  if (
    translation.serving_unit_label !== null &&
    translation.serving_unit_label !== undefined &&
    typeof translation.serving_unit_label !== "string"
  ) {
    throw new Error(
      `Recipe \"${recipeKey}\" has invalid serving_unit_label for locale \"${locale}\".`,
    );
  }

  if (
    translation.category_label !== null &&
    translation.category_label !== undefined &&
    typeof translation.category_label !== "string"
  ) {
    throw new Error(
      `Recipe \"${recipeKey}\" has invalid category_label for locale \"${locale}\".`,
    );
  }
}

function assertIngredientTranslation(
  translation: IngredientTranslationJson,
  recipeKey: string,
  locale: string,
): void {
  if (!translation.display_name || typeof translation.display_name !== "string") {
    throw new Error(
      `Recipe \"${recipeKey}\" has ingredient with invalid display_name for locale \"${locale}\".`,
    );
  }

  if (
    translation.ingredient_name !== null &&
    typeof translation.ingredient_name !== "string"
  ) {
    throw new Error(
      `Recipe \"${recipeKey}\" has ingredient with invalid ingredient_name for locale \"${locale}\".`,
    );
  }
}

function assertStructuredIngredient(
  ingredient: StructuredRecipeIngredient,
  recipeName: string,
): void {
  if (!ingredient.display_name || typeof ingredient.display_name !== "string") {
    throw new Error(
      `Recipe \"${recipeName}\" has ingredient with invalid display_name.`,
    );
  }

  if (
    ingredient.ingredient_name !== null &&
    typeof ingredient.ingredient_name !== "string"
  ) {
    throw new Error(
      `Recipe \"${recipeName}\" has ingredient with invalid ingredient_name.`,
    );
  }

  if (
    ingredient.ingredient_key !== null &&
    typeof ingredient.ingredient_key !== "string"
  ) {
    throw new Error(
      `Recipe \"${recipeName}\" has ingredient with invalid ingredient_key.`,
    );
  }

  if (ingredient.quantity !== null && typeof ingredient.quantity !== "number") {
    throw new Error(
      `Recipe \"${recipeName}\" has ingredient with invalid quantity.`,
    );
  }

  if (ingredient.unit !== null && typeof ingredient.unit !== "string") {
    throw new Error(`Recipe \"${recipeName}\" has ingredient with invalid unit.`);
  }

  if (typeof ingredient.optional !== "boolean") {
    throw new Error(
      `Recipe \"${recipeName}\" has ingredient with invalid optional flag.`,
    );
  }

  if (!Number.isInteger(ingredient.sort_order) || ingredient.sort_order < 0) {
    throw new Error(
      `Recipe \"${recipeName}\" has ingredient with invalid sort_order.`,
    );
  }
}

function assertMultilingualIngredient(
  ingredient: MultilingualRecipeIngredient,
  recipeKey: string,
): void {
  if (
    ingredient.ingredient_key !== null &&
    typeof ingredient.ingredient_key !== "string"
  ) {
    throw new Error(
      `Recipe \"${recipeKey}\" has ingredient with invalid ingredient_key.`,
    );
  }

  if (ingredient.quantity !== null && typeof ingredient.quantity !== "number") {
    throw new Error(
      `Recipe \"${recipeKey}\" has ingredient with invalid quantity.`,
    );
  }

  if (ingredient.unit !== null && typeof ingredient.unit !== "string") {
    throw new Error(`Recipe \"${recipeKey}\" has ingredient with invalid unit.`);
  }

  if (typeof ingredient.optional !== "boolean") {
    throw new Error(
      `Recipe \"${recipeKey}\" has ingredient with invalid optional flag.`,
    );
  }

  if (!Number.isInteger(ingredient.sort_order) || ingredient.sort_order < 0) {
    throw new Error(
      `Recipe \"${recipeKey}\" has ingredient with invalid sort_order.`,
    );
  }

  const locales = Object.keys(ingredient.translations ?? {});
  if (locales.length === 0) {
    throw new Error(`Recipe \"${recipeKey}\" has ingredient without translations.`);
  }

  for (const locale of locales) {
    assertIngredientTranslation(ingredient.translations[locale], recipeKey, locale);
  }
}

function getRecipeTranslations(recipe: RecipeJson): Record<string, RecipeTranslationJson> {
  if (recipe.translations && Object.keys(recipe.translations).length > 0) {
    return recipe.translations;
  }

  if (!recipe.name || !recipe.category || !recipe.instructions) {
    throw new Error("Legacy recipe is missing name, category, or instructions.");
  }

  return {
    en: {
      name: recipe.name,
      category_label: recipe.category,
      serving_unit_label: recipe.serving_unit ?? null,
      instructions: recipe.instructions,
      notes: recipe.notes ?? null,
    },
  };
}

function getDefaultLocale(
  recipe: RecipeJson,
  translations: Record<string, RecipeTranslationJson>,
): string {
  if (recipe.default_locale && translations[recipe.default_locale]) {
    return recipe.default_locale;
  }

  if (translations.en) {
    return "en";
  }

  const firstLocale = Object.keys(translations)[0];
  if (!firstLocale) {
    throw new Error("Recipe has no translations.");
  }

  return firstLocale;
}

function normalizeRecipeIngredients(
  recipe: RecipeJson,
  recipeKey: string,
  defaultLocale: string,
) {
  return recipe.ingredients.map((ingredient, index) => {
    if (isMultilingualStructuredIngredient(ingredient)) {
      assertMultilingualIngredient(ingredient, recipeKey);

      const fallbackLocale = ingredient.translations[defaultLocale]
        ? defaultLocale
        : Object.keys(ingredient.translations)[0];
      const fallbackTranslation = ingredient.translations[fallbackLocale];

      return {
        displayName: fallbackTranslation.display_name,
        ingredientName: fallbackTranslation.ingredient_name,
        ingredientKey: ingredient.ingredient_key,
        quantity: ingredient.quantity !== null ? String(ingredient.quantity) : null,
        unit: ingredient.unit,
        optional: ingredient.optional,
        sortOrder: ingredient.sort_order,
        translations: Object.entries(ingredient.translations).map(
          ([locale, translation]) => ({
            locale,
            displayName: translation.display_name,
            ingredientName: translation.ingredient_name,
          }),
        ),
      };
    }

    if (isStructuredIngredient(ingredient)) {
      assertStructuredIngredient(ingredient, recipeKey);

      return {
        displayName: ingredient.display_name,
        ingredientName: ingredient.ingredient_name,
        ingredientKey: ingredient.ingredient_key,
        quantity:
          ingredient.quantity !== null ? String(ingredient.quantity) : null,
        unit: ingredient.unit,
        optional: ingredient.optional,
        sortOrder: ingredient.sort_order,
        translations: [
          {
            locale: defaultLocale,
            displayName: ingredient.display_name,
            ingredientName: ingredient.ingredient_name,
          },
        ],
      };
    }

    const parsedIngredient = parseRecipeIngredient(ingredient);

    return {
      displayName: parsedIngredient.displayName,
      ingredientName: parsedIngredient.ingredientName,
      ingredientKey: parsedIngredient.ingredientKey,
      quantity:
        parsedIngredient.quantity !== null
          ? String(parsedIngredient.quantity)
          : null,
      unit: parsedIngredient.unit,
      optional: parsedIngredient.optional,
      sortOrder: index,
      translations: [
        {
          locale: defaultLocale,
          displayName: parsedIngredient.displayName,
          ingredientName: parsedIngredient.ingredientName,
        },
      ],
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

  if (positionalArgs.length !== 1) {
    throw new Error(
      "Usage: npm run db:import:recipes -- <file.json> [--dry-run]",
    );
  }

  const recipeFilePath = resolveRecipeFilePath(positionalArgs[0]);
  const seenSlugs = new Map<string, number>();
  const rawRecipes = loadRecipes(recipeFilePath);

  const rows = rawRecipes.map((recipe) => {
    const translations = getRecipeTranslations(recipe);
    const recipeKey = recipe.external_key ?? recipe.name ?? "unknown";
    for (const [locale, translation] of Object.entries(translations)) {
      assertRecipeTranslation(
        translation,
        recipeKey,
        locale,
      );
    }

    const dietTags = normalizeStringArrayField(
      recipe.diet_tags,
      "diet_tags",
      recipeKey,
    );
    const restrictionFlags = normalizeStringArrayField(
      recipe.restriction_flags,
      "restriction_flags",
      recipeKey,
    );

    const defaultLocale = getDefaultLocale(recipe, translations);
    const fallbackTranslation = translations[defaultLocale];
    const categoryKey =
      recipe.category_key ??
      slugify(recipe.category ?? fallbackTranslation.category_label ?? "other");
    const baseExternalKey =
      recipe.external_key ?? slugify(`${categoryKey}-${fallbackTranslation.name}`);
    const externalKey = buildUniqueSlug(baseExternalKey, seenSlugs);
    const slug = externalKey;
    const parsedIngredients = normalizeRecipeIngredients(
      recipe,
      externalKey,
      defaultLocale,
    );

    return {
      recipe: {
        slug,
        externalKey,
        name: recipe.name ?? fallbackTranslation.name,
        category: recipe.category ?? fallbackTranslation.category_label ?? categoryKey,
        categoryKey,
        defaultLocale,
        servings: recipe.servings,
        servingUnit: recipe.serving_unit ?? fallbackTranslation.serving_unit_label ?? null,
        prepTimeMin: recipe.prep_time_min,
        totalTimeMin: recipe.total_time_min,
        calories: recipe.nutrition_per_serving.calories,
        proteinG: recipe.nutrition_per_serving.protein_g,
        carbohydratesG: recipe.nutrition_per_serving.carbohydrates_g,
        fatG: recipe.nutrition_per_serving.fat_g,
        dietTags,
        restrictionFlags,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions ?? fallbackTranslation.instructions,
        notes: recipe.notes ?? fallbackTranslation.notes,
        mealPrepFriendly: recipe.meal_prep_friendly,
        updatedAt: new Date(),
      },
      recipeTranslations: Object.entries(translations).map(
        ([locale, translation]) => ({
          locale,
          name: translation.name,
          categoryLabel: translation.category_label ?? null,
          servingUnitLabel: translation.serving_unit_label ?? null,
          instructions: translation.instructions,
          notes: translation.notes ?? null,
        }),
      ),
      recipeIngredients: parsedIngredients,
    };
  });

  if (dryRun) {
    console.log(
      `Dry run: prepared ${rows.length} recipes for import from ${recipeFilePath}.`,
    );
    console.log(
      JSON.stringify(
        rows.slice(0, 2).map((row) => ({
          recipe: row.recipe,
          recipeIngredients: row.recipeIngredients.slice(0, 5),
        })),
        null,
        2,
      ),
    );
    return;
  }

  for (const row of rows) {
    const [upsertedRecipe] = await db
      .insert(recipes)
      .values(row.recipe)
      .onConflictDoUpdate({
        target: recipes.externalKey,
        set: {
          slug: row.recipe.slug,
          name: row.recipe.name,
          category: row.recipe.category,
          categoryKey: row.recipe.categoryKey,
          defaultLocale: row.recipe.defaultLocale,
          servings: row.recipe.servings,
          servingUnit: row.recipe.servingUnit,
          prepTimeMin: row.recipe.prepTimeMin,
          totalTimeMin: row.recipe.totalTimeMin,
          calories: row.recipe.calories,
          proteinG: row.recipe.proteinG,
          carbohydratesG: row.recipe.carbohydratesG,
          fatG: row.recipe.fatG,
          dietTags: row.recipe.dietTags,
          restrictionFlags: row.recipe.restrictionFlags,
          ingredients: row.recipe.ingredients,
          instructions: row.recipe.instructions,
          notes: row.recipe.notes,
          mealPrepFriendly: row.recipe.mealPrepFriendly,
          updatedAt: new Date(),
        },
      })
      .returning({ id: recipes.id });

    await db
      .delete(recipeTranslations)
      .where(eq(recipeTranslations.recipeId, upsertedRecipe.id));

    if (row.recipeTranslations.length > 0) {
      await db.insert(recipeTranslations).values(
        row.recipeTranslations.map((translation) => ({
          recipeId: upsertedRecipe.id,
          locale: translation.locale,
          name: translation.name,
          categoryLabel: translation.categoryLabel,
          servingUnitLabel: translation.servingUnitLabel,
          instructions: translation.instructions,
          notes: translation.notes,
          updatedAt: new Date(),
        })),
      );
    }

    await db
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, upsertedRecipe.id));

    if (row.recipeIngredients.length === 0) {
      continue;
    }

    for (const ingredient of row.recipeIngredients) {
      const [insertedIngredient] = await db
        .insert(recipeIngredients)
        .values({
          recipeId: upsertedRecipe.id,
          displayName: ingredient.displayName,
          ingredientName: ingredient.ingredientName,
          ingredientKey: ingredient.ingredientKey,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          optional: ingredient.optional,
          sortOrder: ingredient.sortOrder,
          updatedAt: new Date(),
        })
        .returning({ id: recipeIngredients.id });

      if (ingredient.translations.length > 0) {
        await db.insert(recipeIngredientTranslations).values(
          ingredient.translations.map((translation) => ({
            recipeIngredientId: insertedIngredient.id,
            locale: translation.locale,
            displayName: translation.displayName,
            ingredientName: translation.ingredientName,
            updatedAt: new Date(),
          })),
        );
      }
    }
  }

  console.log(`Imported ${rows.length} recipes from ${recipeFilePath}.`);
}

main().catch((error) => {
  console.error("Recipe import failed.", error);
  process.exit(1);
});
