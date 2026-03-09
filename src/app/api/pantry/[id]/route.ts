import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { pantryItems, userInfoTable, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { normalizePantryItemsInBackground } from "@/lib/pantry/background-normalization";
import { CacheService } from "@/lib/redis";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { guessFoodCategory, normalizeUnit } from "@/lib/units";

function cacheKey(userProfileId: string) {
  return `pantry:${userProfileId}`;
}

async function getProfileAndItem(userId: string, itemId: string) {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });
  if (!userProfile) return { error: "Profile not found", status: 404 } as const;

  const userInfo = await db.query.userInfoTable.findFirst({
    where: eq(userInfoTable.userProfileId, userProfile.id),
  });

  const item = await db.query.pantryItems.findFirst({
    where: and(
      eq(pantryItems.id, itemId),
      eq(pantryItems.userProfileId, userProfile.id),
    ),
  });
  if (!item) return { error: "Item not found", status: 404 } as const;

  return { userProfile, userInfo, item };
}

// GET /api/pantry/[id] — Get a single pantry item
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await getProfileAndItem(session.user.id, id);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ item: result.item });
}

// PUT /api/pantry/[id] — Update a pantry item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identifier = getRateLimitIdentifier(
    req as unknown as Request,
    session.user.id,
  );
  const rateLimitResult = await checkRateLimit(identifier, "pantry");
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;
  const result = await getProfileAndItem(session.user.id, id);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  try {
    const body = await req.json();
    const { name, quantity, unit, category, expiryDate } = body;

    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim().length === 0)
    ) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 },
      );
    }

    const resolvedName =
      name !== undefined ? name.trim() : result.item.name;
    const shouldNormalizeInBackground = name !== undefined;
    const resolvedCategory =
      category !== undefined ? category : name !== undefined
        ? guessFoodCategory(resolvedName)
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

    await CacheService.del(cacheKey(result.userProfile.id));
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
      item: updatedItem,
      normalizationQueued: shouldNormalizeInBackground,
    });
  } catch (error) {
    apiLogger.error("PUT /api/pantry/[id] error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/pantry/[id] — Remove a pantry item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identifier = getRateLimitIdentifier(
    req as unknown as Request,
    session.user.id,
  );
  const rateLimitResult = await checkRateLimit(identifier, "pantry");
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await params;
  const result = await getProfileAndItem(session.user.id, id);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  try {
    await db.delete(pantryItems).where(eq(pantryItems.id, id));
    await CacheService.del(cacheKey(result.userProfile.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error("DELETE /api/pantry/[id] error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
