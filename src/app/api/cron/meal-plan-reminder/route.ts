import { NextResponse } from "next/server";
import { db } from "@/index";
import {
  pushSubscriptions,
  shoppingLists,
  userProfiles,
  userInfoTable,
} from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  sendPushToUser,
  type PushNotificationPayload,
} from "@/lib/pwa/sendPushToAll";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Get the start of the current week (Monday 00:00:00 UTC).
 */
function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get the end of the current week (Sunday 23:59:59 UTC).
 */
function getCurrentWeekEnd(): Date {
  const monday = getCurrentWeekStart();
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
}

const REMINDER_MESSAGES: Record<string, PushNotificationPayload> = {
  sk: {
    title: "📋 Nový týždeň, nový jedálniček!",
    body: "Ešte nemáš jedálny plán na tento týždeň. Nechaj Riva uvariť! 🍳",
    url: "/dashboard",
  },
  en: {
    title: "📋 New week, new meal plan!",
    body: "You don't have a meal plan for this week yet. Let Rivo cook! 🍳",
    url: "/dashboard",
  },
};

/**
 * Cron endpoint: sends a reminder push notification to users who haven't
 * created a shopping list (and thus a meal plan) for the current week.
 *
 * Runs every day at 10:00 AM UTC.
 * - On Monday: initial weekly reminder
 * - Tue-Sun: follow-up reminder only to users who still don't have one
 *
 * Protected by CRON_SECRET Bearer token.
 */
export async function POST(request: Request) {
  try {
    // Rate limit
    const identifier = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, "webhook");
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!CRON_SECRET || token !== CRON_SECRET) {
      console.error("[Cron] Unauthorized meal-plan-reminder attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekStart = getCurrentWeekStart();
    const weekEnd = getCurrentWeekEnd();

    console.warn(
      `[Cron] Meal plan reminder — checking week ${weekStart.toISOString()} to ${weekEnd.toISOString()}`,
    );

    // Get all users who have push subscriptions
    const subscribedUsers = await db
      .select({ userId: pushSubscriptions.userId })
      .from(pushSubscriptions)
      .groupBy(pushSubscriptions.userId);

    if (subscribedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscribed users",
        notified: 0,
        skipped: 0,
      });
    }

    let notified = 0;
    let skipped = 0;

    for (const { userId } of subscribedUsers) {
      // Find user's profile to check their shopping lists
      const profile = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        skipped++;
        continue;
      }

      const profileId = profile[0].id;

      // Get user's language preference from userInfo
      const userInfo = await db
        .select({ language: userInfoTable.language })
        .from(userInfoTable)
        .where(eq(userInfoTable.userProfileId, profileId))
        .limit(1);

      const lang = userInfo[0]?.language ?? "sk";

      // Check if user has a shopping list for the current week
      const currentWeekList = await db
        .select({ id: shoppingLists.id })
        .from(shoppingLists)
        .where(
          and(
            eq(shoppingLists.userProfileId, profileId),
            gte(shoppingLists.weekStartDate, weekStart),
            lte(shoppingLists.weekStartDate, weekEnd),
          ),
        )
        .limit(1);

      if (currentWeekList.length > 0) {
        // User already has a plan this week — skip
        skipped++;
        continue;
      }

      // Send reminder notification in user's language
      try {
        const payload = REMINDER_MESSAGES[lang] ?? REMINDER_MESSAGES.sk;
        await sendPushToUser(userId, payload);
        notified++;
      } catch (error) {
        console.error(
          `[Cron] Failed to send meal plan reminder to user ${userId}:`,
          error,
        );
      }
    }

    console.warn(
      `[Cron] Meal plan reminder complete. Notified: ${notified}, Skipped: ${skipped}`,
    );

    return NextResponse.json({
      success: true,
      message: "Meal plan reminder complete",
      notified,
      skipped,
      totalSubscribed: subscribedUsers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Meal plan reminder error:", error);
    return NextResponse.json(
      { error: "Meal plan reminder failed" },
      { status: 500 },
    );
  }
}
