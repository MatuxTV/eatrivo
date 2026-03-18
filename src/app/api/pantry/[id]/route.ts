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
import { pantryIdSchema, pantryUpdateItemSchema } from "@/lib/schemas/pantry";
import { guessFoodCategory, normalizeUnit } from "@/lib/units";

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
    const parsedBody = pantryUpdateItemSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsedBody.success) {
      return validationError("Validation failed");
    }
    const {
      name,
      quantity,
      unit,
      category,
      expiryDate,
      quantityOperation,
      quantityDelta,
    } = parsedBody.data;

    const resolvedName =
      name !== undefined ? name.trim() : result.item.name;
    const shouldNormalizeInBackground = name !== undefined;
    const resolvedCategory =
      category !== undefined ? category : name !== undefined
        ? guessFoodCategory(resolvedName)
        : undefined;
    const currentQuantity = result.item.quantity
      ? Number.parseFloat(String(result.item.quantity))
      : null;
    const steppedQuantity =
      quantityOperation && quantityDelta !== undefined
        ? Math.max(
            0,
            (Number.isFinite(currentQuantity ?? Number.NaN) ? currentQuantity ?? 0 : 0) +
              (quantityOperation === "increment" ? quantityDelta : -quantityDelta),
          )
        : undefined;

    const [updatedItem] = await db
      .update(pantryItems)
      .set({
        ...(name !== undefined ? { name: resolvedName } : {}),
        ...(shouldNormalizeInBackground
          ? {
              ingredientName: null,
              ingredientKey: null,
              ingredientSpecificKey: null,
            }
          : {}),
        ...(quantity !== undefined
          ? { quantity: quantity !== null ? String(quantity) : null }
          : steppedQuantity !== undefined
            ? { quantity: String(steppedQuantity) }
          : {}),
        ...(unit !== undefined
          ? { unit: unit !== null ? normalizeUnit(String(unit)) : null }
          : {}),
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
