import { NextResponse } from "next/server";
import { db } from "@/index";
import { pushSubscriptions, userProfiles, userInfoTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  sendPushToUser,
  type PushNotificationPayload,
} from "@/lib/pwa/sendPushToAll";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

const CRON_SECRET = process.env.CRON_SECRET;

// Motivational / engagement notification messages (rotated), per language
const NOTIFICATION_MESSAGES: Record<string, PushNotificationPayload[]> = {
  sk: [
    {
      title: "🍽️ Ako vyzerá tvoj dnešný jedálniček?",
      body: "Pozri sa na svoje jedlá a naplánuj si deň plný energie!",
      url: "/dashboard",
    },
    {
      title: "💪 Nezabudni na svoje ciele!",
      body: "Sleduj svoj pokrok a drž sa plánu. Rivo ti pomôže!",
      url: "/dashboard",
    },
    {
      title: "🥗 Čas na zdravý návyk!",
      body: "Otvor Eatrivo a pozri si svoje jedlá na dnes.",
      url: "/dashboard",
    },
    {
      title: "📊 Kontrola výživy",
      body: "Ako sa ti darí s kalorickým príjmom? Skontroluj si to!",
      url: "/dashboard",
    },
    {
      title: "🔥 Pokračuj v skvelej práci!",
      body: "Každý deň sa počíta. Otvor si Eatrivo a naplánuj si jedlá.",
      url: "/dashboard",
    },
    {
      title: "🍎 Tvoje telo ti poďakuje!",
      body: "Sledovanie stravy je kľúč k úspechu. Pokračuj!",
      url: "/dashboard",
    },
  ],
  en: [
    {
      title: "🍽️ What does your menu look like today?",
      body: "Check your meals and plan a day full of energy!",
      url: "/dashboard",
    },
    {
      title: "💪 Don't forget your goals!",
      body: "Track your progress and stick to the plan. Rivo will help!",
      url: "/dashboard",
    },
    {
      title: "🥗 Time for a healthy habit!",
      body: "Open Eatrivo and check your meals for today.",
      url: "/dashboard",
    },
    {
      title: "📊 Nutrition check",
      body: "How's your calorie intake going? Check it out!",
      url: "/dashboard",
    },
    {
      title: "🔥 Keep up the great work!",
      body: "Every day counts. Open Eatrivo and plan your meals.",
      url: "/dashboard",
    },
    {
      title: "🍎 Your body will thank you!",
      body: "Tracking your diet is the key to success. Keep going!",
      url: "/dashboard",
    },
  ],
};

/**
 * Picks a message based on the current date and user language so users get varied content.
 */
function pickMessage(lang: string): PushNotificationPayload {
  const messages = NOTIFICATION_MESSAGES[lang] ?? NOTIFICATION_MESSAGES.sk;
  // Use day-of-year to rotate messages
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % messages.length;
  return messages[index];
}

/**
 * Cron endpoint: sends a motivational push notification to all subscribed users.
 *
 * Vercel cron calls this every 2 days.
 * Protected by CRON_SECRET Bearer token.
 */
export async function POST(request: Request) {
  try {
    // Rate limit to protect against brute-force
    const identifier = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, "webhook");
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!CRON_SECRET || token !== CRON_SECRET) {
      console.error("[Cron] Unauthorized notify-users attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.warn("[Cron] Starting push notification broadcast...");

    // Get all users with push subscriptions
    const subscribedUsers = await db
      .select({ userId: pushSubscriptions.userId })
      .from(pushSubscriptions)
      .groupBy(pushSubscriptions.userId);

    let totalSent = 0;
    let totalFailed = 0;

    for (const { userId } of subscribedUsers) {
      // Get user's language preference via profile → userInfo
      const profile = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      let lang = "sk";
      if (profile[0]) {
        const userInfo = await db
          .select({ language: userInfoTable.language })
          .from(userInfoTable)
          .where(eq(userInfoTable.userProfileId, profile[0].id))
          .limit(1);
        lang = userInfo[0]?.language ?? "sk";
      }
      const payload = pickMessage(lang);

      try {
        const result = await sendPushToUser(userId, payload);
        totalSent += result.successful;
        totalFailed += result.failed;
      } catch (error) {
        console.error(`[Cron] Failed to notify user ${userId}:`, error);
        totalFailed++;
      }
    }

    console.warn(
      `[Cron] Push broadcast complete. Sent: ${totalSent}, Failed: ${totalFailed}`,
    );

    return NextResponse.json({
      success: true,
      message: `Push broadcast complete`,
      totalUsers: subscribedUsers.length,
      successful: totalSent,
      failed: totalFailed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Push notification broadcast error:", error);
    return NextResponse.json(
      { error: "Notification broadcast failed" },
      { status: 500 },
    );
  }
}
