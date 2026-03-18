import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "../../../../../../../../auth";
import { shoppingListItems, shoppingLists, userProfiles } from "@/db/schema";
import { db } from "@/index";
import { apiLogger } from "@/lib/logger";
import { getRateLimitIdentifier, checkRateLimit } from "@/lib/rateLimit";
import {
  shoppingListIdSchema,
  shoppingListItemCheckSchema,
} from "@/lib/schemas/shopping-list";
import { CacheService } from "@/lib/redis";

function errorResponse(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("Unauthorized", "AUTH_REQUIRED", 401);
  }

  const identifier = getRateLimitIdentifier(
    request as unknown as Request,
    session.user.id,
  );
  const rateLimitResult = await checkRateLimit(identifier, "standard");
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? errorResponse("Too many requests", "RATE_LIMITED", 429);
  }

  const idResult = shoppingListIdSchema.safeParse((await params).itemId);
  if (!idResult.success) {
    return errorResponse("Validation failed", "INVALID_INPUT", 400);
  }

  const bodyResult = shoppingListItemCheckSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!bodyResult.success) {
    return errorResponse("Validation failed", "INVALID_INPUT", 400);
  }

  try {
    const [userProfile] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (!userProfile) {
      return errorResponse("Not found", "PROFILE_NOT_FOUND", 404);
    }

    const [shoppingList] = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfile.id),
          eq(shoppingLists.status, "active"),
        ),
      )
      .limit(1);

    if (!shoppingList) {
      return errorResponse("Not found", "SHOPPING_LIST_NOT_FOUND", 404);
    }

    const [updatedItem] = await db
      .update(shoppingListItems)
      .set({
        isChecked: bodyResult.data.isChecked,
        checkedAt: bodyResult.data.isChecked ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shoppingListItems.id, idResult.data),
          eq(shoppingListItems.shoppingListId, shoppingList.id),
        ),
      )
      .returning({
        id: shoppingListItems.id,
        isChecked: shoppingListItems.isChecked,
        checkedAt: shoppingListItems.checkedAt,
      });

    if (!updatedItem) {
      return errorResponse("Not found", "SHOPPING_LIST_ITEM_NOT_FOUND", 404);
    }

    await CacheService.del(`shopping-lists:${session.user.id}`);

    return NextResponse.json({
      item: {
        id: updatedItem.id,
        isChecked: updatedItem.isChecked,
        checkedAt: updatedItem.checkedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    apiLogger.error("PATCH /api/shopping-lists/current/items/[itemId]/check error", {
      error,
      itemId: idResult.data,
      userId: session.user.id,
    });
    return errorResponse("Internal server error", "SHOPPING_LIST_ITEM_CHECK_FAILED", 500);
  }
}
