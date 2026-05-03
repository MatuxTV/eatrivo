import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { and, asc, count, eq } from "drizzle-orm";

import { auth } from "../../../auth";
import HomePage from "@/app/home/basic/HomePage";
import type {
  BasicHomePantrySummary,
  BasicHomeRecipePreview,
  RecipeBrowseAvailableFilters,
} from "@/app/home/types/data";
import type { InitialPantrySectionData } from "@/app/home/types/section-data";
import {
  pantryItems,
  pantryRestockItems,
  shoppingListItems,
  shoppingLists,
  userProfiles,
  userInfoTable,
} from "@/db/schema";
import { isLocale, type Locale } from "@/i18n/routing";
import { db } from "@/index";
import { CacheService } from "@/lib/cache/redis";
import { getPantryDrafts } from "@/lib/pantry/draft-cache";
import { buildPantryInventoryItems } from "@/lib/pantry/grocery";
import { pantryCacheKey } from "@/lib/pantry/restock";
import {
  getRecipeBrowseAvailableFilters,
  getRecipeBrowsePage,
} from "@/lib/recipes/browse";
import { getRecipeMatchesForUserProfile } from "@/lib/recipes/recipe-matches";
import { getUserContext } from "@/lib/user/user-context-cache";
import { shuffleRecipesByTime } from "@/app/home/utils/shuffleRecipes";

function serializeNullableDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

async function getBasicHomeData(
  userId: string,
  locale: Locale,
  recipeShuffleTime: number,
): Promise<{
  featuredRecipes: BasicHomeRecipePreview[];
  recipeBrowseAvailableFilters: RecipeBrowseAvailableFilters;
  initialRecipeHasMore: boolean;
  initialRecipeTotalCount: number;
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

  const [initialRecipePage, availableRecipeFilters] = await Promise.all([
    getRecipeBrowsePage({
      locale,
      dietPreference: userInfo?.diet_preferences,
      userProfileId: userProfile?.id ?? null,
      offset: 0,
      limit: 8,
    }),
    getRecipeBrowseAvailableFilters({
      dietPreference: userInfo?.diet_preferences,
    }),
  ]);

  const featuredRecipes = shuffleRecipesByTime(
    initialRecipePage.recipes,
    recipeShuffleTime,
  );

  if (!userProfile) {
    return {
      featuredRecipes,
      recipeBrowseAvailableFilters: availableRecipeFilters,
      initialRecipeHasMore: initialRecipePage.hasMore,
      initialRecipeTotalCount: initialRecipePage.totalCount,
      pantrySummary: {
        itemCount: 0,
        cookableCount: 0,
      },
      cookableRecipes: [],
      almostCookableRecipes: [],
      pantryNames: [],
    };
  }

  const [pantryCountRow, recipeMatches, pantryNameRows] = await Promise.all([
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
  ]);

  const pantryNames = pantryNameRows.flatMap((row) => {
    const names: string[] = [];
    if (row.name) names.push(row.name.toLowerCase().trim());
    if (row.ingredientName) names.push(row.ingredientName.toLowerCase().trim());
    return names;
  });

  return {
    featuredRecipes,
    recipeBrowseAvailableFilters: availableRecipeFilters,
    initialRecipeHasMore: initialRecipePage.hasMore,
    initialRecipeTotalCount: initialRecipePage.totalCount,
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
      isEmailSubscriptionActive: context.userProfile.isEmailSubscriptionActive,
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

  const recipeShuffleTime = Date.now();

  const [basicHomeData, initialProfileSectionData, initialPantrySectionData] = await Promise.all([
    getBasicHomeData(session.user.id, safeLocale, recipeShuffleTime),
    getInitialProfileSectionData(session.user.id, session.user.email),
    getInitialPantrySectionData(session.user.id),
  ]);

  return (
    <HomePage
      membership={session.user.membership ?? "basic"}
      featuredRecipes={basicHomeData.featuredRecipes}
      recipeShuffleTime={recipeShuffleTime}
      recipeBrowseAvailableFilters={basicHomeData.recipeBrowseAvailableFilters}
      initialRecipeHasMore={basicHomeData.initialRecipeHasMore}
      initialRecipeTotalCount={basicHomeData.initialRecipeTotalCount}
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
