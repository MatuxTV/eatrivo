import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { subscriptions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  validateAndUpdateSubscription,
  getTrialPeriodForUser,
} from "@/lib/billing/subscription";
import { checkRateLimit } from "@/lib/rateLimit";
import { SUBSCRIPTION_SNAPSHOT_CACHE_TTL_SECONDS, subscriptionSnapshotCacheKey } from "@/lib/cache/cache-keys";
import { CacheService } from "@/lib/cache/redis";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) return rl.response!;

    const cacheKey = subscriptionSnapshotCacheKey(session.user.id);
    const cached = await CacheService.get<{
      membership: string;
      isActive: boolean;
      isExpired: boolean;
      expiresAt: Date | string | null;
      daysRemaining: number | null;
      subscription: {
        status: string;
        currentPeriodEnd: Date | string | null;
        cancelAt: Date | string | null;
        isGifted: boolean;
        giftReason: string | null;
      } | null;
      trialDays: number;
    }>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    // Validate subscription and auto-downgrade if expired
    const subscriptionStatus = await validateAndUpdateSubscription(
      session.user.id,
    );

    // Get subscription record for additional details
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id),
      orderBy: [desc(subscriptions.createdAt)],
    });

    const response = {
      membership: subscriptionStatus.membership,
      isActive: subscriptionStatus.isActive,
      isExpired: subscriptionStatus.isExpired,
      expiresAt: subscriptionStatus.expiresAt,
      daysRemaining: subscriptionStatus.daysRemaining,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAt: subscription.cancelAt, // Only use cancelAt timestamp
            isGifted: subscription.status === "gifted",
            giftReason: subscription.giftReason,
          }
        : null,
      trialDays: await getTrialPeriodForUser(session.user.id),
    };

    await CacheService.set(
      cacheKey,
      response,
      SUBSCRIPTION_SNAPSHOT_CACHE_TTL_SECONDS,
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 },
    );
  }
}
