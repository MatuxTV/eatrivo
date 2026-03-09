import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "../../../../../auth";
import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { buildPantryBatchGraph } from "@/lib/langgraph/pantry-batch";
import type { PantryBatchInputItem } from "@/lib/langgraph/pantry-batch/types";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

function isValidBatchItem(value: unknown): value is PantryBatchInputItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.name === "string" &&
    (item.quantity === null || item.quantity === undefined || typeof item.quantity === "number") &&
    (item.unit === null || item.unit === undefined || typeof item.unit === "string") &&
    (item.category === null || item.category === undefined || typeof item.category === "string") &&
    (item.expiryDate === null || item.expiryDate === undefined || typeof item.expiryDate === "string")
  );
}

// POST /api/pantry/batch — AI-assisted batch normalization and upsert
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
    const body = await req.json();
    const rawItems: unknown[] | null = Array.isArray(body?.items)
      ? body.items
      : null;

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json(
        { error: "At least one pantry item is required." },
        { status: 400 },
      );
    }

    if (rawItems.some((item) => !isValidBatchItem(item))) {
      return NextResponse.json(
        { error: "Invalid pantry batch payload." },
        { status: 400 },
      );
    }

    const validatedItems = rawItems as PantryBatchInputItem[];

    const items = validatedItems
      .map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity ?? null,
        unit: item.unit?.trim() || null,
        category: item.category?.trim() || null,
        expiryDate: item.expiryDate?.trim() || null,
      }))
      .filter((item) => item.name.length > 0);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No valid pantry items were provided." },
        { status: 400 },
      );
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });
    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const graph = buildPantryBatchGraph();
    const result = await graph.invoke({
      userId: session.user.id,
      userProfileId: userProfile.id,
      pendingItems: items,
    });

    if (result.error) {
      apiLogger.error("POST /api/pantry/batch failed", undefined, {
        metadata: {
          userId: session.user.id,
          userProfileId: userProfile.id,
          error: result.error,
        },
      });

      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({
      items: result.processedItems ?? [],
      summary: {
        insertedCount: result.insertedCount ?? 0,
        updatedCount: result.updatedCount ?? 0,
        skippedCount: result.skippedCount ?? 0,
      },
      usedAi: (result.aiSuggestions?.length ?? 0) > 0,
    });
  } catch (error) {
    apiLogger.error("POST /api/pantry/batch error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}