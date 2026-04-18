import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "../../../../../auth";
import { eq } from "drizzle-orm";

import { db } from "@/index";
import { userInfoTable, userProfiles } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import { normalizeRecipeLocale } from "@/lib/recipe-localization";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { getRecipeMatchesForUserProfile } from "@/lib/recipe-matches";

function parsePositiveInteger(
  rawValue: string | null,
  fallback: number,
  maxValue: number,
): number {
  const parsed = Number.parseInt(rawValue ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maxValue);
}

// GET /api/recipes/matches — Return recipes that are cookable or almost cookable from pantry
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userInfo = await db.query.userInfoTable.findFirst({
      where: eq(userInfoTable.userProfileId, userProfile.id),
    });

    const searchParams = req.nextUrl.searchParams;
    const locale = normalizeRecipeLocale(
      searchParams.get("locale") ?? userInfo?.language ?? "en",
    );
    const maxMissingIngredients = parsePositiveInteger(
      searchParams.get("maxMissingIngredients"),
      3,
      10,
    );
    const cookableLimit = parsePositiveInteger(
      searchParams.get("cookableLimit"),
      12,
      50,
    );
    const almostCookableLimit = parsePositiveInteger(
      searchParams.get("almostCookableLimit"),
      12,
      50,
    );

    const matches = await getRecipeMatchesForUserProfile(userProfile.id, {
      locale,
      maxMissingIngredients,
      cookableLimit,
      almostCookableLimit,
    });

    apiLogger.info("Recipe pantry matches computed", {
      metadata: {
        userId: session.user.id,
        userProfileId: userProfile.id,
        locale,
        pantryIngredientKeyCount: matches.pantryIngredientKeyCount,
        recipeCountAnalyzed: matches.recipeCountAnalyzed,
        cookableCount: matches.cookable.length,
        almostCookableCount: matches.almostCookable.length,
      },
    });

    return NextResponse.json({
      success: true,
      ...matches,
      filters: {
        locale,
        maxMissingIngredients,
        cookableLimit,
        almostCookableLimit,
      },
    });
  } catch (error) {
    apiLogger.error("GET /api/recipes/matches error", error, {
      metadata: { userId: session.user.id },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}