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
  sendPushBatch,
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
    url: "/home",
  },
  en: {
    title: "📋 New week, new meal plan!",
    body: "You don't have a meal plan for this week yet. Let Rivo cook! 🍳",
    url: "/home",
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
export async function GET(request: Request) {
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

    // Fetch all push subscriptions, their user profiles, and language in one go
    const subscribers = await db
      .select({
        id: pushSubscriptions.id,
        subscription: pushSubscriptions.subscription,
        profileId: userProfiles.id,
        language: userInfoTable.language,
      })
      .from(pushSubscriptions)
      .leftJoin(userProfiles, eq(pushSubscriptions.userId, userProfiles.userId))
      .leftJoin(
        userInfoTable,
        eq(userProfiles.id, userInfoTable.userProfileId),
      );

    if (subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscribed users",
        notified: 0,
        skipped: 0,
      });
    }

    // Now, find out which userProfiles DO NOT have a shopping list for the current week.
    // We can do this with a single query of all active shopping lists this week.
    const activeLists = await db
      .select({ profileId: shoppingLists.userProfileId })
      .from(shoppingLists)
      .where(
        and(
          gte(shoppingLists.weekStartDate, weekStart),
          lte(shoppingLists.weekStartDate, weekEnd),
        ),
      );

    const activeProfileIds = new Set(activeLists.map((list) => list.profileId));

    const messages = subscribers
      .filter((sub) => {
        // Skip if no profile (edge case) or if they already have an active list
        if (!sub.profileId) return false;
        if (activeProfileIds.has(sub.profileId)) return false;
        return true;
      })
      .map((sub) => {
        const lang = sub.language ?? "sk";
        const payload = REMINDER_MESSAGES[lang] ?? REMINDER_MESSAGES.sk;
        return {
          id: sub.id,
          subscription: sub.subscription,
          payload,
        };
      });

    if (messages.length === 0) {
      console.warn(
        `[Cron] Meal plan reminder complete. Notified: 0, Skipped: ${subscribers.length}`,
      );
      return NextResponse.json({
        success: true,
        message: "Meal plan reminder complete",
        notified: 0,
        skipped: subscribers.length,
        totalSubscribed: subscribers.length,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await sendPushBatch(messages);
    const skipped = subscribers.length - messages.length;

    console.warn(
      `[Cron] Meal plan reminder complete. Notified: ${result.successful}, Skipped: ${skipped}, Failed: ${result.failed}, Cleaned: ${result.cleaned}`,
    );

    return NextResponse.json({
      success: true,
      message: "Meal plan reminder complete",
      notified: result.successful,
      failed: result.failed,
      skipped,
      cleaned: result.cleaned,
      totalSubscribed: subscribers.length,
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
