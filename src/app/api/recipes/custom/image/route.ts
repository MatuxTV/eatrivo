import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "../../../../../../auth";
import { customRecipeGeneratedRecipeSchema } from "@/lib/custom-recipes/contracts";
import { findPersistedCustomRecipe } from "@/lib/custom-recipes/persistence";
import {
  canUserGetCustomRecipeImages,
  getRecipeCoverImageStatus,
} from "@/lib/recipe-images/service";
import { resolveRecipeImageUrls } from "@/lib/recipe-images/urls";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { handleApiError, unauthorizedError, validationError } from "@/lib/safeError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Rivo sheet polls every few seconds while a photo is generating, so this
// uses the higher-volume "pantry" tier instead of "standard".
const RATE_LIMIT_TIER = "pantry";

const imageStatusRequestSchema = z.object({
  locale: z.enum(["en", "sk"]),
  // A generation yields at most a pantry and an almost-cookable recipe.
  recipes: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(64),
        recipe: customRecipeGeneratedRecipeSchema,
      }),
    )
    .min(1)
    .max(2),
});

type RecipeImageStatusEntry =
  | { key: string; status: "ready"; recipeId: string; imageUrl: string | null; imageThumbUrl: string | null }
  | { key: string; status: "pending"; recipeId: string | null }
  | { key: string; status: "none" };

// GET → whether the signed-in user gets AI photos for custom recipes at all,
// so the client knows up front if a loading skeleton makes sense.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedError("Unauthorized");
  }

  try {
    return NextResponse.json({ enabled: await canUserGetCustomRecipeImages(session.user.id) });
  } catch (error) {
    return handleApiError(error, "GET /api/recipes/custom/image", {
      status: 500,
      code: "CUSTOM_RECIPE_IMAGE_ACCESS_FAILED",
    });
  }
}

// POST → photo state for freshly generated recipes, which the server saves in
// the background, so the client only knows their content, not their id.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedError("Unauthorized");
  }
  const userId = session.user.id;

  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(request as unknown as Request, userId),
    RATE_LIMIT_TIER,
  );
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsedBody = imageStatusRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return validationError("Validation failed");
  }

  try {
    if (!(await canUserGetCustomRecipeImages(userId))) {
      return NextResponse.json({
        recipes: parsedBody.data.recipes.map(({ key }) => ({ key, status: "none" })),
      });
    }

    const entries = await Promise.all(
      parsedBody.data.recipes.map(async ({ key, recipe }): Promise<RecipeImageStatusEntry> => {
        const persisted = await findPersistedCustomRecipe({
          userId,
          locale: parsedBody.data.locale,
          recipe,
        });

        // Not saved yet: the background save and photo are still on their way.
        if (!persisted) {
          return { key, status: "pending", recipeId: null };
        }

        const image = await getRecipeCoverImageStatus(persisted.id);
        if (image.status === "ready") {
          return {
            key,
            status: "ready",
            recipeId: persisted.id,
            ...resolveRecipeImageUrls(image.storageKey),
          };
        }

        return image.status === "pending"
          ? { key, status: "pending", recipeId: persisted.id }
          : { key, status: "none" };
      }),
    );

    return NextResponse.json({ recipes: entries });
  } catch (error) {
    return handleApiError(error, "POST /api/recipes/custom/image", {
      status: 500,
      code: "CUSTOM_RECIPE_IMAGE_STATUS_FAILED",
    });
  }
}
