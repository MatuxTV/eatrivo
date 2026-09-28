import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { auth } from "../../../../../../auth";
import { db } from "@/index";
import {
  recipeIngredients,
  recipes,
  recipeTranslations,
  userInfoTable,
  userProfiles,
} from "@/db/schema";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  normalizeRecipeLocale,
  resolveIngredientDisplayName,
  resolveIngredientTranslation,
  resolveRecipeTranslation,
  type RecipeTranslationRecord,
} from "@/lib/recipes/recipe-localization";
import { normalizeRecipeInstructions } from "@/lib/recipes/recipe-instructions";
import { formatRecipeIngredientAmount } from "@/lib/recipes/recipe-ingredients";
import { loadIngredientNameMap } from "@/lib/pantry/ingredient-resolution";
import { guessFoodCategory } from "@/lib/ingredients/units";
import { getRecipeAvailabilityForUserProfile } from "@/lib/recipes/recipe-matches";
import {
  handleApiError,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/safeError";

const paramsSchema = z.object({
  recipeId: z.uuid(),
});

const querySchema = z.object({
  locale: z.string().trim().min(2).max(10).optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ recipeId: string }> },
) {
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

    const rawParams = await context.params;
    const parsedParams = paramsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return validationError("Invalid recipe id", "params");
    }

    const parsedQuery = querySchema.safeParse({
      locale: req.nextUrl.searchParams.get("locale") ?? undefined,
    });
    if (!parsedQuery.success) {
      return validationError("Invalid recipe preview query", "query");
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: { id: true },
    });

    const userInfo = userProfile
      ? await db.query.userInfoTable.findFirst({
          where: eq(userInfoTable.userProfileId, userProfile.id),
          columns: { language: true },
        })
      : null;

    const locale = normalizeRecipeLocale(
      parsedQuery.data.locale ?? userInfo?.language ?? "en",
    );

    const recipeRow = await db.query.recipes.findFirst({
      where: eq(recipes.id, parsedParams.data.recipeId),
      columns: {
        id: true,
        slug: true,
        categoryKey: true,
        defaultLocale: true,
        servings: true,
        totalTimeMin: true,
        calories: true,
        proteinG: true,
        carbohydratesG: true,
        fatG: true,
        restrictionFlags: true,
        dietTags: true,
        mealPrepFriendly: true,
      },
    });

    if (!recipeRow) {
      return notFoundError("Recipe");
    }

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
          .where(eq(recipeTranslations.recipeId, recipeRow.id)),
        db
          .select({
            recipeIngredientId: recipeIngredients.id,
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
          .where(eq(recipeIngredients.recipeId, recipeRow.id)),
        userProfile
          ? getRecipeAvailabilityForUserProfile(userProfile.id, [recipeRow.id], {
              locale,
            })
          : Promise.resolve(new Map()),
      ]);

    const translationMap = new Map<string, RecipeTranslationRecord>();
    for (const translation of translationRows) {
      translationMap.set(translation.locale, {
        locale: translation.locale,
        name: translation.name,
        categoryLabel: translation.categoryLabel,
        servingUnitLabel: translation.servingUnitLabel,
        instructions: translation.instructions,
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
      const translationsForIngredient = new Map<
        string,
        { locale: string; displayName: string }
      >();
      const names = row.ingredientId
        ? ingredientNameMap.get(row.ingredientId)
        : undefined;

      if (names) {
        for (const [nameLocale, name] of names) {
          const normalized = normalizeRecipeLocale(nameLocale);
          translationsForIngredient.set(normalized, {
            locale: normalized,
            displayName: name,
          });
        }
      }

      if (row.displayLabel) {
        const normalizedDefault = normalizeRecipeLocale(recipeRow.defaultLocale);
        translationsForIngredient.set(normalizedDefault, {
          locale: normalizedDefault,
          displayName: row.displayLabel,
        });
      }

      ingredientTranslationMap.set(row.recipeIngredientId, translationsForIngredient);
    }

    const localizedRecipe = resolveRecipeTranslation(
      translationMap,
      locale,
      recipeRow.defaultLocale,
    );

    if (!localizedRecipe) {
      return notFoundError("Recipe translation");
    }

    const ingredientItems = ingredientRows
      .filter((ingredient) => !ingredient.optional)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((ingredient) => {
        const localizedIngredient = resolveIngredientTranslation(
          ingredientTranslationMap.get(ingredient.recipeIngredientId),
          locale,
          recipeRow.defaultLocale,
        );
        const ingredientName =
          resolveIngredientDisplayName(
            localizedIngredient,
            ingredient.displayLabel,
          ) ??
          ingredient.displayLabel ??
          ingredient.canonicalName ??
          ingredient.ingredientKey ??
          "ingredient";
        const ingredientCategoryName = ingredient.canonicalName?.trim() || ingredientName;

        return {
          name: ingredientName,
          amount: formatRecipeIngredientAmount(
            ingredient.quantity,
            ingredient.unit,
            locale,
          ),
          category: guessFoodCategory(ingredientCategoryName),
          quantityValue:
            ingredient.quantity === null
              ? null
              : Number.parseFloat(ingredient.quantity),
          unit: ingredient.unit,
          ingredientKey: ingredient.ingredientKey,
          ingredientSpecificKey: ingredient.ingredientSpecificKey,
          ingredientId: ingredient.ingredientId,
        };
      });

    const availability = availabilityMap.get(recipeRow.id);
    const preview = {
      id: recipeRow.id,
      slug: recipeRow.slug,
      title: localizedRecipe.name,
      category: localizedRecipe.categoryLabel ?? recipeRow.categoryKey,
      categoryKey: recipeRow.categoryKey,
      servings: recipeRow.servings,
      totalTimeMin: recipeRow.totalTimeMin,
      calories: recipeRow.calories,
      proteinG: recipeRow.proteinG,
      carbsG: recipeRow.carbohydratesG,
      fatG: recipeRow.fatG,
      restrictionFlags: Array.isArray(recipeRow.restrictionFlags)
        ? recipeRow.restrictionFlags
        : [],
      instructions: normalizeRecipeInstructions(localizedRecipe.instructions),
      dietTags: Array.isArray(recipeRow.dietTags) ? recipeRow.dietTags : [],
      ingredientItems: availability?.ingredientItems ?? ingredientItems,
      ingredientPreview: ingredientItems.map((ingredient) => ingredient.name),
      matchedIngredients: availability?.matchedIngredients,
      mealPrepFriendly: recipeRow.mealPrepFriendly,
      missingIngredients: availability?.missingIngredientNames,
    };

    return NextResponse.json({
      success: true,
      locale,
      recipe: preview,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/recipes/[recipeId]/preview");
  }
}