import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import {
  pantryItems,
  pantryRestockItems,
  shoppingListItems,
  shoppingLists,
  userInfoTable,
  userProfiles,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { normalizePantryItemsInBackground } from "@/lib/pantry/background-normalization";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  handleApiError,
  safeErrorResponse,
  unauthorizedError,
  validationError,
} from "@/lib/safeError";
import { derivePantryInventoryItem } from "@/lib/pantry/grocery";
import { invalidatePantryCaches } from "@/lib/pantry/restock";
import {
  shouldPreservePantryQuantity,
  supportsPantryQuantityMutations,
} from "@/lib/pantry/tracking";
import { pantryIdSchema, pantryUpdateItemSchema } from "@/lib/schemas/pantry";
import { guessFoodCategory, normalizeUnit } from "@/lib/ingredients/units";

async function getProfileAndItem(userId: string, itemId: string) {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });
  if (!userProfile) {
    return {
      error: "Profile not found",
      status: 404,
      code: "PROFILE_NOT_FOUND",
    } as const;
  }

  const userInfo = await db.query.userInfoTable.findFirst({
    where: eq(userInfoTable.userProfileId, userProfile.id),
  });

  const item = await db.query.pantryItems.findFirst({
    where: and(
      eq(pantryItems.id, itemId),
      eq(pantryItems.userProfileId, userProfile.id),
    ),
  });
  if (!item) {
    return {
      error: "Item not found",
      status: 404,
      code: "PANTRY_ITEM_NOT_FOUND",
    } as const;
  }

  return { userProfile, userInfo, item };
}

// GET /api/pantry/[id] — Get a single pantry item
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedError("Unauthorized");
  }

  const identifier = getRateLimitIdentifier(
    _req as unknown as Request,
    session.user.id,
  );
  const rateLimitResult = await checkRateLimit(identifier, "pantry");
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const idResult = pantryIdSchema.safeParse((await params).id);
  if (!idResult.success) {
    return validationError("Validation failed");
  }

  const id = idResult.data;
  const result = await getProfileAndItem(session.user.id, id);
  if ("error" in result) {
    const errorMessage = result.error ?? "Item not found";
    return safeErrorResponse(errorMessage, {
      status: result.status,
      ...(result.code ? { code: result.code } : {}),
    });
  }

  const [activeShoppingList, restockRows] = await Promise.all([
    db.query.shoppingLists.findFirst({
      where: and(
        eq(shoppingLists.userProfileId, result.userProfile.id),
        eq(shoppingLists.status, "active"),
      ),
    }),
    db
      .select()
      .from(pantryRestockItems)
      .where(
        and(
          eq(pantryRestockItems.userProfileId, result.userProfile.id),
          eq(pantryRestockItems.isActive, true),
        ),
      ),
  ]);
  const activeShoppingListRows = activeShoppingList
    ? await db
        .select()
        .from(shoppingListItems)
        .where(eq(shoppingListItems.shoppingListId, activeShoppingList.id))
    : [];

  return NextResponse.json({
    item: derivePantryInventoryItem(
      result.item,
      restockRows,
      activeShoppingListRows,
      activeShoppingList?.id ?? null,
    ),
  });
}

// PUT /api/pantry/[id] — Update a pantry item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const idResult = pantryIdSchema.safeParse((await params).id);
  if (!idResult.success) {
    return validationError("Validation failed");
  }

  const id = idResult.data;
  const result = await getProfileAndItem(session.user.id, id);
  if ("error" in result) {
    const errorMessage = result.error ?? "Item not found";
    return safeErrorResponse(errorMessage, {
      status: result.status,
      ...(result.code ? { code: result.code } : {}),
    });
  }

  try {
    apiLogger.debug("[pantry.update] request received", {
      metadata: {
        pantryItemId: id,
        userId: session.user.id,
      },
    });

    const parsedBody = pantryUpdateItemSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsedBody.success) {
      return validationError("Validation failed");
    }
    const {
      name,
      trackingMode,
      inStock,
      quantity,
      unit,
      category,
      expiryDate,
      quantityOperation,
      quantityDelta,
    } = parsedBody.data;

    apiLogger.debug("[pantry.update] payload validated", {
      metadata: {
        pantryItemId: id,
        userProfileId: result.userProfile.id,
        hasNameChange: name !== undefined,
        requestedTrackingMode: trackingMode ?? null,
        requestedInStock: inStock ?? null,
        requestedQuantity: quantity ?? null,
        requestedUnit: unit ?? null,
        quantityOperation: quantityOperation ?? null,
        quantityDelta: quantityDelta ?? null,
      },
    });

    const resolvedName =
      name !== undefined ? name.trim() : result.item.name;
    const shouldNormalizeInBackground = name !== undefined;
    const resolvedTrackingMode = trackingMode ?? result.item.trackingMode;
    const resolvedCategory =
      category !== undefined ? category : name !== undefined
        ? guessFoodCategory(resolvedName)
        : undefined;
    const currentQuantity = result.item.quantity
      ? Number.parseFloat(String(result.item.quantity))
      : null;
    const normalizedUnit =
      unit !== undefined
        ? unit !== null
          ? normalizeUnit(String(unit))
          : null
        : undefined;
    const steppedQuantity =
      quantityOperation && quantityDelta !== undefined
        ? Math.max(
            0,
            (Number.isFinite(currentQuantity ?? Number.NaN) ? currentQuantity ?? 0 : 0) +
              (quantityOperation === "increment" ? quantityDelta : -quantityDelta),
          )
        : undefined;
    const nextQuantityValue =
      quantity !== undefined
        ? quantity
        : steppedQuantity !== undefined
          ? steppedQuantity
          : currentQuantity;
    const nextUnitValue = normalizedUnit !== undefined ? normalizedUnit : result.item.unit;
    const preserveQuantity = shouldPreservePantryQuantity({
      name: resolvedName,
      ingredientKey: result.item.ingredientKey,
      ingredientSpecificKey: result.item.ingredientSpecificKey,
      trackingMode: resolvedTrackingMode,
      quantity: nextQuantityValue,
      unit: nextUnitValue,
    });
    const canMutateQuantity = supportsPantryQuantityMutations({
      name: resolvedName,
      ingredientKey: result.item.ingredientKey,
      ingredientSpecificKey: result.item.ingredientSpecificKey,
      trackingMode: resolvedTrackingMode,
      quantity: nextQuantityValue,
      unit: nextUnitValue,
    });
    const hasExplicitQuantityMutation =
      quantityOperation !== undefined ||
      quantityDelta !== undefined ||
      (quantity !== undefined && quantity !== null) ||
      (unit !== undefined && unit !== null);
    const shouldDeleteForZeroQuantity =
      resolvedTrackingMode === "quantity" &&
      nextQuantityValue === 0 &&
      (quantity !== undefined || steppedQuantity !== undefined);

    apiLogger.debug("[pantry.update] resolved mutation", {
      metadata: {
        pantryItemId: id,
        userProfileId: result.userProfile.id,
        previousTrackingMode: result.item.trackingMode,
        resolvedTrackingMode,
        currentQuantity,
        nextQuantityValue,
        nextUnitValue,
        preserveQuantity,
        canMutateQuantity,
        shouldNormalizeInBackground,
      },
    });

    if (
      resolvedTrackingMode === "availability" &&
      hasExplicitQuantityMutation &&
      !canMutateQuantity
    ) {
      apiLogger.warn("[pantry.update] rejected quantity mutation for availability item", {
        metadata: {
          pantryItemId: id,
          userProfileId: result.userProfile.id,
          resolvedTrackingMode,
          requestedUnit: unit ?? null,
          quantityOperation: quantityOperation ?? null,
          quantityDelta: quantityDelta ?? null,
          requestedQuantity: quantity ?? null,
        },
      });
      return validationError("Availability mode does not support quantity mutations");
    }

    if (resolvedTrackingMode === "quantity" && inStock !== undefined) {
      apiLogger.warn("[pantry.update] rejected inStock update for quantity item", {
        metadata: {
          pantryItemId: id,
          userProfileId: result.userProfile.id,
        },
      });
      return validationError("inStock is only valid for availability mode");
    }

    if (shouldDeleteForZeroQuantity) {
      await db.delete(pantryItems).where(eq(pantryItems.id, id));
      await invalidatePantryCaches(result.userProfile.id);

      apiLogger.info("[pantry.update] pantry item deleted because quantity reached zero", {
        metadata: {
          pantryItemId: id,
          userProfileId: result.userProfile.id,
          previousTrackingMode: result.item.trackingMode,
          requestedQuantity: quantity ?? null,
          quantityOperation: quantityOperation ?? null,
          quantityDelta: quantityDelta ?? null,
        },
      });

      return NextResponse.json({
        deleted: true,
        deletedItemId: id,
      });
    }

    const [updatedItem] = await db
      .update(pantryItems)
      .set({
        ...(name !== undefined ? { name: resolvedName } : {}),
        ...(shouldNormalizeInBackground
          ? {
              ingredientName: null,
              ingredientKey: null,
              ingredientSpecificKey: null,
              ingredientId: null,
            }
          : {}),
        ...(trackingMode !== undefined ? { trackingMode: resolvedTrackingMode } : {}),
        ...(resolvedTrackingMode === "availability"
          ? {
              inStock: inStock ?? result.item.inStock,
              quantity: preserveQuantity
                ? nextQuantityValue !== null
                  ? String(nextQuantityValue)
                  : null
                : null,
              unit: preserveQuantity ? nextUnitValue ?? null : null,
            }
          : {
              ...(quantity !== undefined
                ? { quantity: quantity !== null ? String(quantity) : null }
                : steppedQuantity !== undefined
                  ? { quantity: String(steppedQuantity) }
                  : {}),
              ...(unit !== undefined
                ? { unit: normalizedUnit ?? null }
                : {}),
              ...(trackingMode !== undefined ? { inStock: true } : {}),
            }),
        ...(resolvedCategory !== undefined ? { category: resolvedCategory } : {}),
        ...(expiryDate !== undefined
          ? { expiryDate: expiryDate !== null ? new Date(expiryDate) : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(pantryItems.id, id))
      .returning();

    const [activeShoppingList, restockRows] = await Promise.all([
      db.query.shoppingLists.findFirst({
        where: and(
          eq(shoppingLists.userProfileId, result.userProfile.id),
          eq(shoppingLists.status, "active"),
        ),
      }),
      db
        .select()
        .from(pantryRestockItems)
        .where(
          and(
            eq(pantryRestockItems.userProfileId, result.userProfile.id),
            eq(pantryRestockItems.isActive, true),
          ),
        ),
    ]);
    const activeShoppingListRows = activeShoppingList
      ? await db
          .select()
          .from(shoppingListItems)
          .where(eq(shoppingListItems.shoppingListId, activeShoppingList.id))
      : [];

    await invalidatePantryCaches(result.userProfile.id);
    if (shouldNormalizeInBackground) {
      after(async () => {
        await normalizePantryItemsInBackground({
          source: "pantry-manual-update",
          userProfileId: result.userProfile.id,
          locale: result.userInfo?.language ?? "sk",
          pantryItemIds: [updatedItem.id],
        });
      });
    }

    apiLogger.info("[pantry.update] pantry item updated", {
      metadata: {
        pantryItemId: updatedItem.id,
        userProfileId: result.userProfile.id,
        trackingMode: updatedItem.trackingMode,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit,
        inStock: updatedItem.inStock,
        normalizationQueued: shouldNormalizeInBackground,
      },
    });

    return NextResponse.json({
      item: derivePantryInventoryItem(
        updatedItem,
        restockRows,
        activeShoppingListRows,
        activeShoppingList?.id ?? null,
      ),
      normalizationQueued: shouldNormalizeInBackground,
    });
  } catch (error) {
    apiLogger.error("PUT /api/pantry/[id] error", { error });
    return handleApiError(error, "PUT /api/pantry/[id]", {
      status: 500,
      code: "PANTRY_UPDATE_FAILED",
    });
  }
}

// DELETE /api/pantry/[id] — Remove a pantry item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const idResult = pantryIdSchema.safeParse((await params).id);
  if (!idResult.success) {
    return validationError("Validation failed");
  }

  const id = idResult.data;
  const result = await getProfileAndItem(session.user.id, id);
  if ("error" in result) {
    const errorMessage = result.error ?? "Item not found";
    return safeErrorResponse(errorMessage, {
      status: result.status,
      ...(result.code ? { code: result.code } : {}),
    });
  }

  try {
    await db.delete(pantryItems).where(eq(pantryItems.id, id));
    await invalidatePantryCaches(result.userProfile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error("DELETE /api/pantry/[id] error", { error });
    return handleApiError(error, "DELETE /api/pantry/[id]", {
      status: 500,
      code: "PANTRY_DELETE_FAILED",
    });
  }
}
