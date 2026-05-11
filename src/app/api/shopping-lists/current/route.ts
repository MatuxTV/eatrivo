import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { auth } from "../../../../../auth";
import {
  pantryItems,
  pantryRestockItems,
  shoppingListItems,
  shoppingLists,
  userInfoTable,
  userProfiles,
} from "@/db/schema";
import { db } from "@/index";
import { apiLogger } from "@/lib/logger";
import {
  findPantrySuggestionForItem,
  getPantryAiSuggestions,
} from "@/lib/pantry/ai-normalization";
import {
  PantryIngredientResolutionError,
  loadIngredientAliasIndex,
  resolveRequiredPantryIngredientIdentity,
} from "@/lib/pantry/ingredient-resolution";
import { reportIngredientResolutionFeedback } from "@/lib/feedback/ingredient-resolution-feedback";
import {
  resolveShoppingListSeedFromPantryItem,
} from "@/lib/pantry/grocery";
import { formatAmountLabel } from "@/lib/pantry/format";
import { buildPantryInventoryItems } from "@/lib/pantry/grocery";
import {
  normalizeShoppingListAmount,
  parseShoppingListAmountLabel,
} from "@/lib/pantry/shopping-list-amount";
import {
  normalizeRestockUnit,
  parseStoredQuantity,
  serializeQuantity,
} from "@/lib/pantry/restock";
import { checkRateLimit } from "@/lib/rateLimit";
import { CacheService } from "@/lib/cache/redis";
import { handleApiError, safeErrorResponse, unauthorizedError, validationError } from "@/lib/safeError";
import { shoppingListCurrentMutationSchema } from "@/lib/schemas/pantry";
import { guessFoodCategory } from "@/lib/ingredients/units";

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

type RouteSession = {
  user?: {
    id?: string;
    locale?: string | null;
    email?: string | null;
    name?: string | null;
  };
} | null;

function getShoppingListPlaceholderTimestamp() {
  return new Date();
}

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
  let session: RouteSession = null;

  try {
    session = await auth();

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
    const parsedAmountLabel = parseShoppingListAmountLabel(body.amountLabel ?? null);
    if (!parsedAmountLabel.ok) {
      return validationError(parsedAmountLabel.message);
    }
    const resolvedManualQuantity =
      body.quantity !== undefined
        ? body.quantity
        : parsedAmountLabel.quantity ?? null;
    const resolvedManualUnit =
      body.unit !== undefined
        ? normalizeRestockUnit(body.unit)
        : parsedAmountLabel.unit ?? null;
    const resolvedManualAmount = normalizeShoppingListAmount(
      resolvedManualQuantity,
      resolvedManualUnit,
    );
    if (!resolvedManualAmount.ok) {
      return validationError(resolvedManualAmount.message);
    }

    apiLogger.debug("[shopping-list.current.upsert] request validated", {
      metadata: {
        userId: session.user.id,
        userProfileId,
        mode: body.name ? "manual" : "pantry-handoff",
        pantryItemId: body.pantryItemId ?? null,
        pantryItemIdsCount: body.pantryItemIds?.length ?? 0,
        lowStockOnly: body.lowStockOnly ?? false,
        appendPackage: body.appendPackage ?? false,
        amountLabel: body.amountLabel ?? null,
        parsedAmountLabelQuantity: parsedAmountLabel.quantity ?? null,
        parsedAmountLabelUnit: parsedAmountLabel.unit ?? null,
      },
    });

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
      body.name || body.pantryItemId || body.pantryItemIds?.length || body.lowStockOnly
        ? await db
            .select()
            .from(pantryItems)
            .where(eq(pantryItems.userProfileId, userProfileId))
            .orderBy(asc(pantryItems.createdAt))
        : [];

    const userInfo = body.name
      ? await db.query.userInfoTable.findFirst({
          where: eq(userInfoTable.userProfileId, userProfileId),
        })
      : null;

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

    const locale = userInfo?.language ?? "sk";
    const aiSuggestion = body.name
      ? findPantrySuggestionForItem(
          await getPantryAiSuggestions({
            userProfileId,
            locale,
            currentPantry: pantryRows,
            pendingItems: [
              {
                name: body.name.trim(),
                trackingMode: null,
                inStock: null,
                quantity: resolvedManualAmount.quantity,
                unit: resolvedManualAmount.unit,
                category: body.category ?? guessFoodCategory(body.name),
                expiryDate: null,
              },
            ],
          }),
          body.name.trim(),
          0,
        )
      : null;

    const aliasIndex = body.name
      ? await loadIngredientAliasIndex(locale)
      : null;
    const resolvedManualIdentity =
      body.name && aliasIndex
        ? resolveRequiredPantryIngredientIdentity(
            body.name.trim(),
            locale,
            aliasIndex,
            aiSuggestion?.ingredientSpecificKey ??
              aiSuggestion?.matchedExistingIngredientSpecificKey ??
              null,
            aiSuggestion?.ingredientKey ??
              aiSuggestion?.matchedExistingIngredientKey ??
              null,
          )
        : null;

    if (body.name) {
      apiLogger.debug("[shopping-list.current.upsert] AI normalization resolved", {
        metadata: {
          shoppingListId: shoppingList.id,
          userProfileId,
          itemName: body.name.trim(),
          normalizedName: aiSuggestion?.normalizedName ?? null,
          ingredientKey:
            aiSuggestion?.ingredientKey ??
            aiSuggestion?.matchedExistingIngredientKey ??
            null,
          ingredientSpecificKey:
            aiSuggestion?.ingredientSpecificKey ??
            aiSuggestion?.matchedExistingIngredientSpecificKey ??
            null,
          category: aiSuggestion?.category ?? null,
          confidence: aiSuggestion?.confidence ?? null,
        },
      });
    }

    const seeds =
      body.name
        ? [
            {
              name: resolvedManualIdentity!.ingredientName,
              ingredientName: resolvedManualIdentity!.ingredientName,
              ingredientKey: resolvedManualIdentity!.ingredientKey,
              ingredientSpecificKey: resolvedManualIdentity!.ingredientSpecificKey,
              quantity:
                resolvedManualAmount.quantity !== null
                  ? String(resolvedManualAmount.quantity)
                  : null,
              unit: resolvedManualAmount.unit,
              amountLabel: resolvedManualAmount.amountLabel,
              category:
                aiSuggestion?.category ??
                body.category ??
                guessFoodCategory(body.name),
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

    apiLogger.debug("[shopping-list.current.upsert] prepared seeds", {
      metadata: {
        shoppingListId: shoppingList.id,
        userProfileId,
        seedCount: seeds.length,
      },
    });

    for (const seed of seeds) {
      apiLogger.debug("[shopping-list.current.upsert] seed prepared", {
        metadata: {
          shoppingListId: shoppingList.id,
          userProfileId,
          itemName: seed.name,
          ingredientKey: seed.ingredientKey,
          ingredientSpecificKey: seed.ingredientSpecificKey,
          quantity: seed.quantity,
          unit: seed.unit,
          amountLabel: seed.amountLabel,
          category: seed.category,
        },
      });
    }

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
        const seedQuantity = parseStoredQuantity(seed.quantity);
        const existingQuantity = parseStoredQuantity(existingItem.quantity);
        const seedUnit = normalizeRestockUnit(seed.unit);
        const existingUnit = normalizeRestockUnit(existingItem.unit);
        const shouldAppendPackage =
          body.appendPackage === true &&
          seedQuantity !== null &&
          (existingQuantity === null || existingUnit === seedUnit);
        const mergedQuantity = shouldAppendPackage
          ? (existingQuantity ?? 0) + seedQuantity
          : null;
        const nextAmount = normalizeShoppingListAmount(
          shouldAppendPackage
            ? mergedQuantity
            : existingItem.quantity ?? seed.quantity ?? null,
          shouldAppendPackage
            ? seed.unit ?? existingItem.unit ?? null
            : existingItem.unit ?? seed.unit ?? null,
        );
        const nextAmountLabel = nextAmount.ok
          ? nextAmount.amountLabel
          : existingItem.amountLabel ?? seed.amountLabel;
        const nextQuantity = nextAmount.ok
          ? (nextAmount.quantity !== null ? serializeQuantity(nextAmount.quantity) : null)
          : existingItem.quantity ?? seed.quantity ?? null;
        const nextUnit = nextAmount.ok
          ? nextAmount.unit
          : existingItem.unit ?? seed.unit ?? null;
        const nextCategory = existingItem.category ?? seed.category ?? null;

        apiLogger.debug("[shopping-list.current.upsert] matched existing item", {
          metadata: {
            shoppingListId: shoppingList.id,
            userProfileId,
            shoppingListItemId: existingItem.id,
            itemName: existingItem.name,
            appendPackage: shouldAppendPackage,
            existingQuantity: existingItem.quantity,
            seedQuantity: seed.quantity,
            nextQuantity,
            nextUnit,
          },
        });

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

          apiLogger.info("[shopping-list.current.upsert] updated shopping list item", {
            metadata: {
              shoppingListId: shoppingList.id,
              userProfileId,
              shoppingListItemId: updatedItem.id,
              itemName: updatedItem.name,
              quantity: updatedItem.quantity,
              unit: updatedItem.unit,
              amountLabel: updatedItem.amountLabel,
            },
          });
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

      apiLogger.info("[shopping-list.current.upsert] inserted shopping list item", {
        metadata: {
          shoppingListId: shoppingList.id,
          userProfileId,
          shoppingListItemId: insertedItem.id,
          itemName: insertedItem.name,
          quantity: insertedItem.quantity,
          unit: insertedItem.unit,
          amountLabel: insertedItem.amountLabel,
          category: insertedItem.category,
        },
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
    if (error instanceof PantryIngredientResolutionError) {
      const feedbackRecorded = await reportIngredientResolutionFeedback({
        source: "shopping-list-current-upsert",
        rawName: error.rawName,
        locale: session?.user?.locale ?? "sk",
        userId: session?.user?.id ?? null,
        userEmail: session?.user?.email ?? null,
        userName: session?.user?.name ?? null,
      });

      return safeErrorResponse("We could not recognize this item as a food ingredient.", {
        status: 422,
        code: "INGREDIENT_RESOLUTION_FAILED",
        details: { feedbackRecorded },
      });
    }

    apiLogger.error("Failed to upsert current shopping list item", error);
    return handleApiError(error, "POST /api/shopping-lists/current", {
      status: 500,
      code: "SHOPPING_LIST_UPSERT_FAILED",
    });
  }
}
