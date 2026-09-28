import { and, eq, inArray, isNotNull, or } from "drizzle-orm";

import { db } from "@/index";
import {
  pantryItems,
  recipeIngredients,
  recipes,
  recipeTranslations,
  userInfoTable,
} from "@/db/schema";
import { getDietFilterCondition } from "@/lib/recipes/recipe-filters";
import {
  resolveIngredientDisplayName,
  normalizeRecipeLocale,
  resolveIngredientTranslation,
  resolveRecipeTranslation,
} from "@/lib/recipes/recipe-localization";
import {
  normalizeRecipeInstructions,
  type RecipeInstruction,
} from "@/lib/recipes/recipe-instructions";
import {
  formatRecipeIngredientAmount,
  type RecipeIngredientItem,
} from "@/lib/recipes/recipe-ingredients";
import {
  buildRecipeIngredientPantryComparison,
  type RecipeIngredientPantryComparison,
} from "@/lib/recipes/recipe-quantity-comparison";
import { guessFoodCategory } from "@/lib/ingredients/units";
import {
  matchPantryIngredient,
  type IngredientGraph,
} from "@/lib/ingredients/ingredient-matching";
import { loadIngredientGraph, loadIngredientNameMap } from "@/lib/pantry/ingredient-resolution";

export interface RecipeMatchOptions {
  maxMissingIngredients?: number;
  cookableLimit?: number;
  almostCookableLimit?: number;
  locale?: string;
}

export interface MatchedRecipe {
  id: string;
  slug: string;
  externalKey: string;
  name: string;
  category: string;
  categoryKey: string;
  servings: number;
  servingUnit: string | null;
  prepTimeMin: number;
  totalTimeMin: number;
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  restrictionFlags: string[];
  instructions: RecipeInstruction[];
  ingredientItems: RecipeIngredientItem[];
  mealPrepFriendly: boolean;
  totalRequiredIngredients: number;
  matchedRequiredIngredients: number;
  missingRequiredIngredients: number;
  matchRatio: number;
  matchedIngredients: RecipeIngredientMatch[];
  matchedIngredientNames: string[];
  missingIngredientNames: string[];
}

export interface RecipeIngredientMatch {
  recipeIngredientName: string;
  pantryIngredientName: string | null;
  matchType: "exact" | "fallback";
  displayName: string;
  amount: string | null;
  pantryComparison?: RecipeIngredientPantryComparison | null;
}

export interface RecipeMatchesResult {
  pantryIsEmpty: boolean;
  pantryIngredientKeyCount: number;
  recipeCountAnalyzed: number;
  cookable: MatchedRecipe[];
  almostCookable: MatchedRecipe[];
}

export interface RecipeAvailabilityOptions {
  locale?: string;
}

export interface RecipePreferenceSuggestionOptions {
  locale?: string;
  limit?: number;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  mealPrep?: boolean;
}

interface RecipeBucket {
  recipe: Omit<MatchedRecipe, "totalRequiredIngredients" | "matchedRequiredIngredients" | "missingRequiredIngredients" | "matchRatio" | "matchedIngredients" | "matchedIngredientNames" | "missingIngredientNames">;
  defaultLocale: string;
  requiredIngredients: Map<string, { recipeMatchKey: string; ingredientKey: string; ingredientSpecificKey: string | null; ingredientId: string | null; fallbackName: string; category: string | null; recipeIngredientId: string; amount: string | null; quantity: string | null; unit: string | null; sortOrder: number }>;
}

interface PantryIngredientMatchCandidate {
  ingredientId: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  ingredientName: string | null;
  name: string | null;
  trackingMode: "quantity" | "availability";
  inStock: boolean;
  quantity: string | null;
  unit: string | null;
}

const DEFAULT_MAX_MISSING_INGREDIENTS = 3;
const DEFAULT_COOKABLE_LIMIT = 12;
const DEFAULT_ALMOST_COOKABLE_LIMIT = 12;

interface AnalyzeRecipeMatchesOptions {
  locale?: string;
  recipeIds?: string[];
}

interface AnalyzeRecipeMatchesResult {
  pantryIsEmpty: boolean;
  pantryIngredientKeyCount: number;
  analyzedRecipes: MatchedRecipe[];
}

function sortCookable(left: MatchedRecipe, right: MatchedRecipe): number {
  if (right.matchedRequiredIngredients !== left.matchedRequiredIngredients) {
    return right.matchedRequiredIngredients - left.matchedRequiredIngredients;
  }

  if (left.totalTimeMin !== right.totalTimeMin) {
    return left.totalTimeMin - right.totalTimeMin;
  }

  if (right.proteinG !== left.proteinG) {
    return right.proteinG - left.proteinG;
  }

  return left.name.localeCompare(right.name);
}

function sortAlmostCookable(left: MatchedRecipe, right: MatchedRecipe): number {
  if (left.missingRequiredIngredients !== right.missingRequiredIngredients) {
    return left.missingRequiredIngredients - right.missingRequiredIngredients;
  }

  if (right.matchRatio !== left.matchRatio) {
    return right.matchRatio - left.matchRatio;
  }

  if (left.totalTimeMin !== right.totalTimeMin) {
    return left.totalTimeMin - right.totalTimeMin;
  }

  return left.name.localeCompare(right.name);
}

function buildMatchedIngredientDisplayName(
  recipeIngredientName: string,
  pantryIngredientName: string | null,
  matchType: "exact" | "fallback",
): string {
  if (
    matchType === "fallback" &&
    pantryIngredientName &&
    pantryIngredientName.trim().toLowerCase() !==
      recipeIngredientName.trim().toLowerCase()
  ) {
    return `${recipeIngredientName} (${pantryIngredientName})`;
  }

  return recipeIngredientName;
}

function resolvePantryIngredientDisplayName(
  pantryRow: PantryIngredientMatchCandidate,
): string | null {
  const preferredName = pantryRow.name?.trim();
  if (preferredName) {
    return preferredName;
  }

  const normalizedIngredientName = pantryRow.ingredientName?.trim();
  return normalizedIngredientName || null;
}

function resolveMatchedIngredient(
  pantryRows: PantryIngredientMatchCandidate[],
  recipeIngredient: {
    ingredientId: string | null;
    ingredientKey: string;
    ingredientSpecificKey: string | null;
  },
  recipeIngredientName: string,
  graph: IngredientGraph | null,
): {
  match: RecipeIngredientMatch | null;
  matchedPantryRows: PantryIngredientMatchCandidate[];
} {
  let fallbackMatch: RecipeIngredientMatch | null = null;
  const fallbackRows: PantryIngredientMatchCandidate[] = [];
  const exactRows: PantryIngredientMatchCandidate[] = [];

  for (const pantryRow of pantryRows) {
    const result = matchPantryIngredient(pantryRow, recipeIngredient, graph);
    if (!result.matched) {
      continue;
    }

    const pantryIngredientName = resolvePantryIngredientDisplayName(pantryRow);

    if (result.matchType === "exact") {
      exactRows.push(pantryRow);
      continue;
    }

    if (!fallbackMatch) {
      fallbackMatch = {
        recipeIngredientName,
        pantryIngredientName,
        matchType: "fallback",
        displayName: buildMatchedIngredientDisplayName(
          recipeIngredientName,
          pantryIngredientName,
          "fallback",
        ),
        amount: null,
      };
    }
    fallbackRows.push(pantryRow);
  }

  if (exactRows.length > 0) {
    return {
      match: {
        recipeIngredientName,
        pantryIngredientName: exactRows[0]
          ? resolvePantryIngredientDisplayName(exactRows[0])
          : null,
        matchType: "exact",
        displayName: recipeIngredientName,
        amount: null,
      },
      matchedPantryRows: exactRows,
    };
  }

  return {
    match: fallbackMatch,
    matchedPantryRows: fallbackMatch ? fallbackRows : [],
  };
}

export async function getRecipeMatchesForUserProfile(
  userProfileId: string,
  options: RecipeMatchOptions = {},
): Promise<RecipeMatchesResult> {
  const requestedLocale = normalizeRecipeLocale(options.locale);
  const maxMissingIngredients = Math.max(
    1,
    options.maxMissingIngredients ?? DEFAULT_MAX_MISSING_INGREDIENTS,
  );
  const cookableLimit = Math.max(1, options.cookableLimit ?? DEFAULT_COOKABLE_LIMIT);
  const almostCookableLimit = Math.max(
    1,
    options.almostCookableLimit ?? DEFAULT_ALMOST_COOKABLE_LIMIT,
  );

  const { pantryIsEmpty, pantryIngredientKeyCount, analyzedRecipes } =
    await analyzeRecipeMatchesForUserProfile(userProfileId, {
      locale: requestedLocale,
    });

  if (pantryIsEmpty) {
    return {
      pantryIsEmpty: true,
      pantryIngredientKeyCount: 0,
      recipeCountAnalyzed: analyzedRecipes.length,
      cookable: [],
      almostCookable: [],
    };
  }

  const cookable = analyzedRecipes
    .filter((recipe) => recipe.missingRequiredIngredients === 0)
    .sort(sortCookable)
    .slice(0, cookableLimit);

  const almostCookable = analyzedRecipes
    .filter(
      (recipe) =>
        recipe.missingRequiredIngredients > 0 &&
        recipe.missingRequiredIngredients <= maxMissingIngredients &&
        recipe.matchedRequiredIngredients > 0,
    )
    .sort(sortAlmostCookable)
    .slice(0, almostCookableLimit);

  return {
    pantryIsEmpty: false,
    pantryIngredientKeyCount,
    recipeCountAnalyzed: analyzedRecipes.length,
    cookable,
    almostCookable,
  };
}

export async function getRecipeAvailabilityForUserProfile(
  userProfileId: string,
  recipeIds: string[],
  options: RecipeAvailabilityOptions = {},
): Promise<Map<string, MatchedRecipe>> {
  if (recipeIds.length === 0) {
    return new Map();
  }

  const { analyzedRecipes } = await analyzeRecipeMatchesForUserProfile(
    userProfileId,
    {
      locale: options.locale,
      recipeIds,
    },
  );

  return new Map(analyzedRecipes.map((recipe) => [recipe.id, recipe]));
}

function matchesRequestedMealType(
  categoryKey: string,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
): boolean {
  switch (mealType) {
    case "breakfast":
      return categoryKey === "breakfast";
    case "snack":
      return categoryKey === "snack" || categoryKey === "smoothies";
    case "lunch":
      return categoryKey === "lunch" || categoryKey === "lunch-and-dinner";
    case "dinner":
      return categoryKey === "dinner" || categoryKey === "lunch-and-dinner";
    default:
      return true;
  }
}

function sortPreferenceRecipes(
  left: MatchedRecipe,
  right: MatchedRecipe,
  requestedMealPrep: boolean,
): number {
  if (requestedMealPrep && left.mealPrepFriendly !== right.mealPrepFriendly) {
    return left.mealPrepFriendly ? -1 : 1;
  }

  if (right.proteinG !== left.proteinG) {
    return right.proteinG - left.proteinG;
  }

  if (left.totalTimeMin !== right.totalTimeMin) {
    return left.totalTimeMin - right.totalTimeMin;
  }

  return left.name.localeCompare(right.name);
}

export async function getPreferenceRecipeSuggestionsForUserProfile(
  userProfileId: string,
  options: RecipePreferenceSuggestionOptions = {},
): Promise<MatchedRecipe[]> {
  const requestedLocale = normalizeRecipeLocale(options.locale);
  const limit = Math.max(1, options.limit ?? 4);
  const requestedMealPrep = options.mealPrep ?? false;

  const { analyzedRecipes } = await analyzeRecipeMatchesForUserProfile(userProfileId, {
    locale: requestedLocale,
  });

  return analyzedRecipes
    .filter((recipe) =>
      options.mealType
        ? matchesRequestedMealType(recipe.categoryKey, options.mealType)
        : true,
    )
    .map((recipe) => ({
      ...recipe,
      ingredientItems: recipe.ingredientItems.map((ingredient) => ({
        ...ingredient,
        pantryComparison: null,
      })),
      matchedRequiredIngredients: 0,
      missingRequiredIngredients: 0,
      matchRatio: 0,
      matchedIngredients: [],
      matchedIngredientNames: [],
      missingIngredientNames: [],
    }))
    .sort((left, right) => sortPreferenceRecipes(left, right, requestedMealPrep))
    .slice(0, limit);
}

async function analyzeRecipeMatchesForUserProfile(
  userProfileId: string,
  options: AnalyzeRecipeMatchesOptions = {},
): Promise<AnalyzeRecipeMatchesResult> {
  const requestedLocale = normalizeRecipeLocale(options.locale);
  const recipeIds = options.recipeIds?.filter(Boolean) ?? [];
  const shouldFilterRecipes = recipeIds.length > 0;

  const userInfo = await db.query.userInfoTable.findFirst({
    where: eq(userInfoTable.userProfileId, userProfileId),
  });

  const dietFilterCondition = getDietFilterCondition(userInfo?.diet_preferences);

  const [pantryRows, recipeRows, recipeTranslationRows] =
    await Promise.all([
      db
        .select({
          name: pantryItems.name,
          ingredientKey: pantryItems.ingredientKey,
          ingredientSpecificKey: pantryItems.ingredientSpecificKey,
          ingredientId: pantryItems.ingredientId,
          ingredientName: pantryItems.ingredientName,
          trackingMode: pantryItems.trackingMode,
          inStock: pantryItems.inStock,
          quantity: pantryItems.quantity,
          unit: pantryItems.unit,
        })
        .from(pantryItems)
        .where(
          and(
            eq(pantryItems.userProfileId, userProfileId),
            or(
              isNotNull(pantryItems.ingredientSpecificKey),
              isNotNull(pantryItems.ingredientKey),
            ),
          ),
        ),
      db
        .select({
          recipeIngredientId: recipeIngredients.id,
          recipeId: recipes.id,
          slug: recipes.slug,
          externalKey: recipes.externalKey,
          categoryKey: recipes.categoryKey,
          defaultLocale: recipes.defaultLocale,
          servings: recipes.servings,
          prepTimeMin: recipes.prepTimeMin,
          totalTimeMin: recipes.totalTimeMin,
          calories: recipes.calories,
          proteinG: recipes.proteinG,
          carbohydratesG: recipes.carbohydratesG,
          fatG: recipes.fatG,
          restrictionFlags: recipes.restrictionFlags,
          mealPrepFriendly: recipes.mealPrepFriendly,
          canonicalName: recipeIngredients.canonicalName,
          ingredientKey: recipeIngredients.ingredientKey,
          ingredientSpecificKey: recipeIngredients.ingredientSpecificKey,
          ingredientId: recipeIngredients.ingredientId,
          displayLabel: recipeIngredients.displayLabel,
          quantity: recipeIngredients.quantity,
          unit: recipeIngredients.unit,
          optional: recipeIngredients.optional,
          sortOrder: recipeIngredients.sortOrder,
        })
        .from(recipeIngredients)
        .innerJoin(recipes, eq(recipeIngredients.recipeId, recipes.id))
        .where(
          and(
            isNotNull(recipeIngredients.ingredientKey),
            shouldFilterRecipes ? inArray(recipes.id, recipeIds) : undefined,
            dietFilterCondition ? dietFilterCondition : undefined,
          )
        ),
      db
        .select({
          recipeId: recipeTranslations.recipeId,
          locale: recipeTranslations.locale,
          name: recipeTranslations.name,
          categoryLabel: recipeTranslations.categoryLabel,
          servingUnitLabel: recipeTranslations.servingUnitLabel,
          instructions: recipeTranslations.instructions,
        })
        .from(recipeTranslations),
    ]);

  const availablePantryRows = pantryRows.filter((row) => row.inStock);
  const ingredientGraph = await loadIngredientGraph(requestedLocale);
  const ingredientNameMap = await loadIngredientNameMap(
    recipeRows
      .map((row) => row.ingredientId)
      .filter((id): id is string => Boolean(id)),
  );

  const pantryMatchCandidates = availablePantryRows
    .map((row) => [row.ingredientSpecificKey, row.ingredientKey].filter((value): value is string => Boolean(value)))
    .filter((candidates) => candidates.length > 0);
  const uniquePantryIngredientKeyCount = new Set(
    pantryMatchCandidates.flatMap((candidates) => candidates),
  ).size;

  const recipeTranslationMap = new Map<
    string,
    Map<
      string,
      {
        locale: string;
        name: string;
        categoryLabel: string | null;
        servingUnitLabel: string | null;
        instructions: unknown;
      }
    >
  >();

  for (const row of recipeTranslationRows) {
    let translationMap = recipeTranslationMap.get(row.recipeId);
    if (!translationMap) {
      translationMap = new Map();
      recipeTranslationMap.set(row.recipeId, translationMap);
    }

    translationMap.set(normalizeRecipeLocale(row.locale), row);
  }

  const ingredientTranslationMap = new Map<
    string,
    Map<string, { locale: string; displayName: string }>
  >();

  for (const row of recipeRows) {
    let translationMap = ingredientTranslationMap.get(row.recipeIngredientId);
    if (!translationMap) {
      translationMap = new Map();
      ingredientTranslationMap.set(row.recipeIngredientId, translationMap);
    }

    const names = row.ingredientId
      ? ingredientNameMap.get(row.ingredientId)
      : undefined;
    if (names) {
      for (const [nameLocale, name] of names) {
        const normalized = normalizeRecipeLocale(nameLocale);
        translationMap.set(normalized, {
          locale: normalized,
          displayName: name,
        });
      }
    }

    if (row.displayLabel) {
      const normalizedDefault = normalizeRecipeLocale(row.defaultLocale);
      translationMap.set(normalizedDefault, {
        locale: normalizedDefault,
        displayName: row.displayLabel,
      });
    }
  }

  const recipeBuckets = new Map<string, RecipeBucket>();

  for (const row of recipeRows) {
    const ingredientKey = row.ingredientKey;
    const recipeMatchKey = row.ingredientSpecificKey ?? ingredientKey;
    if (!recipeMatchKey || !ingredientKey || row.optional) {
      continue;
    }

    let bucket = recipeBuckets.get(row.recipeId);

    if (!bucket) {
      const localizedRecipe = resolveRecipeTranslation(
        recipeTranslationMap.get(row.recipeId),
        requestedLocale,
        row.defaultLocale,
      );

      if (!localizedRecipe) {
        continue;
      }

      bucket = {
        recipe: {
          id: row.recipeId,
          slug: row.slug,
          externalKey: row.externalKey,
          name: localizedRecipe.name,
          category: localizedRecipe.categoryLabel ?? row.categoryKey,
          categoryKey: row.categoryKey,
          servings: row.servings,
          servingUnit: localizedRecipe.servingUnitLabel ?? null,
          prepTimeMin: row.prepTimeMin,
          totalTimeMin: row.totalTimeMin,
          calories: row.calories,
          proteinG: row.proteinG,
          carbohydratesG: row.carbohydratesG,
          fatG: row.fatG,
          restrictionFlags: Array.isArray(row.restrictionFlags)
            ? row.restrictionFlags
            : [],
          instructions: normalizeRecipeInstructions(localizedRecipe.instructions),
          ingredientItems: [],
          mealPrepFriendly: row.mealPrepFriendly,
        },
        defaultLocale: row.defaultLocale,
        requiredIngredients: new Map(),
      };

      recipeBuckets.set(row.recipeId, bucket);
    }

    if (!bucket.requiredIngredients.has(recipeMatchKey)) {
      const localizedIngredient = resolveIngredientTranslation(
        ingredientTranslationMap.get(row.recipeIngredientId),
        requestedLocale,
        row.defaultLocale,
      );
      const fallbackName =
        resolveIngredientDisplayName(localizedIngredient, row.displayLabel) ??
        row.displayLabel ??
        row.canonicalName ??
        row.ingredientKey ??
        "ingredient";
      const categoryLabel =
        row.canonicalName?.trim() ||
        fallbackName;

      bucket.requiredIngredients.set(
        recipeMatchKey,
        {
          recipeMatchKey,
          ingredientKey,
          ingredientSpecificKey: row.ingredientSpecificKey,
          ingredientId: row.ingredientId,
          fallbackName,
          category: guessFoodCategory(categoryLabel),
          recipeIngredientId: row.recipeIngredientId,
          amount: formatRecipeIngredientAmount(
            row.quantity,
            row.unit,
            requestedLocale,
          ),
          quantity: row.quantity,
          unit: row.unit,
          sortOrder: row.sortOrder,
        },
      );
    }
  }

  const analyzedRecipes: MatchedRecipe[] = [];

  for (const bucket of recipeBuckets.values()) {
    const requiredIngredients = [...bucket.requiredIngredients.entries()].sort(
      (left, right) => left[1].sortOrder - right[1].sortOrder,
    );
    if (requiredIngredients.length === 0) {
      continue;
    }

    const matchedIngredients: RecipeIngredientMatch[] = [];
    const missingIngredientNames: string[] = [];
    const ingredientItems: RecipeIngredientItem[] = [];

    for (const [, ingredientMeta] of requiredIngredients) {
      const localizedIngredient = resolveIngredientTranslation(
        ingredientTranslationMap.get(ingredientMeta.recipeIngredientId),
        requestedLocale,
        bucket.defaultLocale,
      );
      const ingredientName =
        resolveIngredientDisplayName(localizedIngredient, ingredientMeta.fallbackName) ??
        ingredientMeta.fallbackName;

      const { match: matchedIngredient, matchedPantryRows } = resolveMatchedIngredient(
        availablePantryRows,
        {
          ingredientId: ingredientMeta.ingredientId,
          ingredientKey: ingredientMeta.ingredientKey,
          ingredientSpecificKey: ingredientMeta.ingredientSpecificKey,
        },
        ingredientName,
        ingredientGraph,
      );

      const pantryComparison = buildRecipeIngredientPantryComparison(
        ingredientMeta.quantity,
        ingredientMeta.unit,
        matchedPantryRows,
        requestedLocale,
      );

      ingredientItems.push({
        name: ingredientName,
        amount: ingredientMeta.amount,
        category: ingredientMeta.category,
        quantityValue:
          ingredientMeta.quantity === null
            ? null
            : Number.parseFloat(ingredientMeta.quantity),
        unit: ingredientMeta.unit,
        ingredientKey: ingredientMeta.ingredientKey,
        ingredientSpecificKey: ingredientMeta.ingredientSpecificKey,
        ingredientId: ingredientMeta.ingredientId,
        pantryComparison,
      });

      if (matchedIngredient) {
        matchedIngredients.push({
          ...matchedIngredient,
          amount: ingredientMeta.amount,
          pantryComparison,
        });
      } else {
        missingIngredientNames.push(ingredientName);
      }
    }

    analyzedRecipes.push({
      ...bucket.recipe,
      ingredientItems,
      totalRequiredIngredients: requiredIngredients.length,
      matchedRequiredIngredients: matchedIngredients.length,
      missingRequiredIngredients: missingIngredientNames.length,
      matchRatio: matchedIngredients.length / requiredIngredients.length,
      matchedIngredients,
      matchedIngredientNames: matchedIngredients.map(
        (ingredient) => ingredient.displayName,
      ),
      missingIngredientNames,
    });
  }

  const pantryIsEmpty = uniquePantryIngredientKeyCount === 0;

  return {
    pantryIsEmpty,
    pantryIngredientKeyCount: uniquePantryIngredientKeyCount,
    analyzedRecipes,
  };
}