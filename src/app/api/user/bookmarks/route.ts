import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { count, desc, eq, inArray } from "drizzle-orm";

import { auth } from "../../../../../auth";
import { db } from "@/index";
import {
  recipeBookmarks,
  recipes,
  recipeTranslations,
  userInfoTable,
  userProfiles,
} from "@/db/schema";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  normalizeRecipeLocale,
  resolveRecipeTranslation,
  type RecipeTranslationRecord,
} from "@/lib/recipe-localization";
import {
  handleApiError,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/safeError";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
  locale: z.string().trim().min(2).max(10).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const identifier = getRateLimitIdentifier(
      req as unknown as Request,
      session.user.id,
    );
    const rateLimitResult = await checkRateLimit(identifier, "standard");
    if (!rateLimitResult.success) {
      return (
        rateLimitResult.response ??
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
    }

    const parsedQuery = querySchema.safeParse({
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
      offset: req.nextUrl.searchParams.get("offset") ?? undefined,
      locale: req.nextUrl.searchParams.get("locale") ?? undefined,
    });

    if (!parsedQuery.success) {
      return validationError("Invalid bookmark query", "query");
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: { id: true },
    });

    if (!userProfile) {
      return notFoundError("Profile");
    }

    const userInfo = await db.query.userInfoTable.findFirst({
      where: eq(userInfoTable.userProfileId, userProfile.id),
      columns: { language: true },
    });

    const locale = normalizeRecipeLocale(
      parsedQuery.data.locale ?? userInfo?.language ?? "en",
    );

    const [{ total }] = await db
      .select({ total: count() })
      .from(recipeBookmarks)
      .where(eq(recipeBookmarks.userProfileId, userProfile.id));

    const bookmarkRows = await db
      .select({
        bookmarkId: recipeBookmarks.id,
        bookmarkedAt: recipeBookmarks.createdAt,
        recipeId: recipes.id,
        slug: recipes.slug,
        externalKey: recipes.externalKey,
        defaultLocale: recipes.defaultLocale,
        categoryKey: recipes.categoryKey,
        mealPrepFriendly: recipes.mealPrepFriendly,
        prepTimeMin: recipes.prepTimeMin,
        totalTimeMin: recipes.totalTimeMin,
        calories: recipes.calories,
        proteinG: recipes.proteinG,
        carbohydratesG: recipes.carbohydratesG,
        fatG: recipes.fatG,
        servings: recipes.servings,
        dietTags: recipes.dietTags,
        restrictionFlags: recipes.restrictionFlags,
      })
      .from(recipeBookmarks)
      .innerJoin(recipes, eq(recipeBookmarks.recipeId, recipes.id))
      .where(eq(recipeBookmarks.userProfileId, userProfile.id))
      .orderBy(desc(recipeBookmarks.createdAt))
      .limit(parsedQuery.data.limit)
      .offset(parsedQuery.data.offset);

    const recipeIds = bookmarkRows.map((row) => row.recipeId);

    const translations = recipeIds.length
      ? await db
          .select({
            recipeId: recipeTranslations.recipeId,
            locale: recipeTranslations.locale,
            name: recipeTranslations.name,
            categoryLabel: recipeTranslations.categoryLabel,
            servingUnitLabel: recipeTranslations.servingUnitLabel,
            instructions: recipeTranslations.instructions,
          })
          .from(recipeTranslations)
          .where(inArray(recipeTranslations.recipeId, recipeIds))
      : [];

    const translationMap = new Map<string, Map<string, RecipeTranslationRecord>>();
    for (const translation of translations) {
      const recipeTranslationRows =
        translationMap.get(translation.recipeId) ??
        new Map<string, RecipeTranslationRecord>();
      recipeTranslationRows.set(translation.locale, {
        locale: translation.locale,
        name: translation.name,
        categoryLabel: translation.categoryLabel,
        servingUnitLabel: translation.servingUnitLabel,
        instructions: translation.instructions,
      });
      translationMap.set(translation.recipeId, recipeTranslationRows);
    }

    const items = bookmarkRows.map((row) => {
      const resolvedTranslation = resolveRecipeTranslation(
        translationMap.get(row.recipeId),
        locale,
        row.defaultLocale,
      );

      return {
        id: row.recipeId,
        slug: row.slug,
        externalKey: row.externalKey,
        name: resolvedTranslation?.name ?? row.slug,
        categoryKey: row.categoryKey,
        categoryLabel: resolvedTranslation?.categoryLabel ?? row.categoryKey,
        mealPrepFriendly: row.mealPrepFriendly,
        prepTimeMin: row.prepTimeMin,
        totalTimeMin: row.totalTimeMin,
        calories: row.calories,
        proteinG: row.proteinG,
        carbohydratesG: row.carbohydratesG,
        fatG: row.fatG,
        servings: row.servings,
        servingUnit: resolvedTranslation?.servingUnitLabel ?? null,
        dietTags: Array.isArray(row.dietTags) ? row.dietTags : [],
        restrictionFlags: Array.isArray(row.restrictionFlags)
          ? row.restrictionFlags
          : [],
        bookmarkedAt: row.bookmarkedAt,
      };
    });

    return NextResponse.json({
      success: true,
      locale,
      items,
      pagination: {
        total,
        limit: parsedQuery.data.limit,
        offset: parsedQuery.data.offset,
        hasMore: parsedQuery.data.offset + items.length < total,
      },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/user/bookmarks");
  }
}
