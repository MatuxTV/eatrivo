import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { pantryItems, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { CacheService } from "@/lib/redis";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

function cacheKey(userProfileId: string) {
  return `pantry:${userProfileId}`;
}

async function getProfileAndItem(userId: string, itemId: string) {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });
  if (!userProfile) return { error: "Profile not found", status: 404 } as const;

  const item = await db.query.pantryItems.findFirst({
    where: and(
      eq(pantryItems.id, itemId),
      eq(pantryItems.userProfileId, userProfile.id),
    ),
  });
  if (!item) return { error: "Item not found", status: 404 } as const;

  return { userProfile, item };
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
  const rateLimitResult = await checkRateLimit(identifier, "standard");
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

    const [updatedItem] = await db
      .update(pantryItems)
      .set({
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(quantity !== undefined
          ? { quantity: quantity !== null ? String(quantity) : null }
          : {}),
        ...(unit !== undefined
          ? { unit: unit !== null ? String(unit) : null }
          : {}),
        ...(category !== undefined ? { category } : {}),
        ...(expiryDate !== undefined
          ? { expiryDate: expiryDate !== null ? new Date(expiryDate) : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(pantryItems.id, id))
      .returning();

    await CacheService.del(cacheKey(result.userProfile.id));
    return NextResponse.json({ item: updatedItem });
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
  const rateLimitResult = await checkRateLimit(identifier, "standard");
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
