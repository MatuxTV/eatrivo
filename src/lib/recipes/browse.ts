import { and, asc, count, desc, eq, inArray, lte, type SQL } from "drizzle-orm";

import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import {
  recipeIngredients,
  recipes,
  recipeTranslations,
} from "@/db/schema";
import { db } from "@/index";
import { guessFoodCategory } from "@/lib/ingredients/units";
import {
  formatRecipeIngredientAmount,
  type RecipeIngredientItem,
} from "@/lib/recipes/recipe-ingredients";
import { normalizeRecipeInstructions } from "@/lib/recipes/recipe-instructions";
import { loadIngredientNameMap } from "@/lib/pantry/ingredient-resolution";
import {
  normalizeRecipeLocale,
  resolveIngredientDisplayName,
  resolveIngredientTranslation,
  resolveRecipeTranslation,
  type RecipeTranslationRecord,
} from "@/lib/recipes/recipe-localization";
import {
  getDietFilterCondition,
  jsonArrayContains,
  type DietPreference,
} from "@/lib/recipes/recipe-filters";
import { getRecipeAvailabilityForUserProfile } from "@/lib/recipes/recipe-matches";

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 24;
const INVALID_CATEGORY_KEY = "string";

type RecipeBrowseRow = {
  id: string;
  slug: string;
  categoryKey: string;
  defaultLocale: string;
  servings: number;
  totalTimeMin: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  restrictionFlags: string[];
  dietTags: string[];
  mealPrepFriendly: boolean;
};

export interface RecipeBrowseFilters {
  categoryKeys?: string[];
  dietTags?: string[];
  quickOnly?: boolean;
}

export interface RecipeBrowseAvailableFilters {
  categoryKeys: string[];
  dietTags: string[];
}

export interface RecipeBrowsePage {
  recipes: BasicHomeRecipePreview[];
  totalCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface RecipeBrowseOptions {
  locale: string;
  dietPreference?: DietPreference;
  userProfileId?: string | null;
  filters?: RecipeBrowseFilters;
  offset?: number;
  limit?: number;
}

function normalizeUniqueValues(values?: string[]): string[] {
  if (!values || values.length === 0) {
    return [];
  }

  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function normalizeCategoryKeys(values?: string[]): string[] {
  return normalizeUniqueValues(values).filter((value) => value !== INVALID_CATEGORY_KEY);
}

function normalizeDietTags(values?: string[]): string[] {
  return normalizeUniqueValues(values);
}

function buildRecipeBrowseWhere(
  dietPreference: DietPreference,
  filters: RecipeBrowseFilters = {},
): SQL | undefined {
  const clauses: SQL[] = [];
  const dietPreferenceCondition = getDietFilterCondition(dietPreference);

  if (dietPreferenceCondition) {
    clauses.push(dietPreferenceCondition);
  }

  const categoryKeys = normalizeCategoryKeys(filters.categoryKeys);
  if (categoryKeys.length > 0) {
    clauses.push(inArray(recipes.categoryKey, categoryKeys));
  }

  const dietTags = normalizeDietTags(filters.dietTags);
  for (const dietTag of dietTags) {
    clauses.push(jsonArrayContains(recipes.dietTags, dietTag));
  }

  if (filters.quickOnly) {
    clauses.push(lte(recipes.totalTimeMin, 20));
  }

  if (clauses.length === 0) {
    return undefined;
  }

  return clauses.length === 1 ? clauses[0] : and(...clauses);
}

function sanitizePageSize(limit?: number): number {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
}

function sanitizeOffset(offset?: number): number {
  if (!offset || Number.isNaN(offset) || offset < 0) {
    return 0;
  }

  return Math.floor(offset);
}

async function buildRecipePreviews(
  recipeRows: RecipeBrowseRow[],
  locale: string,
  userProfileId?: string | null,
): Promise<BasicHomeRecipePreview[]> {
  if (recipeRows.length === 0) {
    return [];
  }

  const recipeIds = recipeRows.map((row) => row.id);

  const [translationRows, ingredientRows, availabilityMap] =
    await Promise.all([
      db
        .select({
          recipeId: recipeTranslations.recipeId,
          locale: recipeTranslations.locale,
          name: recipeTranslations.name,
          categoryLabel: recipeTranslations.categoryLabel,
          servingUnitLabel: recipeTranslations.servingUnitLabel,
          instructions: recipeTranslations.instructions,
        })
        .from(recipeTranslations)
        .where(inArray(recipeTranslations.recipeId, recipeIds)),
      db
        .select({
          recipeId: recipeIngredients.recipeId,
          recipeIngredientId: recipeIngredients.id,
          defaultLocale: recipes.defaultLocale,
          canonicalName: recipeIngredients.canonicalName,
          ingredientKey: recipeIngredients.ingredientKey,
          ingredientSpecificKey: recipeIngredients.ingredientSpecificKey,
          ingredientId: recipeIngredients.ingredientId,
          displayLabel: recipeIngredients.displayLabel,
          quantity: recipeIngredients.quantity,
          unit: recipeIngredients.unit,
          sortOrder: recipeIngredients.sortOrder,
          optional: recipeIngredients.optional,
        })
        .from(recipeIngredients)
        .innerJoin(recipes, eq(recipeIngredients.recipeId, recipes.id))
        .where(inArray(recipeIngredients.recipeId, recipeIds)),
      userProfileId
        ? getRecipeAvailabilityForUserProfile(userProfileId, recipeIds, { locale })
        : Promise.resolve(new Map()),
    ]);

  const recipeTranslationMap = new Map<
    string,
    Map<string, RecipeTranslationRecord>
  >();

  for (const row of translationRows) {
    let translationsForRecipe = recipeTranslationMap.get(row.recipeId);
    if (!translationsForRecipe) {
      translationsForRecipe = new Map();
      recipeTranslationMap.set(row.recipeId, translationsForRecipe);
    }

    translationsForRecipe.set(normalizeRecipeLocale(row.locale), {
      locale: row.locale,
      name: row.name,
      categoryLabel: row.categoryLabel,
      servingUnitLabel: row.servingUnitLabel,
      instructions: row.instructions,
    });
  }

  const ingredientNameMap = await loadIngredientNameMap(
    ingredientRows
      .map((row) => row.ingredientId)
      .filter((id): id is string => Boolean(id)),
  );

  const ingredientTranslationMap = new Map<
    string,
    Map<string, { locale: string; displayName: string }>
  >();

  for (const row of ingredientRows) {
    const localeMap = new Map<string, { locale: string; displayName: string }>();
    const names = row.ingredientId
      ? ingredientNameMap.get(row.ingredientId)
      : undefined;

    if (names) {
      for (const [nameLocale, name] of names) {
        const normalized = normalizeRecipeLocale(nameLocale);
        localeMap.set(normalized, { locale: normalized, displayName: name });
      }
    }

    if (row.displayLabel) {
      const normalizedDefault = normalizeRecipeLocale(row.defaultLocale);
      localeMap.set(normalizedDefault, {
        locale: normalizedDefault,
        displayName: row.displayLabel,
      });
    }

    ingredientTranslationMap.set(row.recipeIngredientId, localeMap);
  }

  const ingredientItemsByRecipeId = new Map<string, RecipeIngredientItem[]>();

  for (const row of [...ingredientRows].sort((left, right) => left.sortOrder - right.sortOrder)) {
    if (row.optional) {
      continue;
    }

    const localizedIngredient = resolveIngredientTranslation(
      ingredientTranslationMap.get(row.recipeIngredientId),
      locale,
      row.defaultLocale,
    );

    const ingredientName =
      resolveIngredientDisplayName(localizedIngredient, row.displayLabel) ??
      row.displayLabel ??
      row.canonicalName ??
      row.ingredientKey ??
      "ingredient";
    const ingredientCategoryName = row.canonicalName?.trim() || ingredientName;

    const existingItems = ingredientItemsByRecipeId.get(row.recipeId) ?? [];
    existingItems.push({
      name: ingredientName,
      amount: formatRecipeIngredientAmount(row.quantity, row.unit, locale),
      category: guessFoodCategory(ingredientCategoryName),
      quantityValue: row.quantity === null ? null : Number.parseFloat(row.quantity),
      unit: row.unit,
      ingredientKey: row.ingredientKey,
      ingredientSpecificKey: row.ingredientSpecificKey,
      ingredientId: row.ingredientId,
    });
    ingredientItemsByRecipeId.set(row.recipeId, existingItems);
  }

  return recipeRows.flatMap((row) => {
    const localizedRecipe = resolveRecipeTranslation(
      recipeTranslationMap.get(row.id),
      locale,
      row.defaultLocale,
    );

    if (!localizedRecipe) {
      return [];
    }

    const fullIngredients =
      ingredientItemsByRecipeId.get(row.id)?.map((ingredient) => ingredient.name) ?? [];
    const availability = availabilityMap.get(row.id);

    return [{
      id: row.id,
      slug: row.slug,
      title: localizedRecipe.name,
      category: localizedRecipe.categoryLabel ?? row.categoryKey,
      categoryKey: row.categoryKey,
      servings: row.servings,
      totalTimeMin: row.totalTimeMin,
      calories: row.calories,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      restrictionFlags: Array.isArray(row.restrictionFlags) ? row.restrictionFlags : [],
      instructions: normalizeRecipeInstructions(localizedRecipe.instructions),
      dietTags: Array.isArray(row.dietTags) ? row.dietTags : [],
      ingredientItems: availability?.ingredientItems ?? ingredientItemsByRecipeId.get(row.id) ?? [],
      ingredientPreview: fullIngredients,
      matchedIngredients: availability?.matchedIngredients,
      mealPrepFriendly: row.mealPrepFriendly,
      missingIngredients: availability?.missingIngredientNames,
    }];
  });
}

export async function getRecipeBrowseAvailableFilters(options: {
  dietPreference?: DietPreference;
} = {}): Promise<RecipeBrowseAvailableFilters> {
  const whereClause = buildRecipeBrowseWhere(options.dietPreference, {});
  const rows = await db
    .select({
      categoryKey: recipes.categoryKey,
      dietTags: recipes.dietTags,
      totalTimeMin: recipes.totalTimeMin,
    })
    .from(recipes)
    .where(whereClause);

  const categoryKeys = new Set<string>();
  const dietTags = new Set<string>();

  for (const row of rows) {
    const normalizedCategoryKey = row.categoryKey?.trim().toLowerCase();
    if (normalizedCategoryKey && normalizedCategoryKey !== INVALID_CATEGORY_KEY) {
      categoryKeys.add(normalizedCategoryKey);
    }

    if (Array.isArray(row.dietTags)) {
      for (const dietTag of row.dietTags) {
        const normalizedDietTag = dietTag?.trim().toLowerCase();
        if (normalizedDietTag) {
          dietTags.add(normalizedDietTag);
        }
      }
    }
  }

  return {
    categoryKeys: [...categoryKeys],
    dietTags: [...dietTags],
  };
}

export async function getRecipeBrowsePage(
  options: RecipeBrowseOptions,
): Promise<RecipeBrowsePage> {
  const locale = normalizeRecipeLocale(options.locale);
  const limit = sanitizePageSize(options.limit);
  const offset = sanitizeOffset(options.offset);
  const whereClause = buildRecipeBrowseWhere(options.dietPreference, options.filters);

  const [recipeRows, totalRows] = await Promise.all([
    db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        categoryKey: recipes.categoryKey,
        defaultLocale: recipes.defaultLocale,
        servings: recipes.servings,
        totalTimeMin: recipes.totalTimeMin,
        calories: recipes.calories,
        proteinG: recipes.proteinG,
        carbsG: recipes.carbohydratesG,
        fatG: recipes.fatG,
        restrictionFlags: recipes.restrictionFlags,
        dietTags: recipes.dietTags,
        mealPrepFriendly: recipes.mealPrepFriendly,
      })
      .from(recipes)
      .where(whereClause)
      .orderBy(desc(recipes.proteinG), asc(recipes.totalTimeMin), asc(recipes.slug), asc(recipes.id))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(recipes).where(whereClause),
  ]);

  const previews = await buildRecipePreviews(recipeRows, locale, options.userProfileId);
  const totalCount = totalRows[0]?.value ?? 0;

  return {
    recipes: previews,
    totalCount,
    offset,
    limit,
    hasMore: offset + previews.length < totalCount,
  };
}