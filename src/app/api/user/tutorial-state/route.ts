import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { auth } from "../../../../../auth";
import { userTutorialState } from "@/db/schema";
import { db } from "@/index";
import {
  TUTORIAL_STATE_CACHE_TTL_SECONDS,
  tutorialStateCacheKey,
} from "@/lib/cache/cache-keys";
import { checkRateLimit } from "@/lib/rateLimit";
import { CacheService } from "@/lib/cache/redis";
import type { TutorialSurfaceKey, TutorialStatus } from "@/lib/tutorials/types";

function isTutorialStatus(value: unknown): value is TutorialStatus {
  return ["unseen", "started", "completed", "dismissed", "skipped"].includes(
    String(value),
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`tutorial:${session.user.id}`, "standard");
  if (!rl.success) {
    return rl.response!;
  }

  const cacheKey = tutorialStateCacheKey(session.user.id);
  const cached = await CacheService.get<{
    states: Array<{
      tutorialKey: string;
      surfaceKey: TutorialSurfaceKey;
      version: string;
      status: TutorialStatus;
      lastStepIndex: number;
      firstSeenAt?: Date | string | null;
      lastSeenAt?: Date | string | null;
      completedAt?: Date | string | null;
      dismissedAt?: Date | string | null;
      metadata?: Record<string, unknown> | null;
    }>;
  }>(cacheKey);

  if (cached) {
    return NextResponse.json(cached);
  }

  const states = await db
    .select({
      tutorialKey: userTutorialState.tutorialKey,
      surfaceKey: userTutorialState.surfaceKey,
      version: userTutorialState.version,
      status: userTutorialState.status,
      lastStepIndex: userTutorialState.lastStepIndex,
      firstSeenAt: userTutorialState.firstSeenAt,
      lastSeenAt: userTutorialState.lastSeenAt,
      completedAt: userTutorialState.completedAt,
      dismissedAt: userTutorialState.dismissedAt,
      metadata: userTutorialState.metadata,
    })
    .from(userTutorialState)
    .where(eq(userTutorialState.userId, session.user.id));

  await CacheService.set(
    cacheKey,
    { states },
    TUTORIAL_STATE_CACHE_TTL_SECONDS,
  );

  return NextResponse.json({ states });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`tutorial:${session.user.id}`, "standard");
  if (!rl.success) {
    return rl.response!;
  }

  const body = (await request.json()) as {
    tutorialKey?: unknown;
    surfaceKey?: unknown;
    version?: unknown;
    status?: unknown;
    lastStepIndex?: unknown;
    metadata?: unknown;
  };

  if (
    typeof body.tutorialKey !== "string" ||
    typeof body.surfaceKey !== "string" ||
    typeof body.version !== "string" ||
    !isTutorialStatus(body.status)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const tutorialKey = body.tutorialKey.trim();
  const surfaceKey = body.surfaceKey.trim() as TutorialSurfaceKey;
  const version = body.version.trim();
  const status = body.status;
  const lastStepIndex =
    typeof body.lastStepIndex === "number" && Number.isFinite(body.lastStepIndex)
      ? Math.max(0, Math.floor(body.lastStepIndex))
      : 0;
  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : null;

  const existing = await db
    .select({ firstSeenAt: userTutorialState.firstSeenAt })
    .from(userTutorialState)
    .where(
      and(
        eq(userTutorialState.userId, session.user.id),
        eq(userTutorialState.tutorialKey, tutorialKey),
        eq(userTutorialState.surfaceKey, surfaceKey),
      ),
    )
    .limit(1);

  const now = new Date();
  const firstSeenAt = existing[0]?.firstSeenAt ?? now;
  const completedAt = status === "completed" ? now : null;
  const dismissedAt = status === "dismissed" || status === "skipped" ? now : null;

  await db
    .insert(userTutorialState)
    .values({
      userId: session.user.id,
      tutorialKey,
      surfaceKey,
      version,
      status,
      lastStepIndex,
      firstSeenAt,
      lastSeenAt: now,
      completedAt,
      dismissedAt,
      metadata,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        userTutorialState.userId,
        userTutorialState.tutorialKey,
        userTutorialState.surfaceKey,
      ],
      set: {
        version,
        status: sql`
          case
            when ${userTutorialState.status} in ('completed', 'dismissed', 'skipped') then ${userTutorialState.status}
            when excluded.status in ('completed', 'dismissed', 'skipped') then excluded.status
            when ${userTutorialState.lastStepIndex} > excluded.last_step_index then ${userTutorialState.status}
            else excluded.status
          end
        `,
        lastStepIndex: sql`greatest(${userTutorialState.lastStepIndex}, excluded.last_step_index)`,
        firstSeenAt: sql`coalesce(${userTutorialState.firstSeenAt}, excluded.first_seen_at)`,
        lastSeenAt: now,
        completedAt: sql`coalesce(${userTutorialState.completedAt}, excluded.completed_at)`,
        dismissedAt: sql`coalesce(${userTutorialState.dismissedAt}, excluded.dismissed_at)`,
        metadata: sql`coalesce(excluded.metadata, ${userTutorialState.metadata})`,
        updatedAt: now,
      },
    });

  await CacheService.del(tutorialStateCacheKey(session.user.id));

  return NextResponse.json({ success: true });
}