import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "../../../../../auth";
import { eq } from "drizzle-orm";

import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import type { PantryBatchInputItem } from "@/lib/langgraph/pantry-batch/types";
import { apiLogger } from "@/lib/logger";
import {
  acquirePantryDraftLock,
  appendPantryDrafts,
  getPantryDraftTtlSeconds,
  getPantryDrafts,
  releasePantryDraftLock,
} from "@/lib/pantry/draft-cache";
import {
  normalizePreparedDraftInput,
  preparePantryDrafts,
} from "@/lib/pantry/prepare-drafts";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

function isValidDraftItem(value: unknown): value is PantryBatchInputItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.name === "string" &&
    (item.trackingMode === null ||
      item.trackingMode === undefined ||
      item.trackingMode === "quantity" ||
      item.trackingMode === "availability") &&
    (item.inStock === null || item.inStock === undefined || typeof item.inStock === "boolean") &&
    (item.quantity === null || item.quantity === undefined || typeof item.quantity === "number") &&
    (item.unit === null || item.unit === undefined || typeof item.unit === "string") &&
    (item.category === null || item.category === undefined || typeof item.category === "string") &&
    (item.expiryDate === null || item.expiryDate === undefined || typeof item.expiryDate === "string")
  );
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
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const drafts = await getPantryDrafts(userProfile.id);
    return NextResponse.json({ drafts, ttlSeconds: getPantryDraftTtlSeconds() });
  } catch (error) {
    apiLogger.error("GET /api/pantry/drafts error", error, {
      metadata: { userId: session.user.id },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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

  let userProfileId: string | null = null;

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

    if (rawItems.some((item) => !isValidDraftItem(item))) {
      return NextResponse.json(
        { error: "Invalid pantry draft payload." },
        { status: 400 },
      );
    }

    const items = normalizePreparedDraftInput(rawItems as PantryBatchInputItem[]);
    if (items.length === 0) {
      return NextResponse.json(
        { error: "No valid pantry items were provided." },
        { status: 400 },
      );
    }

    const prepared = await preparePantryDrafts({
      userId: session.user.id,
      items,
    });
    userProfileId = prepared.userProfileId;

    const lockAcquired = await acquirePantryDraftLock(userProfileId);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Another pantry draft action is already in progress." },
        { status: 409 },
      );
    }

    try {
      const drafts = await appendPantryDrafts(userProfileId, prepared.drafts);
      return NextResponse.json(
        {
          drafts,
          addedDrafts: prepared.drafts,
          ttlSeconds: getPantryDraftTtlSeconds(),
        },
        { status: 201 },
      );
    } finally {
      await releasePantryDraftLock(userProfileId);
    }
  } catch (error) {

    apiLogger.error("POST /api/pantry/drafts error", error, {
      metadata: { userId: session.user.id, userProfileId },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}