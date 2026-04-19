import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "../../../../../auth";
import { trackEvent } from "@/lib/analytics/analytics";
import { apiLogger } from "@/lib/logger";
import { consumeRecipeFromPantry } from "@/lib/pantry/consumption";
import { getUserProfileByUserId } from "@/lib/pantry/restock";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  handleApiError,
  safeErrorResponse,
  unauthorizedError,
  validationError,
} from "@/lib/safeError";
import { pantryConsumeRecipeSchema } from "@/lib/schemas/pantry";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedError("Unauthorized");
  }

  const identifier = getRateLimitIdentifier(
    req as unknown as Request,
    session.user.id,
  );
  const rateLimitResult = await checkRateLimit(identifier, "pantry");
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const parsedBody = pantryConsumeRecipeSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsedBody.success) {
      return validationError("Validation failed");
    }

    apiLogger.debug("[pantry.consume-recipe] request validated", {
      metadata: {
        userId: session.user.id,
        recipeId: parsedBody.data.recipeId ?? null,
        recipeTitle: parsedBody.data.recipeTitle,
        ingredientCount: parsedBody.data.ingredientItems.length,
        matchedIngredientCount: parsedBody.data.matchedIngredients.length,
      },
    });

    const userProfile = await getUserProfileByUserId(session.user.id);
    if (!userProfile) {
      return safeErrorResponse("Profile not found", {
        status: 404,
        code: "PROFILE_NOT_FOUND",
      });
    }

    const summary = await consumeRecipeFromPantry({
      userProfileId: userProfile.id,
      recipeId: parsedBody.data.recipeId,
      recipeTitle: parsedBody.data.recipeTitle,
      ingredientItems: parsedBody.data.ingredientItems,
      matchedIngredients: parsedBody.data.matchedIngredients,
    });

    apiLogger.info("[pantry.consume-recipe] recipe consumption completed", {
      metadata: {
        userProfileId: userProfile.id,
        recipeId: parsedBody.data.recipeId ?? null,
        recipeTitle: parsedBody.data.recipeTitle,
        updatedItems: summary.updatedItems,
        deletedItems: summary.deletedItems,
        consumedIngredients: summary.consumedIngredients,
        skippedIngredients: summary.skippedIngredients,
      },
    });

    await trackEvent({
      userId: session.user.id,
      eventName: parsedBody.data.finishedWithMissingIngredients
        ? "kitchen_counter_completed_with_missing_ingredients"
        : "kitchen_counter_completed",
      metadata: {
        recipeId: parsedBody.data.recipeId ?? null,
        recipeTitle: parsedBody.data.recipeTitle,
        ingredientCount: parsedBody.data.ingredientItems.length,
        matchedIngredientCount: parsedBody.data.matchedIngredients.length,
        updatedItems: summary.updatedItems,
        deletedItems: summary.deletedItems,
        consumedIngredients: summary.consumedIngredients,
        skippedIngredients: summary.skippedIngredients,
      },
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    apiLogger.error("POST /api/pantry/consume-recipe error", { error });
    return handleApiError(error, "POST /api/pantry/consume-recipe", {
      status: 500,
      code: "PANTRY_CONSUME_RECIPE_FAILED",
    });
  }
}