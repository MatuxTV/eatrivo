import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminAuth, isAuthError } from "@/lib/adminAuth";
import {
  sendPushBatch,
  type PushNotificationPayload,
} from "@/lib/pwa/sendPushToAll";
import { db } from "@/index";
import {
  pushSubscriptions,
  userProfiles,
  userInfoTable,
  shoppingLists,
} from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

const MOTIVATIONAL_MESSAGES: Record<string, PushNotificationPayload[]> = {
  sk: [
    {
      title: "🍽️ Ako vyzerá tvoj dnešný jedálniček?",
      body: "Pozri sa na svoje jedlá a naplánuj si deň plný energie!",
      url: "/home",
    },
    {
      title: "💪 Nezabudni na svoje ciele!",
      body: "Sleduj svoj pokrok a drž sa plánu. Rivo ti pomôže!",
      url: "/home",
    },
    {
      title: "🥗 Čas na zdravý návyk!",
      body: "Otvor Eatrivo a pozri si svoje jedlá na dnes.",
      url: "/home",
    },
    {
      title: "📊 Kontrola výživy",
      body: "Ako sa ti darí s kalorickým príjmom? Skontroluj si to!",
      url: "/home",
    },
    {
      title: "🔥 Pokračuj v skvelej práci!",
      body: "Každý deň sa počíta. Otvor si Eatrivo a naplánuj si jedlá.",
      url: "/home",
    },
    {
      title: "🍎 Tvoje telo ti poďakuje!",
      body: "Sledovanie stravy je kľúč k úspechu. Pokračuj!",
      url: "/home",
    },
  ],
  en: [
    {
      title: "🍽️ What does your menu look like today?",
      body: "Check your meals and plan a day full of energy!",
      url: "/home",
    },
    {
      title: "💪 Don't forget your goals!",
      body: "Track your progress and stick to the plan. Rivo will help!",
      url: "/home",
    },
    {
      title: "🥗 Time for a healthy habit!",
      body: "Open Eatrivo and check your meals for today.",
      url: "/home",
    },
    {
      title: "📊 Nutrition check",
      body: "How's your calorie intake going? Check it out!",
      url: "/home",
    },
    {
      title: "🔥 Keep up the great work!",
      body: "Every day counts. Open Eatrivo and plan your meals.",
      url: "/home",
    },
    {
      title: "🍎 Your body will thank you!",
      body: "Tracking your diet is the key to success. Keep going!",
      url: "/home",
    },
  ],
};

const MEAL_PLAN_MESSAGES: Record<string, PushNotificationPayload> = {
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

function getCurrentWeekBounds(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

function pickMotivational(lang: string): PushNotificationPayload {
  const messages = MOTIVATIONAL_MESSAGES[lang] ?? MOTIVATIONAL_MESSAGES.sk;
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return messages[dayOfYear % messages.length];
}



/**
 * POST /api/admin/notifications/broadcast
 * body: { type: "motivational" | "meal-reminder" }
 *
 * "motivational"   — sends a motivational push to ALL subscribed users
 * "meal-reminder"  — sends to users missing a shopping list this week only
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;

    const rl = await checkRateLimit(
      `admin:${authResult.session.user.id}`,
      "standard",
    );
    if (!rl.success) return rl.response!;

    const body = await request.json();
    const { type } = body as { type: "motivational" | "meal-reminder" };

    if (!type || !["motivational", "meal-reminder"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use 'motivational' or 'meal-reminder'" },
        { status: 400 },
      );
    }

    // ── Motivational: send to all ──────────────────────────────────────────
    if (type === "motivational") {
      const subscribers = await db
        .select({
          id: pushSubscriptions.id,
          subscription: pushSubscriptions.subscription,
          language: userInfoTable.language,
        })
        .from(pushSubscriptions)
        .leftJoin(
          userProfiles,
          eq(pushSubscriptions.userId, userProfiles.userId),
        )
        .leftJoin(
          userInfoTable,
          eq(userProfiles.id, userInfoTable.userProfileId),
        );

      const messages = subscribers.map((sub) => {
        const lang = sub.language ?? "sk";
        const payload = pickMotivational(lang);
        return {
          id: sub.id,
          subscription: sub.subscription,
          payload,
        };
      });

      const result = await sendPushBatch(messages);

      return NextResponse.json({
        success: true,
        type,
        totalUsers: result.totalSubscriptions,
        successful: result.successful,
        failed: result.failed,
        cleaned: result.cleaned,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Meal reminder: only users missing this week's plan ─────────────────
    const { weekStart, weekEnd } = getCurrentWeekBounds();

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
      .filter((sub) => sub.profileId && !activeProfileIds.has(sub.profileId))
      .map((sub) => {
        const lang = sub.language ?? "sk";
        const payload = MEAL_PLAN_MESSAGES[lang] ?? MEAL_PLAN_MESSAGES.sk;
        return {
          id: sub.id,
          subscription: sub.subscription,
          payload,
        };
      });

    const result = await sendPushBatch(messages);
    const skipped = subscribers.length - messages.length;

    return NextResponse.json({
      success: true,
      type,
      totalSubscribed: subscribers.length,
      notified: result.successful,
      failed: result.failed,
      skipped,
      cleaned: result.cleaned,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin] Broadcast error:", error);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
