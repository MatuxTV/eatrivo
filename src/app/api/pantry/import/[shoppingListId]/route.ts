import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";
import { auth } from "../../../../../../auth";
import { db } from "@/index";
import { pantryItems, shoppingLists, shoppingListItems, userInfoTable, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { CacheService } from "@/lib/cache/redis";
import { normalizePantryItemsInBackground } from "@/lib/pantry/background-normalization";
import {
  resolvePantryTrackingMode,
  shouldPreservePantryQuantity,
} from "@/lib/pantry/tracking";
import { guessFoodCategory, normalizeUnit } from "@/lib/ingredients/units";

// POST /api/pantry/import/[shoppingListId]
// Reads shopping list items → inserts pantry items with source: "shopping_list"
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ shoppingListId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shoppingListId } = await params;

  try {
    apiLogger.debug("[pantry.import] request received", {
      metadata: {
        shoppingListId,
        userId: session.user.id,
      },
    });

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userInfo = await db.query.userInfoTable.findFirst({
      where: eq(userInfoTable.userProfileId, userProfile.id),
    });

    // Verify ownership
    const shoppingList = await db.query.shoppingLists.findFirst({
      where: and(
        eq(shoppingLists.id, shoppingListId),
        eq(shoppingLists.userProfileId, userProfile.id),
      ),
    });
    if (!shoppingList) {
      return NextResponse.json(
        { error: "Shopping list not found" },
        { status: 404 },
      );
    }

    // Fetch shopping list items from the database
    const items = await db.query.shoppingListItems.findMany({
      where: eq(shoppingListItems.shoppingListId, shoppingListId),
    });

    apiLogger.debug("[pantry.import] shopping list items loaded", {
      metadata: {
        shoppingListId,
        userProfileId: userProfile.id,
        totalItems: items.length,
      },
    });

    if (items.length === 0) {
      return NextResponse.json({ imported: 0, items: [] });
    }

    const locale = userInfo?.language ?? "sk";
    const validItems = items.filter(
      (item) => item.name && typeof item.name === "string",
    );

    apiLogger.debug("[pantry.import] preparing pantry rows", {
      metadata: {
        shoppingListId,
        userProfileId: userProfile.id,
        validItems: validItems.length,
        skippedItems: items.length - validItems.length,
      },
    });

    // Insert all items
    const toInsert = await Promise.all(validItems
      .map(async (item) => {
        const normalizedName = item.name.trim();
        const normalizedUnit = item.unit ? normalizeUnit(item.unit) : null;
        const trackingMode = resolvePantryTrackingMode({
          name: normalizedName,
          ingredientKey: item.ingredientKey,
          ingredientSpecificKey: item.ingredientSpecificKey,
          quantity: item.quantity !== null ? Number(item.quantity) : null,
          unit: normalizedUnit,
        });
        const preserveQuantity = shouldPreservePantryQuantity({
          name: normalizedName,
          ingredientKey: item.ingredientKey,
          ingredientSpecificKey: item.ingredientSpecificKey,
          trackingMode,
          quantity: item.quantity !== null ? Number(item.quantity) : null,
          unit: normalizedUnit,
        });

        const payload = {
          userProfileId: userProfile.id,
          name: normalizedName,
          ingredientName: item.ingredientName,
          ingredientKey: item.ingredientKey,
          ingredientSpecificKey: item.ingredientSpecificKey,
          trackingMode,
          inStock: true,
          quantity:
            (trackingMode === "quantity" || preserveQuantity) &&
            item.quantity !== null &&
            item.quantity !== undefined
              ? String(item.quantity)
              : null,
          unit:
            (trackingMode === "quantity" || preserveQuantity) && normalizedUnit
              ? normalizedUnit
              : null,
          category: item.category || guessFoodCategory(normalizedName),
          source: "shopping_list" as const,
          shoppingListId,
        };

        apiLogger.debug("[pantry.import] prepared pantry item", {
          metadata: {
            shoppingListId,
            userProfileId: userProfile.id,
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
      }));

    const insertedItems = await db
      .insert(pantryItems)
      .values(toInsert)
      .returning();

    for (const insertedItem of insertedItems) {
      apiLogger.info("[pantry.import] inserted pantry item", {
        metadata: {
          shoppingListId,
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

    // Invalidate pantry cache
    await CacheService.del(`pantry:${userProfile.id}`);
    after(async () => {
      await normalizePantryItemsInBackground({
        source: "pantry-shopping-list-import",
        userProfileId: userProfile.id,
        locale,
        pantryItemIds: insertedItems.map((item) => item.id),
      });
    });

    apiLogger.info("Pantry import completed", {
      metadata: {
        userProfileId: userProfile.id,
        shoppingListId,
        imported: insertedItems.length,
        normalizationQueued: true,
      },
    });

    return NextResponse.json({
      imported: insertedItems.length,
      items: insertedItems,
      normalizationQueued: true,
    });
  } catch (error) {
    apiLogger.error("POST /api/pantry/import error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
