import { db } from "@/index";
import { users, subscriptions } from "@/db/schema";
import { eq, and, lt, or } from "drizzle-orm";

export interface SubscriptionStatus {
  isActive: boolean;
  membership: string;
  expiresAt: Date | null;
  daysRemaining: number | null;
  isExpired: boolean;
}

/**
 * Check if a user has an active subscription
 * Returns detailed subscription status including expiration info
 */
export async function checkSubscriptionStatus(
  userId: string,
): Promise<SubscriptionStatus> {
  // Get user's current membership
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { membership: true },
  });

  if (!user) {
    return {
      isActive: false,
      membership: "basic",
      expiresAt: null,
      daysRemaining: null,
      isExpired: false,
    };
  }

  // Basic and trainer memberships don't expire
  if (user.membership === "basic" || user.membership === "trainer") {
    return {
      isActive: true,
      membership: user.membership,
      expiresAt: null,
      daysRemaining: null,
      isExpired: false,
    };
  }

  // Get active subscription for premium/pro
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      or(
        eq(subscriptions.status, "active"),
        eq(subscriptions.status, "gifted"),
      ),
    ),
  });

  if (!subscription) {
    // User has premium/pro membership but no subscription record
    // This shouldn't happen, but handle gracefully
    return {
      isActive: false,
      membership: user.membership,
      expiresAt: null,
      daysRemaining: null,
      isExpired: true,
    };
  }

  const now = new Date();
  const expiresAt = subscription.currentPeriodEnd;
  const isExpired = expiresAt ? expiresAt < now : false;

  let daysRemaining: number | null = null;
  if (expiresAt && !isExpired) {
    daysRemaining = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  return {
    isActive: !isExpired && subscription.status === "active",
    membership: user.membership,
    expiresAt,
    daysRemaining,
    isExpired,
  };
}

/**
 * Validate subscription and downgrade if expired
 * Call this when checking access to premium features
 */
export async function validateAndUpdateSubscription(
  userId: string,
): Promise<SubscriptionStatus> {
  const status = await checkSubscriptionStatus(userId);

  // If subscription is expired, downgrade user to basic
  if (status.isExpired && status.membership !== "basic") {
    await db
      .update(users)
      .set({ membership: "basic" })
      .where(eq(users.id, userId));

    // Update subscription status
    await db
      .update(subscriptions)
      .set({ status: "canceled" })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      );

    return {
      ...status,
      isActive: false,
      membership: "basic",
    };
  }

  return status;
}

/**
 * Cleanup all expired subscriptions (for cron job)
 * Returns count of downgraded users
 */
export async function cleanupExpiredSubscriptions(): Promise<{
  downgraded: number;
}> {
  const now = new Date();

  // Find all expired active subscriptions
  const expiredSubscriptions = await db
    .select({
      userId: subscriptions.userId,
      subscriptionId: subscriptions.id,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        lt(subscriptions.currentPeriodEnd, now),
      ),
    );

  if (expiredSubscriptions.length === 0) {
    return { downgraded: 0 };
  }

  const userIds = expiredSubscriptions.map((s) => s.userId);
  const subscriptionIds = expiredSubscriptions.map((s) => s.subscriptionId);

  // Downgrade users to basic
  await db
    .update(users)
    .set({ membership: "basic" })
    .where(or(...userIds.map((id) => eq(users.id, id))));

  // Mark subscriptions as canceled
  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(or(...subscriptionIds.map((id) => eq(subscriptions.id, id))));

  console.warn(
    `[Subscription Cleanup] Downgraded ${userIds.length} users with expired subscriptions`,
  );

  return { downgraded: userIds.length };
}
