import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "../../../../../../auth";
import {
  pantryItems,
  shoppingListItems,
  shoppingLists,
  userInfoTable,
  userProfiles,
} from "@/db/schema";
import { db } from "@/index";
import { apiLogger } from "@/lib/logger";
import { normalizePantryItemsInBackground } from "@/lib/pantry/background-normalization";
import { getRateLimitIdentifier, checkRateLimit } from "@/lib/rateLimit";
import {
  shoppingListCheckoutSchema,
  shoppingListIdSchema,
} from "@/lib/schemas/shopping-list";
import { CacheService, RequestLock } from "@/lib/cache/redis";
import {
  resolvePantryTrackingMode,
  shouldPreservePantryQuantity,
} from "@/lib/pantry/tracking";
import { guessFoodCategory, normalizeUnit } from "@/lib/ingredients/units";

function errorResponse(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function buildPantryImportKey(item: {
  name: string;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
}) {
  if (item.ingredientSpecificKey) {
    return `specific:${item.ingredientSpecificKey}`;
  }

  if (item.ingredientKey) {
    return `ingredient:${item.ingredientKey}`;
  }

  return `name:${item.name.trim().toLowerCase()}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const idResult = shoppingListIdSchema.safeParse((await params).id);
  if (!idResult.success) {
    return errorResponse("Validation failed", "INVALID_INPUT", 400);
  }

  const bodyResult = shoppingListCheckoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!bodyResult.success) {
    return errorResponse("Validation failed", "INVALID_INPUT", 400);
  }

  apiLogger.debug("[shopping-list.checkout] request validated", {
    metadata: {
      shoppingListId: idResult.data,
      userId: session.user.id,
      mode: bodyResult.data.mode,
      completeList: bodyResult.data.completeList,
    },
  });

  const lockKey = `shopping-list-checkout:${session.user.id}:${idResult.data}`;
  const lockAcquired = await RequestLock.acquire(lockKey, 120);
  if (!lockAcquired) {
    return errorResponse("Too many requests", "CHECKOUT_IN_PROGRESS", 429);
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

    const [userInfo] = await db
      .select({ language: userInfoTable.language })
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfile.id))
      .limit(1);

    const [shoppingList] = await db
      .select({
        id: shoppingLists.id,
        status: shoppingLists.status,
      })
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.id, idResult.data),
          eq(shoppingLists.userProfileId, userProfile.id),
        ),
      )
      .limit(1);

    if (!shoppingList) {
      return errorResponse("Not found", "SHOPPING_LIST_NOT_FOUND", 404);
    }

    if (shoppingList.status === "cancelled") {
      return errorResponse("Validation failed", "INVALID_SHOPPING_LIST_STATE", 400);
    }

    const allItems = await db
      .select({
        id: shoppingListItems.id,
        name: shoppingListItems.name,
        ingredientName: shoppingListItems.ingredientName,
        ingredientKey: shoppingListItems.ingredientKey,
        ingredientSpecificKey: shoppingListItems.ingredientSpecificKey,
        ingredientId: shoppingListItems.ingredientId,
        quantity: shoppingListItems.quantity,
        unit: shoppingListItems.unit,
        category: shoppingListItems.category,
        isChecked: shoppingListItems.isChecked,
      })
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingList.id));

    apiLogger.debug("[shopping-list.checkout] shopping list items loaded", {
      metadata: {
        shoppingListId: shoppingList.id,
        userProfileId: userProfile.id,
        totalItems: allItems.length,
      },
    });

    if (allItems.length === 0) {
      return errorResponse("Not found", "SHOPPING_LIST_EMPTY", 404);
    }

    const selectedItems =
      bodyResult.data.mode === "checked_only"
        ? allItems.filter((item) => item.isChecked)
        : allItems;

    if (selectedItems.length === 0) {
      return errorResponse("Validation failed", "NO_CHECKED_ITEMS", 400);
    }

    if (
      bodyResult.data.completeList &&
      selectedItems.length !== allItems.length
    ) {
      return errorResponse(
        "Validation failed",
        "SHOPPING_LIST_NOT_FULLY_CHECKED",
        400,
      );
    }

    const existingPantryItems = await db
      .select({
        id: pantryItems.id,
        name: pantryItems.name,
        ingredientKey: pantryItems.ingredientKey,
        ingredientSpecificKey: pantryItems.ingredientSpecificKey,
      })
      .from(pantryItems)
      .where(
        and(
          eq(pantryItems.userProfileId, userProfile.id),
          eq(pantryItems.shoppingListId, shoppingList.id),
        ),
      );

    const existingImportKeys = new Set(
      existingPantryItems.map((item) => buildPantryImportKey(item)),
    );

    const pantryValues = selectedItems
      .filter((item) => !existingImportKeys.has(buildPantryImportKey(item)))
      .map((item) => {
        const normalizedUnit = item.unit ? normalizeUnit(item.unit) : null;
        const trackingMode = resolvePantryTrackingMode({
          name: item.name,
          ingredientKey: item.ingredientKey,
          ingredientSpecificKey: item.ingredientSpecificKey,
          quantity: item.quantity != null ? Number(item.quantity) : null,
          unit: normalizedUnit,
        });
        const preserveQuantity = shouldPreservePantryQuantity({
          name: item.name,
          ingredientKey: item.ingredientKey,
          ingredientSpecificKey: item.ingredientSpecificKey,
          trackingMode,
          quantity: item.quantity != null ? Number(item.quantity) : null,
          unit: normalizedUnit,
        });

        const payload = {
          userProfileId: userProfile.id,
          name: item.name.trim(),
          ingredientName: item.ingredientName,
          ingredientKey: item.ingredientKey,
          ingredientSpecificKey: item.ingredientSpecificKey,
          ingredientId: item.ingredientId ?? null,
          trackingMode,
          inStock: true,
          quantity:
            (trackingMode === "quantity" || preserveQuantity) && item.quantity != null
              ? String(item.quantity)
              : null,
          unit:
            (trackingMode === "quantity" || preserveQuantity) && normalizedUnit
              ? normalizedUnit
              : null,
          category: item.category || guessFoodCategory(item.name),
          source: "shopping_list" as const,
          shoppingListId: shoppingList.id,
        };

        apiLogger.debug("[shopping-list.checkout] prepared pantry item", {
          metadata: {
            shoppingListId: shoppingList.id,
            userProfileId: userProfile.id,
            shoppingListItemId: item.id,
            itemName: payload.name,
            ingredientKey: payload.ingredientKey,
            ingredientSpecificKey: payload.ingredientSpecificKey,
            trackingMode: payload.trackingMode,
            quantity: payload.quantity,
            unit: payload.unit,
            category: payload.category,
          },
        });

        return payload;
      });

    apiLogger.debug("[shopping-list.checkout] import payload prepared", {
      metadata: {
        shoppingListId: shoppingList.id,
        userProfileId: userProfile.id,
        selectedItems: selectedItems.length,
        existingImportedItems: existingPantryItems.length,
        preparedPantryRows: pantryValues.length,
        skippedAsDuplicates: selectedItems.length - pantryValues.length,
      },
    });

    const insertedItems = pantryValues.length
      ? await db
          .insert(pantryItems)
          .values(pantryValues)
          .returning({
            id: pantryItems.id,
            name: pantryItems.name,
            trackingMode: pantryItems.trackingMode,
            inStock: pantryItems.inStock,
            quantity: pantryItems.quantity,
            unit: pantryItems.unit,
            category: pantryItems.category,
          })
      : [];

    for (const insertedItem of insertedItems) {
      apiLogger.info("[shopping-list.checkout] inserted pantry item", {
        metadata: {
          shoppingListId: shoppingList.id,
          userProfileId: userProfile.id,
          pantryItemId: insertedItem.id,
          itemName: insertedItem.name,
          trackingMode: insertedItem.trackingMode,
          inStock: insertedItem.inStock,
          quantity: insertedItem.quantity,
          unit: insertedItem.unit,
          category: insertedItem.category,
        },
      });
    }

    const [updatedShoppingList] =
      shoppingList.status === "completed"
        ? [shoppingList]
        : await db
            .update(shoppingLists)
            .set({
              status: "completed",
              updated_at: new Date(),
            })
            .where(
              and(
                eq(shoppingLists.id, shoppingList.id),
                eq(shoppingLists.userProfileId, userProfile.id),
              ),
            )
            .returning({
              id: shoppingLists.id,
              status: shoppingLists.status,
            });

    if (!updatedShoppingList) {
      apiLogger.error("Shopping list checkout status update failed after pantry insert", {
        shoppingListId: shoppingList.id,
        userProfileId: userProfile.id,
        insertedCount: insertedItems.length,
      });
      return errorResponse("Internal server error", "SHOPPING_LIST_STATUS_UPDATE_FAILED", 500);
    }

    await CacheService.del(`shopping-lists:${session.user.id}`);
    await CacheService.del(`pantry:${userProfile.id}`);

    if (insertedItems.length > 0) {
      after(async () => {
        try {
          await normalizePantryItemsInBackground({
            source: "shopping-list-checkout",
            userProfileId: userProfile.id,
            locale: userInfo?.language ?? "sk",
            pantryItemIds: insertedItems.map((item) => item.id),
          });
        } catch (error) {
          apiLogger.error("Shopping list checkout normalization failed", {
            error,
            shoppingListId: shoppingList.id,
            userProfileId: userProfile.id,
          });
        }
      });
    }

    apiLogger.info("[shopping-list.checkout] pantry import completed", {
      metadata: {
        shoppingListId: shoppingList.id,
        userProfileId: userProfile.id,
        importedCount: insertedItems.length,
        shoppingListStatus: updatedShoppingList.status,
      },
    });

    return NextResponse.json({
      shoppingList: updatedShoppingList,
      importedCount: insertedItems.length,
    });
  } catch (error) {
    apiLogger.error("POST /api/shopping-lists/[id]/checkout-to-pantry error", {
      error,
      shoppingListId: idResult.data,
      userId: session.user.id,
    });
    return errorResponse("Internal server error", "SHOPPING_LIST_CHECKOUT_FAILED", 500);
  } finally {
    await RequestLock.release(lockKey).catch((error) => {
      apiLogger.error("Failed to release shopping list checkout lock", {
        error,
        shoppingListId: idResult.data,
        userId: session.user.id,
      });
    });
  }
}
