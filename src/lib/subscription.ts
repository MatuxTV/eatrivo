import { db } from "@/index";
import { users, subscriptions, userProfiles } from "@/db/schema";
import { eq, and, lt, or } from "drizzle-orm";

// Trial period configuration
export const TRIAL_PERIODS = {
  LEGACY: 30, // days for users created before cutoff date
  NEW: 14,    // days for new users
  CUTOFF_DATE: new Date('2026-03-01T00:00:00Z'), // Change this to your desired cutoff
} as const;

export interface SubscriptionStatus {
  isActive: boolean;
  membership: string;
  expiresAt: Date | null;
  daysRemaining: number | null;
  isExpired: boolean;
}

/**
 * Get trial period days for a user based on their account creation date
 * Legacy users get 30 days, new users get 14 days
 */
export async function getTrialPeriodForUser(
  userId: string,
): Promise<number> {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { created_at: true },
  });

  if (!userProfile?.created_at) {
    return TRIAL_PERIODS.NEW; // Default to new user trial
  }

  const isLegacyUser = userProfile.created_at < TRIAL_PERIODS.CUTOFF_DATE;
  return isLegacyUser ? TRIAL_PERIODS.LEGACY : TRIAL_PERIODS.NEW;
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
 * Checks both currentPeriodEnd and cancelAt timestamps
 */
export async function cleanupExpiredSubscriptions(): Promise<{
  downgraded: number;
}> {
  const now = new Date();

  // Find all expired active subscriptions
  // Either currentPeriodEnd has passed OR cancelAt has passed
  const expiredSubscriptions = await db
    .select({
      userId: subscriptions.userId,
      subscriptionId: subscriptions.id,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        or(
          lt(subscriptions.currentPeriodEnd, now),
          lt(subscriptions.cancelAt, now)
        ),
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
