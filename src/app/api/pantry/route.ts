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
import { CacheService } from "@/lib/redis";
import {
  handleApiError,
  safeErrorResponse,
  unauthorizedError,
  validationError,
} from "@/lib/safeError";
import { buildPantryInventoryItems, derivePantryInventoryItem } from "@/lib/pantry/grocery";
import { invalidatePantryCaches, pantryCacheKey } from "@/lib/pantry/restock";
import {
  pantryCreateItemSchema,
  pantryListQuerySchema,
} from "@/lib/schemas/pantry";
import { guessFoodCategory, normalizeUnit } from "@/lib/units";

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
    const { name, quantity, unit, category, expiryDate } = parsedBody.data;

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    if (!userProfile) {
      return safeErrorResponse("Profile not found", {
        status: 404,
        code: "PROFILE_NOT_FOUND",
      });
    }

    const [userInfo, activeShoppingList, restockRows] = await Promise.all([
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
    ]);

    const resolvedCategory =
      category && typeof category === "string"
        ? category
        : guessFoodCategory(name.trim());
    const normalizedName = name.trim();

    const [newItem] = await db
      .insert(pantryItems)
      .values({
        userProfileId: userProfile.id,
        name: normalizedName,
        ingredientName: null,
        ingredientKey: null,
        ingredientSpecificKey: null,
        quantity:
          quantity !== null && quantity !== undefined ? String(quantity) : null,
        unit: unit ? normalizeUnit(String(unit)) : null,
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
