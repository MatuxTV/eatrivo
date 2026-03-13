import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { auth } from "../../../../../auth";
import { shoppingListItems, shoppingLists, userProfiles } from "@/db/schema";
import { db } from "@/index";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";
import { CacheService } from "@/lib/redis";
import { guessFoodCategory } from "@/lib/units";

type ShoppingListItemResponse = {
  id: string;
  name: string;
  quantity: string | null;
  category: string;
  sortOrder: number;
};

function getShoppingListPlaceholderTimestamp() {
  return new Date();
}

function mapShoppingListItems(
  items: Array<typeof shoppingListItems.$inferSelect>,
): ShoppingListItemResponse[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.amountLabel,
    category: item.category ?? guessFoodCategory(item.name),
    sortOrder: item.sortOrder,
  }));
}

async function getUserProfileId(userId: string) {
  const [userProfile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return userProfile?.id ?? null;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) {
      return rl.response!;
    }

    const userProfileId = await getUserProfileId(session.user.id);
    if (!userProfileId) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const [shoppingList] = await db
      .select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfileId),
          eq(shoppingLists.status, "active"),
        ),
      )
      .limit(1);

    if (!shoppingList) {
      return NextResponse.json({
        success: true,
        shoppingList: null,
        items: [],
      });
    }

    const items = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingList.id))
      .orderBy(asc(shoppingListItems.sortOrder));

    return NextResponse.json({
      success: true,
      shoppingList: {
        id: shoppingList.id,
        title: shoppingList.title,
        description: shoppingList.description,
        status: shoppingList.status,
      },
      items: mapShoppingListItems(items),
    });
  } catch (error) {
    apiLogger.error("Failed to fetch current shopping list", error);
    return NextResponse.json(
      { error: "Failed to fetch current shopping list" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) {
      return rl.response!;
    }

    const userProfileId = await getUserProfileId(session.user.id);
    if (!userProfileId) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: string;
      amountLabel?: string | null;
      category?: string | null;
    };

    const normalizedName = body.name?.trim() ?? "";
    const normalizedAmountLabel = body.amountLabel?.trim() || null;
    const normalizedCategory = body.category?.trim() || guessFoodCategory(normalizedName);

    if (!normalizedName) {
      return NextResponse.json(
        { error: "Item name is required" },
        { status: 400 },
      );
    }

    let [shoppingList] = await db
      .select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfileId),
          eq(shoppingLists.status, "active"),
        ),
      )
      .limit(1);

    if (!shoppingList) {
      const placeholderTimestamp = getShoppingListPlaceholderTimestamp();

      [shoppingList] = await db
        .insert(shoppingLists)
        .values({
          userProfileId,
          title: "Shopping List",
          description: null,
          weekStartDate: placeholderTimestamp,
          weekEndDate: placeholderTimestamp,
          status: "active",
        })
        .returning();
    }

    const existingItems = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingList.id))
      .orderBy(asc(shoppingListItems.sortOrder));

    const existingItem = existingItems.find(
      (item) => item.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    );

    if (existingItem) {
      if (!existingItem.amountLabel && normalizedAmountLabel) {
        await db
          .update(shoppingListItems)
          .set({
            amountLabel: normalizedAmountLabel,
            category: existingItem.category ?? normalizedCategory,
            updatedAt: new Date(),
          })
          .where(eq(shoppingListItems.id, existingItem.id));
      } else if (!existingItem.category) {
        await db
          .update(shoppingListItems)
          .set({
            category: normalizedCategory,
            updatedAt: new Date(),
          })
          .where(eq(shoppingListItems.id, existingItem.id));
      }
    } else {
      await db.insert(shoppingListItems).values({
        shoppingListId: shoppingList.id,
        sortOrder: existingItems.length + 1,
        name: normalizedName,
        ingredientName: normalizedName,
        amountLabel: normalizedAmountLabel,
        category: normalizedCategory,
      });
    }

    const updatedItems = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, shoppingList.id))
      .orderBy(asc(shoppingListItems.sortOrder));

    const result = {
      shoppingList,
      items: updatedItems,
    };

    await CacheService.del(`shopping-lists:${session.user.id}`);

    return NextResponse.json({
      success: true,
      shoppingList: {
        id: result.shoppingList.id,
        title: result.shoppingList.title,
        description: result.shoppingList.description,
        status: result.shoppingList.status,
      },
      items: mapShoppingListItems(result.items),
    });
  } catch (error) {
    apiLogger.error("Failed to upsert current shopping list item", error);
    return NextResponse.json(
      { error: "Failed to update shopping list" },
      { status: 500 },
    );
  }
}