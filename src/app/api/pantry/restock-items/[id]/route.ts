import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "../../../../../../auth";
import { db } from "@/index";
import { pantryRestockItems } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  getUserProfileByUserId,
  invalidatePantryCaches,
  normalizeRestockUnit,
  serializeQuantity,
} from "@/lib/pantry/restock";

interface UpdateRestockRequestBody {
  name?: string;
  defaultQuantity?: number | null;
  defaultUnit?: string | null;
  category?: string | null;
  isActive?: boolean;
}

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

  try {
    const userProfile = await getUserProfileByUserId(session.user.id);
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { id } = await params;
    const current = await db.query.pantryRestockItems.findFirst({
      where: and(
        eq(pantryRestockItems.id, id),
        eq(pantryRestockItems.userProfileId, userProfile.id),
      ),
    });

    if (!current) {
      return NextResponse.json({ error: "Restock item not found" }, { status: 404 });
    }

    const body = (await req.json()) as UpdateRestockRequestBody;
    const [updated] = await db
      .update(pantryRestockItems)
      .set({
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.defaultQuantity !== undefined
          ? { defaultQuantity: serializeQuantity(body.defaultQuantity) }
          : {}),
        ...(body.defaultUnit !== undefined
          ? { defaultUnit: normalizeRestockUnit(body.defaultUnit) }
          : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(pantryRestockItems.id, current.id))
      .returning();

    await invalidatePantryCaches(userProfile.id);
    return NextResponse.json({ item: updated });
  } catch (error) {
    apiLogger.error("PUT /api/pantry/restock-items/[id] error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}