import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { auth } from "../../../../../../../auth";
import { shoppingListItems, shoppingLists, userProfiles } from "@/db/schema";
import { db } from "@/index";
import { apiLogger } from "@/lib/logger";
import { formatAmountLabel } from "@/lib/pantry/format";
import { checkRateLimit } from "@/lib/rateLimit";
import { CacheService } from "@/lib/redis";
import { pantryAmountLabelSchema } from "@/lib/schemas/pantry";
import { guessFoodCategory } from "@/lib/units";
import { parseQuantity } from "@/lib/units";

type ShoppingListItemResponse = {
  id: string;
  name: string;
  quantity: string | null;
  quantityValue: string | null;
  unit: string | null;
  category: string;
  sortOrder: number;
  isChecked: boolean;
  checkedAt: string | null;
};

function mapShoppingListItems(
  items: Array<typeof shoppingListItems.$inferSelect>,
): ShoppingListItemResponse[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.amountLabel ?? formatAmountLabel(item.quantity, item.unit),
    quantityValue: item.quantity,
    unit: item.unit,
    category: item.category ?? guessFoodCategory(item.name),
    sortOrder: item.sortOrder,
    isChecked: item.isChecked,
    checkedAt: item.checkedAt?.toISOString() ?? null,
  }));
}

/**
 * DELETE /api/shopping-lists/current/items/[itemId]
 * Removes a single item from the current active shopping list.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) {
      return rl.response!;
    }

    const { itemId } = await params;
    if (!itemId) return NextResponse.json({ error: "Item ID is required" }, { status: 400 });

    apiLogger.debug("[shopping-list.current-item.update] request received", {
      metadata: {
        shoppingListItemId: itemId,
        userId: session.user.id,
      },
    });

    const parsedBody = pantryAmountLabelSchema.safeParse(
      (await request.json().catch(() => null))?.amountLabel,
    );
    if (!parsedBody.success) {
      return NextResponse.json({ error: "amountLabel is required" }, { status: 400 });
    }
    const amountLabel = parsedBody.data;
    const parsedAmount = amountLabel ? parseQuantity(amountLabel) : null;

    apiLogger.debug("[shopping-list.current-item.update] amount parsed", {
      metadata: {
        shoppingListItemId: itemId,
        amountLabel,
        parsedQuantity: parsedAmount?.value ?? null,
        parsedUnit: parsedAmount?.unit ?? null,
      },
    });

    const [userProfile] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (!userProfile) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

    const [shoppingList] = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(and(eq(shoppingLists.userProfileId, userProfile.id), eq(shoppingLists.status, "active")))
      .limit(1);

    if (!shoppingList) {
      return NextResponse.json({ error: "No active shopping list found" }, { status: 404 });
    }

    apiLogger.debug("[shopping-list.current-item.update] active list resolved", {
      metadata: {
        shoppingListId: shoppingList.id,
        shoppingListItemId: itemId,
        userProfileId: userProfile.id,
      },
    });

    const [item] = await db
      .update(shoppingListItems)
      .set({
        amountLabel,
        quantity: parsedAmount ? String(parsedAmount.value) : null,
        unit: parsedAmount?.unit ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shoppingListItems.id, itemId),
          eq(shoppingListItems.shoppingListId, shoppingList.id),
        ),
      )
      .returning();

    if (!item) {
      return NextResponse.json({ error: "Item not found in current shopping list" }, { status: 404 });
    }

    await CacheService.del(`shopping-lists:${session.user.id}`);

    const updatedItems = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingList.id))
      .orderBy(asc(shoppingListItems.sortOrder));

    apiLogger.info("[shopping-list.current-item.update] current shopping list item updated", {
      metadata: {
        shoppingListId: shoppingList.id,
        shoppingListItemId: item.id,
        userProfileId: userProfile.id,
        amountLabel: item.amountLabel,
        quantity: item.quantity,
        unit: item.unit,
      },
    });

    return NextResponse.json({ success: true, item, items: mapShoppingListItems(updatedItems) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update item";
    apiLogger.error("Failed to update shopping list item quantity", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) {
      return rl.response!;
    }

    const { itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    apiLogger.debug("[shopping-list.current-item.delete] request received", {
      metadata: {
        shoppingListItemId: itemId,
        userId: session.user.id,
      },
    });

    // Find user profile
    const [userProfile] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Find the active shopping list
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
      return NextResponse.json(
        { error: "No active shopping list found" },
        { status: 404 },
      );
    }

    // Verify the item belongs to this shopping list
    const [item] = await db
      .select({ id: shoppingListItems.id })
      .from(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.id, itemId),
          eq(shoppingListItems.shoppingListId, shoppingList.id),
        ),
      )
      .limit(1);

    if (!item) {
      return NextResponse.json(
        { error: "Item not found in current shopping list" },
        { status: 404 },
      );
    }

    // Delete the item
    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId));

    // Return updated items list
    const updatedItems = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingList.id))
      .orderBy(asc(shoppingListItems.sortOrder));

    await CacheService.del(`shopping-lists:${session.user.id}`);

    apiLogger.info("[shopping-list.current-item.delete] current shopping list item deleted", {
      metadata: {
        shoppingListId: shoppingList.id,
        shoppingListItemId: itemId,
        userProfileId: userProfile.id,
        remainingItems: updatedItems.length,
      },
    });

    return NextResponse.json({
      success: true,
      items: mapShoppingListItems(updatedItems),
    });
  } catch (error) {
    apiLogger.error("Failed to delete shopping list item", error);
    return NextResponse.json(
      { error: "Failed to delete shopping list item" },
      { status: 500 },
    );
  }
}
