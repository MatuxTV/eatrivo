import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseRecipeIngredient } from "../src/lib/ingredients";

interface LegacyRecipe {
  name: string;
  category: string;
  servings: number;
  serving_unit: string | null;
  prep_time_min: number;
  total_time_min: number;
  nutrition_per_serving: {
    calories: number;
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
  };
  ingredients: string[];
  instructions: string[];
  notes: string | null;
  meal_prep_friendly: boolean;
}

interface LegacyRecipeFile {
  recipes: LegacyRecipe[];
}

interface CanonicalRecipeFile {
  recipes: CanonicalRecipe[];
}

interface CanonicalRecipe {
  external_key: string;
  default_locale: string;
  category_key: string;
  diet_tags: string[];
  restriction_flags: string[];
  servings: number;
  prep_time_min: number;
  total_time_min: number;
  nutrition_per_serving: {
    calories: number;
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
  };
  ingredients: Array<{
    ingredient_key: string | null;
    quantity: number | null;
    unit: string | null;
    optional: boolean;
    sort_order: number;
    translations: Record<
      string,
      {
        display_name: string;
        ingredient_name: string | null;
      }
    >;
  }>;
  translations: Record<
    string,
    {
      name: string;
      category_label: string | null;
      serving_unit_label: string | null;
      instructions: string[];
      notes: string | null;
    }
  >;
  meal_prep_friendly: boolean;
}

type SourceRecipe = LegacyRecipe | CanonicalRecipe;

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

function isCanonicalRecipe(recipe: SourceRecipe): recipe is CanonicalRecipe {
  return "external_key" in recipe;
}

function convertRecipe(
  recipe: SourceRecipe,
  seenExternalKeys: Map<string, number>,
): CanonicalRecipe {
  const defaultLocale = isCanonicalRecipe(recipe)
    ? recipe.default_locale
    : "en";
  const name = isCanonicalRecipe(recipe)
    ? recipe.translations[defaultLocale]?.name ?? recipe.translations.en?.name
    : recipe.name;
  const categoryLabel = isCanonicalRecipe(recipe)
    ? recipe.translations[defaultLocale]?.category_label ??
      recipe.translations.en?.category_label ??
      recipe.category_key
    : recipe.category;
  const servingUnitLabel = isCanonicalRecipe(recipe)
    ? recipe.translations[defaultLocale]?.serving_unit_label ??
      recipe.translations.en?.serving_unit_label ??
      null
    : recipe.serving_unit;

  const categoryKey = isCanonicalRecipe(recipe)
    ? recipe.category_key
    : slugify(recipe.category);
  const externalKey = buildUniqueSlug(
    isCanonicalRecipe(recipe)
      ? recipe.external_key
      : slugify(`${categoryKey}-${recipe.name}`),
    seenExternalKeys,
  );

  return {
    external_key: externalKey,
    default_locale: defaultLocale,
    category_key: categoryKey,
    diet_tags: isCanonicalRecipe(recipe) ? recipe.diet_tags ?? [] : [],
    restriction_flags: isCanonicalRecipe(recipe) ? recipe.restriction_flags ?? [] : [],
    servings: recipe.servings,
    prep_time_min: recipe.prep_time_min,
    total_time_min: recipe.total_time_min,
    nutrition_per_serving: recipe.nutrition_per_serving,
    ingredients: recipe.ingredients.map((ingredient, index) => {
      const fallbackTranslation =
        typeof ingredient === "string"
          ? null
          : ingredient.translations[defaultLocale] ??
            ingredient.translations.en ??
            Object.values(ingredient.translations)[0] ??
            null;
      const displayName =
        typeof ingredient === "string"
          ? ingredient
          : fallbackTranslation?.display_name ?? "";
      const parsed = parseRecipeIngredient(displayName);

      return {
        ingredient_key:
          typeof ingredient === "string"
            ? parsed.ingredientKey
            : ingredient.ingredient_key,
        quantity:
          typeof ingredient === "string"
            ? parsed.quantity
            : ingredient.quantity,
        unit:
          typeof ingredient === "string"
            ? parsed.unit
            : ingredient.unit,
        optional:
          typeof ingredient === "string"
            ? parsed.optional
            : ingredient.optional,
        sort_order: index,
        translations:
          typeof ingredient === "string"
            ? {
                en: {
                  display_name: parsed.displayName,
                  ingredient_name: parsed.ingredientName,
                },
              }
            : ingredient.translations,
      };
    }),
    translations: isCanonicalRecipe(recipe)
      ? recipe.translations
      : {
          en: {
            name,
            category_label: categoryLabel,
            serving_unit_label: servingUnitLabel,
            instructions: recipe.instructions,
            notes: recipe.notes,
          },
        },
    meal_prep_friendly: recipe.meal_prep_friendly,
  };
}

function upgradeFile(filePath: string) {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as {
    recipes: SourceRecipe[];
  };
  const seenExternalKeys = new Map<string, number>();

  const upgraded: CanonicalRecipeFile = {
    recipes: raw.recipes.map((recipe) => convertRecipe(recipe, seenExternalKeys)),
  };

  writeFileSync(filePath, `${JSON.stringify(upgraded, null, 2)}\n`, "utf8");
  console.log(`Upgraded ${filePath} (${upgraded.recipes.length} recipes)`);
}

function main() {
  const filePaths = [
    resolve("receipes/athlete-cookbook.json"),
    resolve("receipes/rzone-high-protein-recipes.json"),
  ];

  for (const filePath of filePaths) {
    upgradeFile(filePath);
  }
}

main();