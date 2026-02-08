// Admin analytics dashboard API
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { analyticsEvents, users, userProfiles } from "@/db/schema";
import { sql, gte, count, eq, and, desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile || userProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Parallel queries for dashboard data
    const [
      totalUsersResult,
      premiumUsersResult,
      activeToday,
      recentEvents,
      eventsByType,
      dailyActiveUsers,
      subscriptionStats,
    ] = await Promise.all([
      // Total users
      db.select({ count: count() }).from(users),

      // Premium users
      db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.membership} IN ('premium', 'pro', 'trainer')`),

      // Active users today
      db
        .select({
          count: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})`,
        })
        .from(analyticsEvents)
        .where(
          gte(
            analyticsEvents.createdAt,
            new Date(new Date().setHours(0, 0, 0, 0)),
          ),
        ),

      // Recent events (last 50)
      db
        .select({
          id: analyticsEvents.id,
          eventType: analyticsEvents.eventType,
          eventName: analyticsEvents.eventName,
          metadata: analyticsEvents.metadata,
          createdAt: analyticsEvents.createdAt,
          userId: analyticsEvents.userId,
        })
        .from(analyticsEvents)
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(50),

      // Events by type (last 30 days)
      db
        .select({
          eventType: analyticsEvents.eventType,
          count: count(),
        })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, thirtyDaysAgo))
        .groupBy(analyticsEvents.eventType),

      // Daily active users for chart (last 30 days)
      db
        .select({
          date: sql<string>`DATE(${analyticsEvents.createdAt})`.as("date"),
          count: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})`.as(
            "count",
          ),
        })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, thirtyDaysAgo))
        .groupBy(sql`DATE(${analyticsEvents.createdAt})`)
        .orderBy(sql`DATE(${analyticsEvents.createdAt})`),

      // Subscription breakdown
      db
        .select({
          membership: users.membership,
          count: count(),
        })
        .from(users)
        .groupBy(users.membership),
    ]);

    // Feature usage stats (last 30 days)
    const featureUsage = await db
      .select({
        eventName: analyticsEvents.eventName,
        count: count(),
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, "feature"),
          gte(analyticsEvents.createdAt, thirtyDaysAgo),
        ),
      )
      .groupBy(analyticsEvents.eventName)
      .orderBy(desc(count()));

    return NextResponse.json({
      overview: {
        totalUsers: totalUsersResult[0]?.count || 0,
        premiumUsers: premiumUsersResult[0]?.count || 0,
        activeToday: activeToday[0]?.count || 0,
      },
      recentEvents,
      eventsByType,
      dailyActiveUsers,
      subscriptionStats,
      featureUsage,
    });
  } catch (error) {
    console.error("[Admin Analytics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
