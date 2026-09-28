import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "../../../../../../../auth";
import { db } from "@/index";
import { pantryItems, pantryRestockItems } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  findMatchingPantryItem,
  getUserProfileByUserId,
  invalidatePantryCaches,
  normalizeRestockUnit,
  parseStoredQuantity,
  serializeQuantity,
} from "@/lib/pantry/restock";

interface QuickAddRequestBody {
  quantity?: number | null;
  unit?: string | null;
  mode?: "merge" | "replace";
}

export async function POST(
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

  try {
    const userProfile = await getUserProfileByUserId(session.user.id);
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { id } = await params;
    const restockItem = await db.query.pantryRestockItems.findFirst({
      where: and(
        eq(pantryRestockItems.id, id),
        eq(pantryRestockItems.userProfileId, userProfile.id),
      ),
    });

    if (!restockItem || !restockItem.isActive) {
      return NextResponse.json({ error: "Restock item not found" }, { status: 404 });
    }

    const body = (await req.json()) as QuickAddRequestBody;
    const mode = body.mode ?? "merge";
    const resolvedQuantity =
      body.quantity !== undefined
        ? body.quantity
        : parseStoredQuantity(restockItem.defaultQuantity);
    const resolvedUnit =
      body.unit !== undefined
        ? normalizeRestockUnit(body.unit)
        : normalizeRestockUnit(restockItem.defaultUnit);

    const pantryRows = await db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userProfileId, userProfile.id));

    const mergeCandidate = findMatchingPantryItem(pantryRows, {
      name: restockItem.name,
      ingredientKey: restockItem.ingredientKey,
      ingredientSpecificKey: restockItem.ingredientSpecificKey,
      ingredientId: restockItem.ingredientId,
      unit: resolvedUnit,
    });

    let item: typeof pantryItems.$inferSelect;
    let resultMode: "merged" | "replaced" | "inserted";

    if (mergeCandidate && resolvedQuantity !== null) {
      const nextQuantity =
        mode === "replace"
          ? resolvedQuantity
          : (parseStoredQuantity(mergeCandidate.quantity) ?? 0) + resolvedQuantity;

      [item] = await db
        .update(pantryItems)
        .set({
          quantity: serializeQuantity(nextQuantity),
          unit: resolvedUnit,
          updatedAt: new Date(),
        })
        .where(eq(pantryItems.id, mergeCandidate.id))
        .returning();
      resultMode = mode === "replace" ? "replaced" : "merged";
    } else {
      [item] = await db
        .insert(pantryItems)
        .values({
          userProfileId: userProfile.id,
          name: restockItem.name,
          ingredientName: restockItem.ingredientName,
          ingredientKey: restockItem.ingredientKey,
          ingredientSpecificKey: restockItem.ingredientSpecificKey,
          ingredientId: restockItem.ingredientId ?? null,
          quantity: serializeQuantity(resolvedQuantity),
          unit: resolvedUnit,
          category: restockItem.category,
          expiryDate: null,
          source: "manual",
          shoppingListId: null,
        })
        .returning();
      resultMode = "inserted";
    }

    await db
      .update(pantryRestockItems)
      .set({
        lastRestockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pantryRestockItems.id, restockItem.id));

    const updatedRestockItem = {
      ...restockItem,
      defaultQuantity:
        body.quantity !== undefined
          ? serializeQuantity(body.quantity)
          : restockItem.defaultQuantity,
      defaultUnit:
        body.unit !== undefined
          ? normalizeRestockUnit(body.unit)
          : restockItem.defaultUnit,
      lastRestockedAt: new Date(),
      updatedAt: new Date(),
    };

    await invalidatePantryCaches(userProfile.id);
    return NextResponse.json({ item, mode: resultMode, restockItem: updatedRestockItem });
  } catch (error) {
    apiLogger.error("POST /api/pantry/restock-items/[id]/add error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}