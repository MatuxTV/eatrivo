import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "../../../../../../auth";
import { eq } from "drizzle-orm";

import { db } from "@/index";
import { pantryItems, userProfiles } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import {
  acquirePantryDraftLock,
  discardPantryDrafts,
  getPantryDraftTtlSeconds,
  getPantryDrafts,
  releasePantryDraftLock,
} from "@/lib/pantry/draft-cache";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { CacheService } from "@/lib/cache/redis";

function parseTokens(body: unknown): string[] | undefined {
  const tokens = (body as { tokens?: unknown[] } | null)?.tokens;
  if (!Array.isArray(tokens)) {
    return undefined;
  }

  return tokens.filter((value): value is string => typeof value === "string");
}

export async function POST(req: NextRequest) {
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

  let userProfileId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const tokens = parseTokens(body);

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    userProfileId = userProfile.id;
    const lockAcquired = await acquirePantryDraftLock(userProfileId);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Another pantry draft action is already in progress." },
        { status: 409 },
      );
    }

    try {
      const drafts = await getPantryDrafts(userProfileId);
      const selectedDrafts =
        !tokens || tokens.length === 0
          ? drafts
          : drafts.filter((draft) => tokens.includes(draft.token));

      if (selectedDrafts.length === 0) {
        return NextResponse.json(
          { error: "No pending pantry drafts found." },
          { status: 404 },
        );
      }

      const insertedItems = await db
        .insert(pantryItems)
        .values(
          selectedDrafts.map((draft) => ({
            userProfileId: userProfileId as string,
            name: draft.name,
            ingredientName: draft.ingredientName,
            ingredientKey: draft.ingredientKey,
            ingredientSpecificKey: draft.ingredientSpecificKey,
            trackingMode: draft.trackingMode,
            inStock: draft.inStock,
            quantity: draft.quantity,
            unit: draft.unit,
            category: draft.category,
            expiryDate: draft.expiryDate ? new Date(draft.expiryDate) : null,
            source: "manual" as const,
            shoppingListId: null,
          })),
        )
        .returning();

      const remainingDrafts = await discardPantryDrafts(
        userProfileId,
        selectedDrafts.map((draft) => draft.token),
      );
      await CacheService.del(`pantry:${userProfileId}`);

      return NextResponse.json({
        items: insertedItems,
        drafts: remainingDrafts,
        confirmedCount: insertedItems.length,
        ttlSeconds: getPantryDraftTtlSeconds(),
      });
    } finally {
      await releasePantryDraftLock(userProfileId);
    }
  } catch (error) {
    apiLogger.error("POST /api/pantry/drafts/confirm error", error, {
      metadata: { userId: session.user.id, userProfileId },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}