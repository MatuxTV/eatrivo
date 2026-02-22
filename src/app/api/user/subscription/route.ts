import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { users, subscriptions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  validateAndUpdateSubscription,
  getTrialPeriodForUser,
} from "@/lib/subscription";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Get user for stripeCustomerId
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { stripeCustomerId: true },
    });

    return NextResponse.json({
      membership: subscriptionStatus.membership,
      isActive: subscriptionStatus.isActive,
      isExpired: subscriptionStatus.isExpired,
      expiresAt: subscriptionStatus.expiresAt,
      daysRemaining: subscriptionStatus.daysRemaining,
      stripeCustomerId: user?.stripeCustomerId || null,
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
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 },
    );
  }
}
