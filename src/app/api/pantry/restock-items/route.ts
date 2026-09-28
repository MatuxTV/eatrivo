import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { auth } from "../../../../../auth";
import { db } from "@/index";
import { pantryItems, pantryRestockItems } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import { CacheService } from "@/lib/cache/redis";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  getUserProfileByUserId,
  pantryRestockCacheKey,
  upsertRestockItem,
} from "@/lib/pantry/restock";

const CACHE_TTL = 300;

interface CreateRestockRequestBody {
  pantryItemId?: string;
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  ingredientName?: string | null;
  ingredientKey?: string | null;
  ingredientSpecificKey?: string | null;
}

export async function GET(req: NextRequest) {
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

  try {
    const userProfile = await getUserProfileByUserId(session.user.id);
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const cacheKey = pantryRestockCacheKey(userProfile.id);
    const cached = await CacheService.get<(typeof pantryRestockItems.$inferSelect)[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ items: cached.filter((item) => item.isActive) });
    }

    const items = await db
      .select()
      .from(pantryRestockItems)
      .where(eq(pantryRestockItems.userProfileId, userProfile.id))
      .orderBy(asc(pantryRestockItems.updatedAt));

    await CacheService.set(cacheKey, items, CACHE_TTL);
    return NextResponse.json({ items: items.filter((item) => item.isActive) });
  } catch (error) {
    apiLogger.error("GET /api/pantry/restock-items error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

  try {
    const userProfile = await getUserProfileByUserId(session.user.id);
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = (await req.json()) as CreateRestockRequestBody;
    let sourceItem: typeof pantryItems.$inferSelect | null = null;

    if (body.pantryItemId) {
      sourceItem = await db.query.pantryItems.findFirst({
        where: eq(pantryItems.id, body.pantryItemId),
      }) ?? null;

      if (!sourceItem || sourceItem.userProfileId !== userProfile.id) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
    }

    const name = sourceItem?.name ?? body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const item = await upsertRestockItem(userProfile.id, {
      name,
      ingredientName: sourceItem?.ingredientName ?? body.ingredientName ?? null,
      ingredientKey: sourceItem?.ingredientKey ?? body.ingredientKey ?? null,
      ingredientSpecificKey:
        sourceItem?.ingredientSpecificKey ?? body.ingredientSpecificKey ?? null,
      ingredientId: sourceItem?.ingredientId ?? null,
      quantity: sourceItem?.quantity ?? body.quantity ?? null,
      unit: sourceItem?.unit ?? body.unit ?? null,
      category: sourceItem?.category ?? body.category ?? null,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    apiLogger.error("POST /api/pantry/restock-items error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}