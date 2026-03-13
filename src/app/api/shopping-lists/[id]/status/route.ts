import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";
import { auth } from "../../../../../../auth";
import { db } from "@/index";
import { shoppingLists, shoppingListItems, userInfoTable, userProfiles, pantryItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { CacheService } from "@/lib/redis";
import { sendPushToUser } from "@/lib/pwa/sendPushToAll";
import { normalizePantryItemsInBackground } from "@/lib/pantry/background-normalization";
import { guessFoodCategory, normalizeUnit } from "@/lib/units";

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["approved", "cancelled"],
  approved: ["purchased", "cancelled"],
  purchased: ["completed"],
  active: ["completed", "cancelled"], // legacy support
  completed: [],
  cancelled: [],
};

// PATCH /api/shopping-lists/[id]/status
// Body: { status: "approved" | "purchased" | "completed" | "cancelled" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { status: newStatus } = body;

    if (!newStatus || typeof newStatus !== "string") {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userInfo = await db.query.userInfoTable.findFirst({
      where: eq(userInfoTable.userProfileId, userProfile.id),
    });

    const shoppingList = await db.query.shoppingLists.findFirst({
      where: and(
        eq(shoppingLists.id, id),
        eq(shoppingLists.userProfileId, userProfile.id),
      ),
    });
    if (!shoppingList) {
      return NextResponse.json(
        { error: "Shopping list not found" },
        { status: 404 },
      );
    }

    // Validate transition
    const allowedTransitions =
      VALID_STATUS_TRANSITIONS[shoppingList.status] ?? [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${shoppingList.status}' to '${newStatus}'`,
        },
        { status: 422 },
      );
    }

    // Update status
    const [updated] = await db
      .update(shoppingLists)
      .set({
        status: newStatus as typeof shoppingList.status,
        updated_at: new Date(),
      })
      .where(eq(shoppingLists.id, id))
      .returning();

    // Invalidate cache
    await CacheService.del(`shopping-lists:${session.user.id}`);

    // Side effects for "purchased"
    if (newStatus === "purchased") {
      after(async () => {
        try {
          await importShoppingListToPantry(
            id,
            userProfile.id,
            userInfo?.language ?? "sk"
          );
        } catch (err) {
          apiLogger.error("Pantry import failed (non-fatal)", { err });
        }
      });

      // Send push notification
      try {
        await sendPushToUser(session.user.id, {
          title: "Nákup dokončený! 🛒",
          body: "Tvoje ingrediencie boli pridané do spajzy.",
          url: "/home?section=pantry",
        });
      } catch (err) {
        apiLogger.error("Push notification failed after purchased", { err });
      }
    }

    // Side effects for "approved"
    if (newStatus === "approved") {
      apiLogger.info("Shopping list approved", {
        metadata: {
          shoppingListId: id,
          userProfileId: userProfile.id,
        },
      });
    }

    return NextResponse.json({ shoppingList: updated });
  } catch (error) {
    apiLogger.error("PATCH /api/shopping-lists/[id]/status error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function importShoppingListToPantry(
  shoppingListId: string,
  userProfileId: string,
  locale: string,
): Promise<void> {
  // Fetch the items from the shopping list directly
  const items = await db.query.shoppingListItems.findMany({
    where: eq(shoppingListItems.shoppingListId, shoppingListId),
  });

  if (items.length === 0) return;

  const validParsedItems = items.filter(
    (item) => item.name && typeof item.name === "string",
  );

  const toInsert = await Promise.all(validParsedItems
    .map(async (item) => {
      const normalizedName = item.name.trim();

      return {
        userProfileId,
        name: normalizedName,
        ingredientName: item.ingredientName,
        ingredientKey: item.ingredientKey,
        ingredientSpecificKey: item.ingredientSpecificKey,
        quantity: item.quantity != null ? String(item.quantity) : null,
        unit: item.unit ? normalizeUnit(item.unit) : null,
        category: item.category || guessFoodCategory(normalizedName),
        source: "shopping_list" as const,
        shoppingListId,
      };
    }));

  if (toInsert.length > 0) {
    const insertedItems = await db.insert(pantryItems).values(toInsert).returning();
    await normalizePantryItemsInBackground({
      source: "shopping-list-status-import",
      userProfileId,
      locale,
      pantryItemIds: insertedItems.map((item) => item.id),
    });
    await CacheService.del(`pantry:${userProfileId}`);
    apiLogger.info("importShoppingListToPantry: items imported", {
      metadata: { shoppingListId, userProfileId, count: toInsert.length },
    });
  } else {
    apiLogger.warn("importShoppingListToPantry: no valid items to insert", {
      metadata: { shoppingListId, parsedCount: items.length },
    });
  }
}
