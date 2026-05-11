import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { users, subscriptions, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";
import { invalidateUserContextCaches } from "@/lib/user/user-context-cache";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) return rl.response!;

    // Check if user has the admin role
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { targetUserId, tier, reason, durationMonths } = body as {
      targetUserId: string;
      tier: "premium";
      reason?: string;
      durationMonths?: number;
    };

    // Validate input
    if (!targetUserId || tier !== "premium") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Validate durationMonths is a positive integer within reasonable range
    if (durationMonths !== undefined && durationMonths !== null) {
      if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 24) {
        return NextResponse.json({ error: "durationMonths must be a positive integer between 1 and 24" }, { status: 400 });
      }
    }

    // Check target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate period end (default 1 month if not specified)
    const months = durationMonths || 1;
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + months);

    // Update user membership
    await db
      .update(users)
      .set({ membership: tier })
      .where(eq(users.id, targetUserId));

    // Create gifted subscription record
    await db.insert(subscriptions).values({
      userId: targetUserId,
      stripeSubscriptionId: null,
      stripePriceId: null,
      status: "gifted",
      currentPeriodEnd: periodEnd,
      giftedBy: session.user.id,
      giftReason: reason || `Gifted ${tier} membership`,
    });

    await invalidateUserContextCaches(targetUserId);

    return NextResponse.json({
      success: true,
      message: `Gifted ${tier} membership to user for ${months} month(s)`,
      expiresAt: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error("Gift membership error:", error);
    return NextResponse.json(
      { error: "Failed to gift membership" },
      { status: 500 },
    );
  }
}

// GET - List gifted memberships
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const giftedSubs = await db.query.subscriptions.findMany({
      where: eq(subscriptions.status, "gifted"),
    });

    return NextResponse.json({ giftedMemberships: giftedSubs });
  } catch (error) {
    console.error("Get gifted memberships error:", error);
    return NextResponse.json(
      { error: "Failed to get gifted memberships" },
      { status: 500 },
    );
  }
}
