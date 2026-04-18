import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { auth } from "../../../auth";
import HomePage from "@/app/home/basic/HomePage";
import type {
  BasicHomePantrySummary,
  BasicHomeRecipePreview,
} from "@/app/home/types/data";
import type { InitialPantrySectionData } from "@/app/home/types/section-data";
import { isLocale, type Locale } from "@/i18n/routing";
import { db } from "@/index";
import {
  pantryItems,
  pantryRestockItems,
  recipeIngredients,
  recipeIngredientTranslations,
  recipes,
  recipeTranslations,
  shoppingListItems,
  shoppingLists,
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
} from "@/lib/recipe-instructions";
import { getUserContext } from "@/lib/user-context-cache";
import { CacheService } from "@/lib/redis";
import {
  formatRecipeIngredientAmount,
  type RecipeIngredientItem,
} from "@/lib/recipe-ingredients";
import { guessFoodCategory } from "@/lib/units";
import { buildPantryInventoryItems } from "@/lib/pantry/grocery";
import { getPantryDrafts } from "@/lib/pantry/draft-cache";
import { pantryCacheKey } from "@/lib/pantry/restock";
import {
  normalizeRecipeLocale,
  resolveRecipeTranslation,
  resolveIngredientDisplayName,
  resolveIngredientTranslation,
} from "@/lib/recipe-localization";

function serializeNullableDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
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
    .where(dietFilterCondition ? dietFilterCondition : undefined)
    .orderBy(
      desc(recipes.proteinG),
      asc(recipes.totalTimeMin),
      asc(recipes.slug),
    )
    .limit(8);

  const featuredRecipeIds = featuredRecipeRows.map((row) => row.id);
  const [featuredRecipeTranslationRows, featuredIngredientRows, featuredIngredientTranslationRows] =
    featuredRecipeIds.length === 0
      ? [[], [], []]
      : await Promise.all([
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
            .where(inArray(recipeTranslations.recipeId, featuredRecipeIds)),
          db
            .select({
              recipeId: recipeIngredients.recipeId,
              recipeIngredientId: recipeIngredients.id,
              defaultLocale: recipes.defaultLocale,
              canonicalName: recipeIngredients.canonicalName,
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
            })
            .from(recipeIngredientTranslations),
        ]);

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

  for (const row of featuredRecipeTranslationRows) {
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
      resolveIngredientDisplayName(localizedIngredient, row.canonicalName) ??
      row.canonicalName ??
      row.ingredientKey ??
      "ingredient";
    const ingredientCategoryName =
      row.canonicalName?.trim() ||
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
    featuredRecipeRows.flatMap((row) => {
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
      const availability = availabilityByRecipeId?.get(row.id);

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
        restrictionFlags: Array.isArray(row.restrictionFlags)
          ? row.restrictionFlags
          : [],
        instructions: normalizeRecipeInstructions(localizedRecipe.instructions),
        dietTags: Array.isArray(row.dietTags) ? row.dietTags : [],
        ingredientItems:
          availability?.ingredientItems ??
          ingredientItemsByRecipeId.get(row.id) ??
          [],
        ingredientPreview: fullIngredients,
        matchedIngredients: availability?.matchedIngredients,
        mealPrepFriendly: row.mealPrepFriendly,
        missingIngredients: availability?.missingIngredientNames,
      }];
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
      servings: match.servings,
      totalTimeMin: match.totalTimeMin,
      calories: match.calories,
      proteinG: match.proteinG,
      carbsG: match.carbohydratesG,
      fatG: match.fatG,
      restrictionFlags: match.restrictionFlags,
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
      servings: match.servings,
      totalTimeMin: match.totalTimeMin,
      calories: match.calories,
      proteinG: match.proteinG,
      carbsG: match.carbohydratesG,
      fatG: match.fatG,
      restrictionFlags: match.restrictionFlags,
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

async function getInitialProfileSectionData(userId: string, email?: string | null) {
  const context = await getUserContext(userId);

  if (!context.userProfile) {
    return {
      profile: null,
      nutrition: null,
    };
  }

  const nutrition = context.userInfo
    ? {
        ...context.userInfo,
        weight: context.userInfo.weight ? String(context.userInfo.weight) : "",
        activity_level: context.userInfo.activity_level?.trim() || null,
        goal: context.userInfo.goal?.trim() || null,
        cooking_time_pref: context.userInfo.cooking_time_pref?.trim() || null,
        meal_prep: context.userInfo.meal_prep ?? false,
        meal_prep_days: context.userInfo.meal_prep_days ?? null,
        diet_preferences: context.userInfo.diet_preferences?.trim() || null,
        budget_preference: context.userInfo.budget_preference?.trim() || null,
        likes: context.userInfo.likes || "",
        dislikes: context.userInfo.dislikes || "",
        allergies: context.userInfo.allergies || "",
      }
    : null;

  return {
    profile: {
      fullName: context.userProfile.fullName,
      email: email ?? "",
      dateOfBirth: context.userInfo?.dateOfBirth
        ? new Date(context.userInfo.dateOfBirth).toISOString().split("T")[0]
        : "",
      membership: context.membership || "basic",
      badges: context.badges,
    },
    nutrition,
  };
}

async function getInitialPantrySectionData(userId: string): Promise<InitialPantrySectionData> {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  if (!userProfile) {
    return {
      items: [],
      restockItems: [],
      pendingDrafts: [],
    };
  }

  const [activeShoppingList, restockRows, cachedPantryRows, pendingDrafts] = await Promise.all([
    db.query.shoppingLists.findFirst({
      where: and(
        eq(shoppingLists.userProfileId, userProfile.id),
        eq(shoppingLists.status, "active"),
      ),
    }),
    db
      .select()
      .from(pantryRestockItems)
      .where(
        and(
          eq(pantryRestockItems.userProfileId, userProfile.id),
          eq(pantryRestockItems.isActive, true),
        ),
      )
      .orderBy(asc(pantryRestockItems.createdAt)),
    CacheService.get<(typeof pantryItems.$inferSelect)[]>(pantryCacheKey(userProfile.id)),
    getPantryDrafts(userProfile.id),
  ]);

  const pantryRows =
    cachedPantryRows ??
    (await db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userProfileId, userProfile.id))
      .orderBy(asc(pantryItems.createdAt)));

  const activeShoppingListItems = activeShoppingList
    ? await db
        .select()
        .from(shoppingListItems)
        .where(eq(shoppingListItems.shoppingListId, activeShoppingList.id))
        .orderBy(asc(shoppingListItems.sortOrder))
    : [];

  return {
    items: buildPantryInventoryItems(
      pantryRows,
      restockRows,
      activeShoppingListItems,
      activeShoppingList?.id ?? null,
    ).map((item) => ({
      ...item,
      createdAt: serializeNullableDate(item.createdAt) ?? new Date().toISOString(),
      updatedAt: serializeNullableDate(item.updatedAt) ?? new Date().toISOString(),
      expiryDate: serializeNullableDate(item.expiryDate),
    })),
    restockItems: restockRows.filter((item) => item.isActive).map((item) => ({
      ...item,
      createdAt: serializeNullableDate(item.createdAt) ?? new Date().toISOString(),
      updatedAt: serializeNullableDate(item.updatedAt) ?? new Date().toISOString(),
      lastRestockedAt: serializeNullableDate(item.lastRestockedAt),
    })),
    pendingDrafts: pendingDrafts.map((draft) => ({
      ...draft,
      createdAt: serializeNullableDate(draft.createdAt) ?? new Date().toISOString(),
      expiresAt: serializeNullableDate(draft.expiresAt) ?? new Date().toISOString(),
    })),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const safeLocale: Locale = isLocale(locale) ? locale : "sk";

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

export default async function HomePageCanonical() {
  const locale = await getLocale();
  const safeLocale: Locale = isLocale(locale) ? locale : "sk";

  const session = await auth();
  if (!session?.user) {
    redirect(`/${safeLocale}`);
  }

  const [basicHomeData, initialProfileSectionData, initialPantrySectionData] = await Promise.all([
    getBasicHomeData(session.user.id, safeLocale),
    getInitialProfileSectionData(session.user.id, session.user.email),
    getInitialPantrySectionData(session.user.id),
  ]);

  return (
    <HomePage
      featuredRecipes={basicHomeData.featuredRecipes}
      pantrySummary={basicHomeData.pantrySummary}
      cookableRecipes={basicHomeData.cookableRecipes}
      almostCookableRecipes={basicHomeData.almostCookableRecipes}
      pantryNames={basicHomeData.pantryNames}
      initialProfileData={initialProfileSectionData.profile}
      initialNutritionData={initialProfileSectionData.nutrition}
      initialPantryData={initialPantrySectionData}
    />
  );
}
