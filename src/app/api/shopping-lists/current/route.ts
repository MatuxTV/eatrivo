import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { auth } from "../../../../../auth";
import {
  pantryItems,
  pantryRestockItems,
  shoppingListItems,
  shoppingLists,
  userProfiles,
} from "@/db/schema";
import { db } from "@/index";
import { apiLogger } from "@/lib/logger";
import {
  formatAmountLabel,
  resolveShoppingListSeedFromPantryItem,
} from "@/lib/pantry/grocery";
import { buildPantryInventoryItems } from "@/lib/pantry/grocery";
import { checkRateLimit } from "@/lib/rateLimit";
import { CacheService } from "@/lib/redis";
import { handleApiError, safeErrorResponse, unauthorizedError, validationError } from "@/lib/safeError";
import { shoppingListCurrentMutationSchema } from "@/lib/schemas/pantry";
import { guessFoodCategory } from "@/lib/units";

type ShoppingListItemResponse = {
  id: string;
  name: string;
  quantity: string | null;
  category: string;
  sortOrder: number;
  isChecked: boolean;
  checkedAt: string | null;
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
    isChecked: item.isChecked,
    checkedAt: item.checkedAt?.toISOString() ?? null,
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

function namesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function findExistingShoppingListItem(
  existingItems: Array<typeof shoppingListItems.$inferSelect>,
  candidate: {
    name: string;
    ingredientKey: string | null;
    ingredientSpecificKey: string | null;
  },
) {
  return existingItems.find((item) => {
    if (
      candidate.ingredientSpecificKey &&
      item.ingredientSpecificKey === candidate.ingredientSpecificKey
    ) {
      return true;
    }

    if (candidate.ingredientKey && item.ingredientKey === candidate.ingredientKey) {
      return true;
    }

    return namesMatch(item.name, candidate.name);
  });
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedError("Unauthorized");
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) {
      return rl.response!;
    }

    const userProfileId = await getUserProfileId(session.user.id);
    if (!userProfileId) {
      return safeErrorResponse("User profile not found", {
        status: 404,
        code: "PROFILE_NOT_FOUND",
      });
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
    return handleApiError(error, "GET /api/shopping-lists/current", {
      status: 500,
      code: "SHOPPING_LIST_FETCH_FAILED",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorizedError("Unauthorized");
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) {
      return rl.response!;
    }

    const userProfileId = await getUserProfileId(session.user.id);
    if (!userProfileId) {
      return safeErrorResponse("User profile not found", {
        status: 404,
        code: "PROFILE_NOT_FOUND",
      });
    }

    const parsedBody = shoppingListCurrentMutationSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsedBody.success) {
      return validationError("Validation failed");
    }
    const body = parsedBody.data;

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

    const [existingItems, restockRows] = await Promise.all([
      db
        .select()
        .from(shoppingListItems)
        .where(eq(shoppingListItems.shoppingListId, shoppingList.id))
        .orderBy(asc(shoppingListItems.sortOrder)),
      db
        .select()
        .from(pantryRestockItems)
        .where(
          and(
            eq(pantryRestockItems.userProfileId, userProfileId),
            eq(pantryRestockItems.isActive, true),
          ),
        ),
    ]);

    const pantryRows =
      body.pantryItemId || body.pantryItemIds?.length || body.lowStockOnly
        ? await db
            .select()
            .from(pantryItems)
            .where(eq(pantryItems.userProfileId, userProfileId))
            .orderBy(asc(pantryItems.createdAt))
        : [];

    const pantryInventoryItems = buildPantryInventoryItems(
      pantryRows,
      restockRows,
      [],
      null,
    );

    const requestedPantryIds = new Set([
      ...(body.pantryItemId ? [body.pantryItemId] : []),
      ...(body.pantryItemIds ?? []),
    ]);

    const seeds =
      body.name
        ? [
            {
              name: body.name.trim(),
              ingredientName: body.name.trim(),
              ingredientKey: null,
              ingredientSpecificKey: null,
              quantity:
                body.quantity !== undefined && body.quantity !== null
                  ? String(body.quantity)
                  : null,
              unit: body.unit ?? null,
              amountLabel:
                body.amountLabel ??
                formatAmountLabel(
                  body.quantity !== undefined ? body.quantity : null,
                  body.unit ?? null,
                ),
              category: body.category ?? guessFoodCategory(body.name),
            },
          ]
        : pantryInventoryItems
            .filter((item) => {
              if (requestedPantryIds.size > 0 && !requestedPantryIds.has(item.id)) {
                return false;
              }

              return body.lowStockOnly ? item.lowStock : true;
            })
            .map((item) => resolveShoppingListSeedFromPantryItem(item, restockRows));

    if (seeds.length === 0) {
      return safeErrorResponse(
        body.lowStockOnly
          ? "No low-stock pantry items found"
          : "No pantry items found for handoff",
        {
          status: 404,
          code: body.lowStockOnly
            ? "LOW_STOCK_ITEMS_NOT_FOUND"
            : "PANTRY_ITEMS_NOT_FOUND",
        },
      );
    }

    const mutableItems = [...existingItems];
    const addedItemIds: string[] = [];

    for (const seed of seeds) {
      const existingItem = findExistingShoppingListItem(mutableItems, seed);

      if (existingItem) {
        const nextAmountLabel = existingItem.amountLabel ?? seed.amountLabel;
        const nextQuantity = existingItem.quantity ?? seed.quantity ?? null;
        const nextUnit = existingItem.unit ?? seed.unit ?? null;
        const nextCategory = existingItem.category ?? seed.category ?? null;

        if (
          nextAmountLabel !== existingItem.amountLabel ||
          nextQuantity !== existingItem.quantity ||
          nextUnit !== existingItem.unit ||
          nextCategory !== existingItem.category
        ) {
          const [updatedItem] = await db
            .update(shoppingListItems)
            .set({
              amountLabel: nextAmountLabel,
              quantity: nextQuantity,
              unit: nextUnit,
              category: nextCategory,
              updatedAt: new Date(),
            })
            .where(eq(shoppingListItems.id, existingItem.id))
            .returning();

          const itemIndex = mutableItems.findIndex((item) => item.id === existingItem.id);
          mutableItems[itemIndex] = updatedItem;
        }

        addedItemIds.push(existingItem.id);
        continue;
      }

      const [insertedItem] = await db
        .insert(shoppingListItems)
        .values({
          shoppingListId: shoppingList.id,
          sortOrder: mutableItems.length + 1,
          name: seed.name,
          ingredientName: seed.ingredientName,
          ingredientKey: seed.ingredientKey,
          ingredientSpecificKey: seed.ingredientSpecificKey,
          quantity: seed.quantity,
          unit: seed.unit,
          amountLabel: seed.amountLabel,
          category: seed.category,
        })
        .returning();

      mutableItems.push(insertedItem);
      addedItemIds.push(insertedItem.id);
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
    await CacheService.del(`pantry:${userProfileId}`);

    return NextResponse.json({
      success: true,
      shoppingList: {
        id: result.shoppingList.id,
        title: result.shoppingList.title,
        description: result.shoppingList.description,
        status: result.shoppingList.status,
      },
      items: mapShoppingListItems(result.items),
      addedItemIds,
    });
  } catch (error) {
    apiLogger.error("Failed to upsert current shopping list item", error);
    return handleApiError(error, "POST /api/shopping-lists/current", {
      status: 500,
      code: "SHOPPING_LIST_UPSERT_FAILED",
    });
  }
}
