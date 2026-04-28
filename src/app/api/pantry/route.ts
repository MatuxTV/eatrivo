import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";
import { auth } from "../../../../auth";
import { db } from "@/index";
import {
  pantryItems,
  pantryRestockItems,
  shoppingListItems,
  shoppingLists,
  userInfoTable,
  userProfiles,
} from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { normalizePantryItemsInBackground } from "@/lib/pantry/background-normalization";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { CacheService } from "@/lib/cache/redis";
import {
  handleApiError,
  safeErrorResponse,
  unauthorizedError,
  validationError,
} from "@/lib/safeError";
import {
  findPantrySuggestionForItem,
  getPantryAiSuggestions,
} from "@/lib/pantry/ai-normalization";
import { buildPantryInventoryItems, derivePantryInventoryItem } from "@/lib/pantry/grocery";
import { invalidatePantryCaches, pantryCacheKey } from "@/lib/pantry/restock";
import {
  resolvePantryTrackingMode,
  shouldPreservePantryQuantity,
} from "@/lib/pantry/tracking";
import {
  pantryCreateItemSchema,
  pantryListQuerySchema,
} from "@/lib/schemas/pantry";
import { guessFoodCategory, normalizeUnit } from "@/lib/ingredients/units";

const CACHE_TTL = 300; // 5 minutes

// GET /api/pantry — Fetch all pantry items for the authenticated user
export async function GET(req: NextRequest) {
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

  try {
    const query = pantryListQuerySchema.safeParse({
      lowStockOnly: req.nextUrl.searchParams.get("lowStockOnly"),
    });
    if (!query.success) {
      return validationError("Invalid pantry query");
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    if (!userProfile) {
      return safeErrorResponse("Profile not found", {
        status: 404,
        code: "PROFILE_NOT_FOUND",
      });
    }

    const [activeShoppingList, restockRows] = await Promise.all([
      db.query.shoppingLists.findFirst({
        where: and(
          eq(shoppingLists.userProfileId, userProfile.id),
          eq(shoppingLists.status, "active"),
        ),
      }),
      db
        .select()
        .from(pantryRestockItems)
        .where(
          and(
            eq(pantryRestockItems.userProfileId, userProfile.id),
            eq(pantryRestockItems.isActive, true),
          ),
        )
        .orderBy(asc(pantryRestockItems.createdAt)),
    ]);

    const cached = await CacheService.get<(typeof pantryItems.$inferSelect)[]>(
      pantryCacheKey(userProfile.id),
    );

    const pantryRows =
      cached ??
      (await db
        .select()
        .from(pantryItems)
        .where(eq(pantryItems.userProfileId, userProfile.id))
        .orderBy(asc(pantryItems.createdAt)));

    if (!cached) {
      await CacheService.set(pantryCacheKey(userProfile.id), pantryRows, CACHE_TTL);
    }

    const activeShoppingListItems = activeShoppingList
      ? await db
          .select()
          .from(shoppingListItems)
          .where(eq(shoppingListItems.shoppingListId, activeShoppingList.id))
          .orderBy(asc(shoppingListItems.sortOrder))
      : [];

    const items = buildPantryInventoryItems(
      pantryRows,
      restockRows,
      activeShoppingListItems,
      activeShoppingList?.id ?? null,
    );
    const filteredItems = query.data.lowStockOnly
      ? items.filter((item) => item.lowStock)
      : items;

    return NextResponse.json({
      items: filteredItems,
      meta: {
        activeShoppingListId: activeShoppingList?.id ?? null,
        lowStockCount: items.filter((item) => item.lowStock).length,
      },
    });
  } catch (error) {
    apiLogger.error("GET /api/pantry error", { error });
    return handleApiError(error, "GET /api/pantry", {
      status: 500,
      code: "PANTRY_FETCH_FAILED",
    });
  }
}

// POST /api/pantry — Add a manual pantry item
export async function POST(req: NextRequest) {
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

  try {
    const parsedBody = pantryCreateItemSchema.safeParse(
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
    } = parsedBody.data;

    apiLogger.debug("[pantry.create] request validated", {
      metadata: {
        userId: session.user.id,
        itemName: name,
        requestedTrackingMode: trackingMode ?? null,
        requestedInStock: inStock ?? null,
        requestedQuantity: quantity ?? null,
        requestedUnit: unit ?? null,
        category: category ?? null,
        expiryDate: expiryDate ?? null,
      },
    });

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    if (!userProfile) {
      return safeErrorResponse("Profile not found", {
        status: 404,
        code: "PROFILE_NOT_FOUND",
      });
    }

    const [userInfo, activeShoppingList, restockRows, currentPantry] = await Promise.all([
      db.query.userInfoTable.findFirst({
        where: eq(userInfoTable.userProfileId, userProfile.id),
      }),
      db.query.shoppingLists.findFirst({
        where: and(
          eq(shoppingLists.userProfileId, userProfile.id),
          eq(shoppingLists.status, "active"),
        ),
      }),
      db
        .select()
        .from(pantryRestockItems)
        .where(
          and(
            eq(pantryRestockItems.userProfileId, userProfile.id),
            eq(pantryRestockItems.isActive, true),
          ),
        ),
      db
        .select()
        .from(pantryItems)
        .where(eq(pantryItems.userProfileId, userProfile.id)),
    ]);

    const resolvedCategory =
      category && typeof category === "string"
        ? category
        : guessFoodCategory(name.trim());
    const normalizedName = name.trim();
    const normalizedUnit = unit ? normalizeUnit(String(unit)) : null;
    const aiSuggestions = await getPantryAiSuggestions({
      userProfileId: userProfile.id,
      locale: userInfo?.language ?? "sk",
      currentPantry,
      pendingItems: [
        {
          name: normalizedName,
          trackingMode: trackingMode ?? null,
          inStock: inStock ?? null,
          quantity: quantity ?? null,
          unit: normalizedUnit,
          category: resolvedCategory,
          expiryDate: expiryDate ?? null,
        },
      ],
    });
    const aiSuggestion = findPantrySuggestionForItem(
      aiSuggestions,
      normalizedName,
      0,
    );
    const resolvedTrackingMode = resolvePantryTrackingMode({
      name: normalizedName,
      ingredientKey:
        aiSuggestion?.ingredientKey ??
        aiSuggestion?.matchedExistingIngredientKey ??
        null,
      ingredientSpecificKey:
        aiSuggestion?.ingredientSpecificKey ??
        aiSuggestion?.matchedExistingIngredientSpecificKey ??
        null,
      aiRecommendedTrackingMode:
        aiSuggestion?.recommendedTrackingMode ?? null,
      trackingMode: trackingMode ?? null,
      quantity: quantity ?? null,
      unit: normalizedUnit,
    });
    const preserveQuantity = shouldPreservePantryQuantity({
      name: normalizedName,
      ingredientKey:
        aiSuggestion?.ingredientKey ??
        aiSuggestion?.matchedExistingIngredientKey ??
        null,
      ingredientSpecificKey:
        aiSuggestion?.ingredientSpecificKey ??
        aiSuggestion?.matchedExistingIngredientSpecificKey ??
        null,
      trackingMode: resolvedTrackingMode,
      aiRecommendedTrackingMode:
        aiSuggestion?.recommendedTrackingMode ?? null,
      quantity: quantity ?? null,
      unit: normalizedUnit,
    });
    const resolvedInStock =
      resolvedTrackingMode === "availability" ? (inStock ?? true) : true;

    apiLogger.debug("[pantry.create] resolved pantry item", {
      metadata: {
        userProfileId: userProfile.id,
        itemName: normalizedName,
        aiIngredientKey:
          aiSuggestion?.ingredientKey ??
          aiSuggestion?.matchedExistingIngredientKey ??
          null,
        aiIngredientSpecificKey:
          aiSuggestion?.ingredientSpecificKey ??
          aiSuggestion?.matchedExistingIngredientSpecificKey ??
          null,
        aiRecommendedTrackingMode:
          aiSuggestion?.recommendedTrackingMode ?? null,
        resolvedTrackingMode,
        preserveQuantity,
        resolvedInStock,
        quantity:
          (resolvedTrackingMode === "quantity" || preserveQuantity) &&
          quantity !== null &&
          quantity !== undefined
            ? String(quantity)
            : null,
        unit:
          (resolvedTrackingMode === "quantity" || preserveQuantity) && normalizedUnit
            ? normalizedUnit
            : null,
      },
    });

    const [newItem] = await db
      .insert(pantryItems)
      .values({
        userProfileId: userProfile.id,
        name: normalizedName,
        ingredientName: null,
        ingredientKey: null,
        ingredientSpecificKey: null,
        trackingMode: resolvedTrackingMode,
        inStock: resolvedInStock,
        quantity:
          (resolvedTrackingMode === "quantity" || preserveQuantity) &&
          quantity !== null &&
          quantity !== undefined
            ? String(quantity)
            : null,
        unit:
          (resolvedTrackingMode === "quantity" || preserveQuantity) && normalizedUnit
            ? normalizedUnit
            : null,
        category: resolvedCategory,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        source: "manual",
        shoppingListId: null,
      })
      .returning();

    const activeShoppingListItems = activeShoppingList
      ? await db
          .select()
          .from(shoppingListItems)
          .where(eq(shoppingListItems.shoppingListId, activeShoppingList.id))
      : [];

    await invalidatePantryCaches(userProfile.id);
    after(async () => {
      await normalizePantryItemsInBackground({
        source: "pantry-manual-add",
        userProfileId: userProfile.id,
        locale: userInfo?.language ?? "sk",
        pantryItemIds: [newItem.id],
      });
    });

    apiLogger.info("[pantry.create] pantry item inserted", {
      metadata: {
        userProfileId: userProfile.id,
        pantryItemId: newItem.id,
        itemName: newItem.name,
        trackingMode: newItem.trackingMode,
        inStock: newItem.inStock,
        quantity: newItem.quantity,
        unit: newItem.unit,
        category: newItem.category,
      },
    });

    return NextResponse.json(
      {
        item: derivePantryInventoryItem(
          newItem,
          restockRows,
          activeShoppingListItems,
          activeShoppingList?.id ?? null,
        ),
        normalizationQueued: true,
      },
      { status: 201 },
    );
  } catch (error) {
    apiLogger.error("POST /api/pantry error", { error });
    return handleApiError(error, "POST /api/pantry", {
      status: 500,
      code: "PANTRY_CREATE_FAILED",
    });
  }
}
