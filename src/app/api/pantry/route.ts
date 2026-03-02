import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { db } from "@/index";
import { pantryItems, userProfiles } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { CacheService } from "@/lib/redis";
import { guessFoodCategory } from "@/lib/units";

const CACHE_TTL = 300; // 5 minutes

function cacheKey(userProfileId: string) {
  return `pantry:${userProfileId}`;
}

// GET /api/pantry — Fetch all pantry items for the authenticated user
export async function GET(req: NextRequest) {
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

  try {
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Try cache first
    const cached = await CacheService.get<(typeof pantryItems.$inferSelect)[]>(
      cacheKey(userProfile.id),
    );
    if (cached) {
      return NextResponse.json({ items: cached });
    }

    const items = await db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userProfileId, userProfile.id))
      .orderBy(asc(pantryItems.createdAt));

    await CacheService.set(cacheKey(userProfile.id), items, CACHE_TTL);
    return NextResponse.json({ items });
  } catch (error) {
    apiLogger.error("GET /api/pantry error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/pantry — Add a manual pantry item
export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const { name, quantity, unit, category, expiryDate } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json({ error: "Name too long" }, { status: 400 });
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const resolvedCategory =
      category && typeof category === "string"
        ? category
        : guessFoodCategory(name.trim());

    const [newItem] = await db
      .insert(pantryItems)
      .values({
        userProfileId: userProfile.id,
        name: name.trim(),
        quantity: quantity ? String(quantity) : null,
        unit: unit ? String(unit) : null,
        category: resolvedCategory,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        source: "manual",
        shoppingListId: null,
      })
      .returning();

    await CacheService.del(cacheKey(userProfile.id));
    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error) {
    apiLogger.error("POST /api/pantry error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
