import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { auth } from "../../../../auth";
import HomePage from "@/app/home/basic/HomePage";
import { defaultLocale, isLocale, type Locale } from "@/i18n/routing";
import { db } from "@/index";
import {
  pantryItems,
  recipeIngredients,
  recipeIngredientTranslations,
  recipes,
  recipeTranslations,
  userProfiles,
  userInfoTable,
} from "@/db/schema";
import { getDietFilterCondition } from "@/lib/recipe-filters";
import {
  getRecipeAvailabilityForUserProfile,
  getRecipeMatchesForUserProfile,
} from "@/lib/recipe-matches";
import {
  normalizeRecipeInstructions,
  type RecipeInstruction,
} from "@/lib/recipe-instructions";
import {
  formatRecipeIngredientAmount,
  type RecipeIngredientItem,
} from "@/lib/recipe-ingredients";
import { guessFoodCategory } from "@/lib/units";
import {
  normalizeRecipeLocale,
  resolveIngredientDisplayName,
  resolveIngredientTranslation,
} from "@/lib/recipe-localization";

type StoredIngredientTranslation = {
  display_name: string;
  ingredient_name: string | null;
};

type StoredRecipeIngredient = {
  translations?: Record<string, StoredIngredientTranslation>;
};

function resolveStoredIngredientDisplayName(
  translation: StoredIngredientTranslation | undefined,
): string | null {
  const displayName = translation?.display_name?.trim();
  if (displayName) {
    return displayName;
  }

  const ingredientName = translation?.ingredient_name?.trim();
  return ingredientName || null;
}

export interface BasicHomeRecipePreview {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryKey: string;
  totalTimeMin: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  instructions: RecipeInstruction[];
  dietTags: string[];
  ingredientItems: RecipeIngredientItem[];
  ingredientPreview: string[];
  matchedIngredients?: {
    recipeIngredientName: string;
    pantryIngredientName: string | null;
    matchType: "exact" | "fallback";
    displayName: string;
    amount: string | null;
  }[];
  mealPrepFriendly: boolean;
  missingIngredients?: string[];
}

export interface BasicHomePantrySummary {
  itemCount: number;
  cookableCount: number;
}

function extractAllIngredientNames(
  ingredients: unknown,
  locale: string,
): string[] {
  if (!Array.isArray(ingredients)) {
    return [];
  }

  const normalizedLocale = locale.toLowerCase();

  return ingredients.flatMap((ingredient) => {
    if (!ingredient || typeof ingredient !== "object") {
      return [];
    }

    const translations = (ingredient as StoredRecipeIngredient).translations;
    if (!translations || typeof translations !== "object") {
      return [];
    }

    const translation =
      translations[normalizedLocale] ??
      translations.en ??
      Object.values(translations)[0];

    const label = resolveStoredIngredientDisplayName(translation);

    return label ? [label] : [];
  });
}

async function getBasicHomeData(
  userId: string,
  locale: Locale,
): Promise<{
  featuredRecipes: BasicHomeRecipePreview[];
  pantrySummary: BasicHomePantrySummary;
  cookableRecipes: BasicHomeRecipePreview[];
  almostCookableRecipes: BasicHomeRecipePreview[];
  pantryNames: string[];
}> {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  const userInfo = userProfile
    ? await db.query.userInfoTable.findFirst({
        where: eq(userInfoTable.userProfileId, userProfile.id),
      })
    : null;

  const dietFilterCondition = getDietFilterCondition(userInfo?.diet_preferences);

  const featuredRecipeRows = await db
    .select({
      id: recipes.id,
      slug: recipes.slug,
      fallbackName: recipes.name,
      fallbackCategory: recipes.category,
      categoryKey: recipes.categoryKey,
      totalTimeMin: recipes.totalTimeMin,
      calories: recipes.calories,
      proteinG: recipes.proteinG,
      carbsG: recipes.carbohydratesG,
      fatG: recipes.fatG,
      dietTags: recipes.dietTags,
      ingredients: recipes.ingredients,
      fallbackInstructions: recipes.instructions,
      mealPrepFriendly: recipes.mealPrepFriendly,
      localizedName: recipeTranslations.name,
      localizedCategory: recipeTranslations.categoryLabel,
      localizedInstructions: recipeTranslations.instructions,
    })
    .from(recipes)
    .leftJoin(
      recipeTranslations,
      and(
        eq(recipeTranslations.recipeId, recipes.id),
        eq(recipeTranslations.locale, locale),
      ),
    )
    .where(dietFilterCondition ? dietFilterCondition : undefined)
    .orderBy(
      desc(recipes.proteinG),
      asc(recipes.totalTimeMin),
      asc(recipes.name),
    )
    .limit(8);

  const featuredRecipeIds = featuredRecipeRows.map((row) => row.id);
  const [featuredIngredientRows, featuredIngredientTranslationRows] =
    featuredRecipeIds.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select({
              recipeId: recipeIngredients.recipeId,
              recipeIngredientId: recipeIngredients.id,
              defaultLocale: recipes.defaultLocale,
              ingredientName: recipeIngredients.ingredientName,
              displayName: recipeIngredients.displayName,
              ingredientKey: recipeIngredients.ingredientKey,
              ingredientSpecificKey: recipeIngredients.ingredientSpecificKey,
              quantity: recipeIngredients.quantity,
              unit: recipeIngredients.unit,
              sortOrder: recipeIngredients.sortOrder,
              optional: recipeIngredients.optional,
            })
            .from(recipeIngredients)
            .innerJoin(recipes, eq(recipeIngredients.recipeId, recipes.id))
            .where(inArray(recipeIngredients.recipeId, featuredRecipeIds)),
          db
            .select({
              recipeIngredientId: recipeIngredientTranslations.recipeIngredientId,
              locale: recipeIngredientTranslations.locale,
              displayName: recipeIngredientTranslations.displayName,
              ingredientName: recipeIngredientTranslations.ingredientName,
            })
            .from(recipeIngredientTranslations),
        ]);

  const ingredientTranslationMap = new Map<
    string,
    Map<string, { locale: string; displayName: string; ingredientName: string | null }>
  >();

  for (const row of featuredIngredientTranslationRows) {
    let translationMap = ingredientTranslationMap.get(row.recipeIngredientId);
    if (!translationMap) {
      translationMap = new Map();
      ingredientTranslationMap.set(row.recipeIngredientId, translationMap);
    }

    translationMap.set(normalizeRecipeLocale(row.locale), row);
  }

  const ingredientItemsByRecipeId = new Map<string, RecipeIngredientItem[]>();

  for (const row of [...featuredIngredientRows].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )) {
    if (row.optional) {
      continue;
    }

    const localizedIngredient = resolveIngredientTranslation(
      ingredientTranslationMap.get(row.recipeIngredientId),
      locale,
      row.defaultLocale,
    );

    const existingItems = ingredientItemsByRecipeId.get(row.recipeId) ?? [];
    const ingredientName =
      resolveIngredientDisplayName(localizedIngredient, row.displayName) ??
      row.ingredientName ??
      row.displayName;
    const ingredientCategoryName =
      localizedIngredient?.ingredientName?.trim() ||
      row.ingredientName?.trim() ||
      ingredientName;

    existingItems.push({
      name: ingredientName,
      amount: formatRecipeIngredientAmount(row.quantity, row.unit, locale),
      category: guessFoodCategory(ingredientCategoryName),
      quantityValue:
        row.quantity === null ? null : Number.parseFloat(row.quantity),
      unit: row.unit,
      ingredientKey: row.ingredientKey,
      ingredientSpecificKey: row.ingredientSpecificKey,
    });
    ingredientItemsByRecipeId.set(row.recipeId, existingItems);
  }

  const allIngredients = featuredRecipeRows.map((row) => ({
    id: row.id,
    allNames: extractAllIngredientNames(row.ingredients, locale),
  }));

  const buildFeaturedRecipes = (
    availabilityByRecipeId?: Map<
      string,
      Awaited<ReturnType<typeof getRecipeAvailabilityForUserProfile>> extends Map<
        string,
        infer TValue
      >
        ? TValue
        : never
    >,
  ): BasicHomeRecipePreview[] =>
    featuredRecipeRows.map((row) => {
      const fullIngredients =
        allIngredients.find((r) => r.id === row.id)?.allNames ?? [];
      const availability = availabilityByRecipeId?.get(row.id);

      return {
        id: row.id,
        slug: row.slug,
        title: row.localizedName ?? row.fallbackName,
        category: row.localizedCategory ?? row.fallbackCategory,
        categoryKey: row.categoryKey,
        totalTimeMin: row.totalTimeMin,
        calories: row.calories,
        proteinG: row.proteinG,
        carbsG: row.carbsG,
        fatG: row.fatG,
        instructions: normalizeRecipeInstructions(
          row.localizedInstructions ?? row.fallbackInstructions,
        ),
        dietTags: Array.isArray(row.dietTags) ? row.dietTags : [],
        ingredientItems:
          availability?.ingredientItems ??
          ingredientItemsByRecipeId.get(row.id) ??
          [],
        ingredientPreview: fullIngredients,
        matchedIngredients: availability?.matchedIngredients,
        mealPrepFriendly: row.mealPrepFriendly,
        missingIngredients: availability?.missingIngredientNames,
      };
    });

  const featuredRecipes = buildFeaturedRecipes();

  if (!userProfile) {
    return {
      featuredRecipes,
      pantrySummary: {
        itemCount: 0,
        cookableCount: 0,
      },
      cookableRecipes: [],
      almostCookableRecipes: [],
      pantryNames: [],
    };
  }

  const [pantryCountRow, recipeMatches, pantryNameRows, featuredAvailability] = await Promise.all([
    db
      .select({ value: count() })
      .from(pantryItems)
      .where(eq(pantryItems.userProfileId, userProfile.id)),
    getRecipeMatchesForUserProfile(userProfile.id, {
      locale,
      maxMissingIngredients: 3,
      cookableLimit: 6,
      almostCookableLimit: 6,
    }),
    db
      .select({
        name: pantryItems.name,
        ingredientName: pantryItems.ingredientName,
      })
      .from(pantryItems)
      .where(eq(pantryItems.userProfileId, userProfile.id)),
    getRecipeAvailabilityForUserProfile(
      userProfile.id,
      featuredRecipeRows.map((row) => row.id),
      { locale },
    ),
  ]);

  // Build a flat list of pantry ingredient names for client-side comparison
  const pantryNames = pantryNameRows.flatMap((row) => {
    const names: string[] = [];
    if (row.name) names.push(row.name.toLowerCase().trim());
    if (row.ingredientName) names.push(row.ingredientName.toLowerCase().trim());
    return names;
  });

  return {
    featuredRecipes: buildFeaturedRecipes(featuredAvailability),
    pantrySummary: {
      itemCount: pantryCountRow[0]?.value ?? 0,
      cookableCount: recipeMatches.cookable.length,
    },
    cookableRecipes: recipeMatches.cookable.map((match) => ({
      id: match.id,
      slug: match.slug,
      title: match.name,
      category: match.category,
      categoryKey: match.categoryKey,
      totalTimeMin: match.totalTimeMin,
      calories: match.calories,
      proteinG: match.proteinG,
      carbsG: match.carbohydratesG,
      fatG: match.fatG,
      instructions: match.instructions,
      dietTags: [],
      ingredientItems: match.ingredientItems,
      ingredientPreview: match.matchedIngredientNames,
      matchedIngredients: match.matchedIngredients,
      mealPrepFriendly: match.mealPrepFriendly,
    })),
    almostCookableRecipes: recipeMatches.almostCookable.map((match) => ({
      id: match.id,
      slug: match.slug,
      title: match.name,
      category: match.category,
      categoryKey: match.categoryKey,
      totalTimeMin: match.totalTimeMin,
      calories: match.calories,
      proteinG: match.proteinG,
      carbsG: match.carbohydratesG,
      fatG: match.fatG,
      instructions: match.instructions,
      dietTags: [],
      ingredientItems: match.ingredientItems,
      ingredientPreview: match.matchedIngredientNames,
      matchedIngredients: match.matchedIngredients,
      mealPrepFriendly: match.mealPrepFriendly,
      missingIngredients: match.missingIngredientNames,
    })),
    pantryNames,
  };
}

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const t = await getTranslations({
    locale: safeLocale,
    namespace: "home",
  });
  const common = await getTranslations({
    locale: safeLocale,
    namespace: "common",
  });

  return {
    title: `${t("metadata.title")} - ${common("appName")}`,
    description: t("metadata.description"),
  };
}

export default async function HomePageWrapper({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const session = await auth();
  if (!session?.user) {
    redirect(`/${safeLocale}/signin`);
  }

  // if (session?.user?.membership === "premium") {
  //   return <HomePagePremium />;
  // } else {
    const basicHomeData = await getBasicHomeData(session.user.id, safeLocale);

    return (
      <HomePage
        featuredRecipes={basicHomeData.featuredRecipes}
        pantrySummary={basicHomeData.pantrySummary}
        cookableRecipes={basicHomeData.cookableRecipes}
        almostCookableRecipes={basicHomeData.almostCookableRecipes}
        pantryNames={basicHomeData.pantryNames}
      />
    );
  }
// }
