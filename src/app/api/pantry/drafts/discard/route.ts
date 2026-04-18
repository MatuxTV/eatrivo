import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "../../../../../../auth";
import { eq } from "drizzle-orm";

import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import {
  acquirePantryDraftLock,
  discardPantryDrafts,
  getPantryDraftTtlSeconds,
  releasePantryDraftLock,
} from "@/lib/pantry/draft-cache";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

function parseTokens(body: unknown): string[] | undefined {
  const tokens = (body as { tokens?: unknown[] } | null)?.tokens;
  if (!Array.isArray(tokens)) {
    return undefined;
  }

  return tokens.filter((value): value is string => typeof value === "string");
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
    const body = await req.json().catch(() => ({}));
    const tokens = parseTokens(body);
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    userProfileId = userProfile.id;
    const lockAcquired = await acquirePantryDraftLock(userProfileId);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Another pantry draft action is already in progress." },
        { status: 409 },
      );
    }

    try {
      const drafts = await discardPantryDrafts(userProfileId, tokens);
      return NextResponse.json({
        drafts,
        ttlSeconds: getPantryDraftTtlSeconds(),
      });
    } finally {
      await releasePantryDraftLock(userProfileId);
    }
  } catch (error) {
    apiLogger.error("POST /api/pantry/drafts/discard error", error, {
      metadata: { userId: session.user.id, userProfileId },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}