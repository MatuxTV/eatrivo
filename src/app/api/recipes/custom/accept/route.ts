import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";

import { auth } from "../../../../../../auth";
import { customRecipeAcceptRequestSchema } from "@/lib/custom-recipes/contracts";
import { persistAcceptedCustomRecipe } from "@/lib/custom-recipes/persistence";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { handleApiError, unauthorizedError, validationError } from "@/lib/safeError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedError("Unauthorized");
  }

  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(request as unknown as Request, session.user.id),
    "standard",
  );
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const parsedBody = customRecipeAcceptRequestSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsedBody.success) {
      apiLogger.warn("[customRecipe.accept] invalid payload", {
        metadata: {
          userId: session.user.id,
          issues: parsedBody.error.issues.length,
        },
      });
      return validationError("Validation failed");
    }

    apiLogger.info("[customRecipe.accept] acceptance received", {
      metadata: {
        userId: session.user.id,
        locale: parsedBody.data.locale,
        recipeName: parsedBody.data.recipe.name,
        recipeKind: parsedBody.data.recipe.kind,
      },
    });

    after(async () => {
      try {
        await persistAcceptedCustomRecipe({
          userId: session.user.id,
          locale: parsedBody.data.locale,
          recipe: parsedBody.data.recipe,
        });
      } catch (error) {
        apiLogger.error("[customRecipe.accept] background persist failed", error, {
          metadata: {
            userId: session.user.id,
            recipeName: parsedBody.data.recipe.name,
            recipeKind: parsedBody.data.recipe.kind,
          },
        });
      }
    });

    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return handleApiError(error, "POST /api/recipes/custom/accept", {
      status: 500,
      code: "CUSTOM_RECIPE_ACCEPT_FAILED",
    });
  }
}