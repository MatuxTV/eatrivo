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
import { guessFoodCategory, parseQuantity } from "@/lib/units";

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

const EDITABLE_STATUSES = new Set(["draft", "active", "approved"]);

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
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

    const { id, itemId } = await params;
    if (!id || !itemId) {
      return NextResponse.json(
        { error: "Shopping list ID and item ID are required" },
        { status: 400 },
      );
    }

    apiLogger.debug("[shopping-list.item.update] request received", {
      metadata: {
        shoppingListId: id,
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

    apiLogger.debug("[shopping-list.item.update] amount parsed", {
      metadata: {
        shoppingListId: id,
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

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const [shoppingList] = await db
      .select({ id: shoppingLists.id, status: shoppingLists.status })
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.id, id),
          eq(shoppingLists.userProfileId, userProfile.id),
        ),
      )
      .limit(1);

    if (!shoppingList) {
      return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });
    }

    apiLogger.debug("[shopping-list.item.update] ownership resolved", {
      metadata: {
        shoppingListId: shoppingList.id,
        shoppingListItemId: itemId,
        userProfileId: userProfile.id,
        shoppingListStatus: shoppingList.status,
      },
    });

    if (!EDITABLE_STATUSES.has(shoppingList.status)) {
      return NextResponse.json(
        { error: "This shopping list can no longer be edited" },
        { status: 409 },
      );
    }

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
      return NextResponse.json({ error: "Item not found in shopping list" }, { status: 404 });
    }

    await CacheService.del(`shopping-lists:${session.user.id}`);

    const updatedItems = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingList.id))
      .orderBy(asc(shoppingListItems.sortOrder));

    apiLogger.info("[shopping-list.item.update] shopping list item updated", {
      metadata: {
        shoppingListId: shoppingList.id,
        shoppingListItemId: item.id,
        userProfileId: userProfile.id,
        amountLabel: item.amountLabel,
        quantity: item.quantity,
        unit: item.unit,
      },
    });

    return NextResponse.json({
      success: true,
      item,
      items: mapShoppingListItems(updatedItems),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update item";
    apiLogger.error("Failed to update shopping list item quantity", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
