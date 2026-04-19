import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import {
  analyticsEvents,
  chatMessages,
  pantryItems,
  pantryRestockItems,
  recipes,
  userProfiles,
  users,
} from "@/db/schema";
import { db } from "@/index";
import { activeAdminAnalyticsEventNames } from "@/lib/analytics/analytics-events";
import { isAuthError, requireAdminAuth } from "@/lib/auth/adminAuth";
import { getAdminPostHogTelemetry } from "@/lib/posthog-admin";

const DEFAULT_RANGE_DAYS = 30;
const ALLOWED_RANGE_DAYS = [7, 30, 90] as const;

type DeltaDirection = "up" | "down" | "flat";
type AttentionSeverity = "info" | "warning" | "critical";

function toInt(value: unknown) {
  return Number(value ?? 0);
}

function percentage(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

function buildDelta(current: number, previous: number) {
  const change = current - previous;
  const percentChange =
    previous === 0 ? (current === 0 ? 0 : null) : Number(((change / previous) * 100).toFixed(1));

  return {
    current,
    previous,
    change,
    percentChange,
    direction: change === 0 ? "flat" : change > 0 ? "up" : "down",
  } satisfies {
    current: number;
    previous: number;
    change: number;
    percentChange: number | null;
    direction: DeltaDirection;
  };
}

function formatDeltaLabel(metric: ReturnType<typeof buildDelta>) {
  if (metric.percentChange === null) {
    return metric.current > 0 ? "new activity" : "no change";
  }

  if (metric.percentChange === 0) {
    return "0.0% vs previous";
  }

  const prefix = metric.percentChange > 0 ? "+" : "";
  return `${prefix}${metric.percentChange}% vs previous`;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminAuth(["admin"]);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const requestedRange = Number(
      req.nextUrl.searchParams.get("rangeDays") ?? DEFAULT_RANGE_DAYS,
    );
    const rangeDays = ALLOWED_RANGE_DAYS.includes(
      requestedRange as (typeof ALLOWED_RANGE_DAYS)[number],
    )
      ? requestedRange
      : DEFAULT_RANGE_DAYS;

    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - rangeDays);

    const previousRangeEnd = new Date(rangeStart);
    const previousRangeStart = new Date(rangeStart);
    previousRangeStart.setDate(previousRangeStart.getDate() - rangeDays);

    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(currentWeekStart);
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const [
      totalUsersResult,
      pantryUsersResult,
      pantryItemsTotalResult,
      activeRestockRulesResult,
      pantryViewedCurrentResult,
      pantryViewedPreviousResult,
      kitchenCounterViewedCurrentResult,
      kitchenCounterCompletedCurrentResult,
      kitchenCounterCompletedPreviousResult,
      kitchenCounterCompletedMissingCurrentResult,
      kitchenCounterCompletedMissingPreviousResult,
      recipeOpenedCurrentResult,
      customRecipeStartedCurrentResult,
      customRecipeGeneratedCurrentResult,
      customRecipeFailedCurrentResult,
      customRecipesAcceptedCurrentResult,
      customRecipesAcceptedPreviousResult,
      customRecipeResultOpenedCurrentResult,
      customRecipeFallbackOpenedCurrentResult,
      chatMessagesCurrentResult,
      chatSessionsCurrentResult,
      chatSessionsPreviousResult,
      chatUsersCurrentResult,
      chatLimitHitsCurrentResult,
      currentWeekPantryViewedResult,
      previousWeekPantryViewedResult,
      currentWeekKitchenAttemptsResult,
      previousWeekKitchenAttemptsResult,
      currentWeekChatSessionsResult,
      previousWeekChatSessionsResult,
      currentWeekCustomAcceptedResult,
      previousWeekCustomAcceptedResult,
      currentWeekRecipeOpensResult,
      previousWeekRecipeOpensResult,
      dailyActiveUsers,
      dailyChatMessages,
      recentEvents,
      recentChatSessions,
      posthogTelemetry,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),

      db
        .select({
          count: sql<number>`COUNT(DISTINCT ${pantryItems.userProfileId})::int`,
        })
        .from(pantryItems),

      db.select({ count: count() }).from(pantryItems),

      db
        .select({ count: count() })
        .from(pantryRestockItems)
        .where(eq(pantryRestockItems.isActive, true)),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "pantry_viewed"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "pantry_viewed"),
            gte(analyticsEvents.createdAt, previousRangeStart),
            lt(analyticsEvents.createdAt, previousRangeEnd),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "kitchen_counter_viewed"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "kitchen_counter_completed"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "kitchen_counter_completed"),
            gte(analyticsEvents.createdAt, previousRangeStart),
            lt(analyticsEvents.createdAt, previousRangeEnd),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(
              analyticsEvents.eventName,
              "kitchen_counter_completed_with_missing_ingredients",
            ),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(
              analyticsEvents.eventName,
              "kitchen_counter_completed_with_missing_ingredients",
            ),
            gte(analyticsEvents.createdAt, previousRangeStart),
            lt(analyticsEvents.createdAt, previousRangeEnd),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "recipe_opened"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "custom_recipe_generation_started"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "custom_recipe_generated"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "custom_recipe_generation_failed"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(recipes)
        .where(
          and(eq(recipes.source, "ai_custom"), gte(recipes.createdAt, rangeStart)),
        ),

      db
        .select({ count: count() })
        .from(recipes)
        .where(
          and(
            eq(recipes.source, "ai_custom"),
            gte(recipes.createdAt, previousRangeStart),
            lt(recipes.createdAt, previousRangeEnd),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "custom_recipe_result_opened"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "custom_recipe_fallback_opened"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
          .from(chatMessages)
        .where(
          gte(chatMessages.createdAt, rangeStart),
        ),

      db
        .select({
          count:
            sql<number>`COUNT(DISTINCT ${chatMessages.sessionId})::int`.as(
              "count",
            ),
        })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, rangeStart)),

      db
        .select({
          count:
            sql<number>`COUNT(DISTINCT ${chatMessages.sessionId})::int`.as(
              "count",
            ),
        })
        .from(chatMessages)
        .where(
          and(
            gte(chatMessages.createdAt, previousRangeStart),
            lt(chatMessages.createdAt, previousRangeEnd),
          ),
        ),

      db
        .select({
          count:
            sql<number>`COUNT(DISTINCT ${chatMessages.userProfileId})::int`.as(
              "count",
            ),
        })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, rangeStart)),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "chat_limit_reached"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "pantry_viewed"),
            gte(analyticsEvents.createdAt, currentWeekStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "pantry_viewed"),
            gte(analyticsEvents.createdAt, previousWeekStart),
            lt(analyticsEvents.createdAt, previousWeekEnd),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            inArray(analyticsEvents.eventName, [
              "kitchen_counter_completed",
              "kitchen_counter_completed_with_missing_ingredients",
            ]),
            gte(analyticsEvents.createdAt, currentWeekStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            inArray(analyticsEvents.eventName, [
              "kitchen_counter_completed",
              "kitchen_counter_completed_with_missing_ingredients",
            ]),
            gte(analyticsEvents.createdAt, previousWeekStart),
            lt(analyticsEvents.createdAt, previousWeekEnd),
          ),
        ),

      db
        .select({
          count:
            sql<number>`COUNT(DISTINCT ${chatMessages.sessionId})::int`.as(
              "count",
            ),
        })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, currentWeekStart)),

      db
        .select({
          count:
            sql<number>`COUNT(DISTINCT ${chatMessages.sessionId})::int`.as(
              "count",
            ),
        })
        .from(chatMessages)
        .where(
          and(
            gte(chatMessages.createdAt, previousWeekStart),
            lt(chatMessages.createdAt, previousWeekEnd),
          ),
        ),

      db
        .select({ count: count() })
        .from(recipes)
        .where(
          and(eq(recipes.source, "ai_custom"), gte(recipes.createdAt, currentWeekStart)),
        ),

      db
        .select({ count: count() })
        .from(recipes)
        .where(
          and(
            eq(recipes.source, "ai_custom"),
            gte(recipes.createdAt, previousWeekStart),
            lt(recipes.createdAt, previousWeekEnd),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "recipe_opened"),
            gte(analyticsEvents.createdAt, currentWeekStart),
          ),
        ),

      db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "recipe_opened"),
            gte(analyticsEvents.createdAt, previousWeekStart),
            lt(analyticsEvents.createdAt, previousWeekEnd),
          ),
        ),

      db
        .select({
          date: sql<string>`DATE(${analyticsEvents.createdAt})`.as("date"),
          count: sql<number>`COUNT(DISTINCT ${analyticsEvents.userId})::int`.as(
            "count",
          ),
        })
        .from(analyticsEvents)
        .where(
          and(
            gte(analyticsEvents.createdAt, rangeStart),
            inArray(analyticsEvents.eventName, activeAdminAnalyticsEventNames),
          ),
        )
        .groupBy(sql`DATE(${analyticsEvents.createdAt})`)
        .orderBy(sql`DATE(${analyticsEvents.createdAt})`),

      db
        .select({
          date: sql<string>`DATE(${chatMessages.createdAt})`.as("date"),
          messageCount: count().as("messageCount"),
          sessionCount:
            sql<number>`COUNT(DISTINCT ${chatMessages.sessionId})::int`.as(
              "sessionCount",
            ),
          uniqueUsers:
            sql<number>`COUNT(DISTINCT ${chatMessages.userProfileId})::int`.as(
              "uniqueUsers",
            ),
        })
        .from(chatMessages)
        .where(gte(chatMessages.createdAt, rangeStart))
        .groupBy(sql`DATE(${chatMessages.createdAt})`)
        .orderBy(sql`DATE(${chatMessages.createdAt})`),

      db
        .select({
          id: analyticsEvents.id,
          eventType: analyticsEvents.eventType,
          eventName: analyticsEvents.eventName,
          metadata: analyticsEvents.metadata,
          createdAt: analyticsEvents.createdAt,
          userId: analyticsEvents.userId,
          userFullName: userProfiles.fullName,
        })
        .from(analyticsEvents)
        .leftJoin(userProfiles, eq(analyticsEvents.userId, userProfiles.userId))
        .where(
          and(
            inArray(analyticsEvents.eventName, activeAdminAnalyticsEventNames),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        )
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(20),

      db
        .select({
          sessionId: chatMessages.sessionId,
          userProfileId: chatMessages.userProfileId,
          fullName: userProfiles.fullName,
          messageCount: count().as("messageCount"),
          firstMessage:
            sql<string>`MIN(CASE WHEN ${chatMessages.role} = 'user' THEN ${chatMessages.content} END)`.as(
              "firstMessage",
            ),
          startedAt: sql<string>`MIN(${chatMessages.createdAt})`.as("startedAt"),
        })
        .from(chatMessages)
        .leftJoin(userProfiles, eq(chatMessages.userProfileId, userProfiles.id))
        .where(gte(chatMessages.createdAt, rangeStart))
        .groupBy(
          chatMessages.sessionId,
          chatMessages.userProfileId,
          userProfiles.fullName,
        )
        .orderBy(desc(sql`MIN(${chatMessages.createdAt})`))
        .limit(10),

      getAdminPostHogTelemetry(rangeDays),
    ]);

    const totalUsers = toInt(totalUsersResult[0]?.count);
    const pantryUsers = toInt(pantryUsersResult[0]?.count);
    const pantryItemsTotal = toInt(pantryItemsTotalResult[0]?.count);
    const activeRestockRules = toInt(activeRestockRulesResult[0]?.count);

    const pantryViewed = toInt(pantryViewedCurrentResult[0]?.count);
    const pantryViewedPrevious = toInt(pantryViewedPreviousResult[0]?.count);
    const kitchenCounterViewed = toInt(kitchenCounterViewedCurrentResult[0]?.count);
    const kitchenCounterCompleted = toInt(
      kitchenCounterCompletedCurrentResult[0]?.count,
    );
    const kitchenCounterCompletedPrevious = toInt(
      kitchenCounterCompletedPreviousResult[0]?.count,
    );
    const kitchenCounterCompletedMissing = toInt(
      kitchenCounterCompletedMissingCurrentResult[0]?.count,
    );
    const kitchenCounterCompletedMissingPrevious = toInt(
      kitchenCounterCompletedMissingPreviousResult[0]?.count,
    );
    const kitchenCounterAttempts =
      kitchenCounterCompleted + kitchenCounterCompletedMissing;
    const kitchenCounterAttemptsPrevious =
      kitchenCounterCompletedPrevious + kitchenCounterCompletedMissingPrevious;

    const recipeOpened = toInt(recipeOpenedCurrentResult[0]?.count);

    const customRecipeStarted = toInt(customRecipeStartedCurrentResult[0]?.count);
    const customRecipeGenerated = toInt(
      customRecipeGeneratedCurrentResult[0]?.count,
    );
    const customRecipeFailed = toInt(customRecipeFailedCurrentResult[0]?.count);
    const customRecipesAccepted = toInt(
      customRecipesAcceptedCurrentResult[0]?.count,
    );
    const customRecipesAcceptedPrevious = toInt(
      customRecipesAcceptedPreviousResult[0]?.count,
    );
    const customRecipeResultOpened = toInt(
      customRecipeResultOpenedCurrentResult[0]?.count,
    );
    const customRecipeFallbackOpened = toInt(
      customRecipeFallbackOpenedCurrentResult[0]?.count,
    );

    const totalMessages = toInt(chatMessagesCurrentResult[0]?.count);
    const totalSessions = toInt(chatSessionsCurrentResult[0]?.count);
    const totalSessionsPrevious = toInt(chatSessionsPreviousResult[0]?.count);
    const chatUsers = toInt(chatUsersCurrentResult[0]?.count);
    const chatLimitHits = toInt(chatLimitHitsCurrentResult[0]?.count);

    const comparisons = {
      pantryViews: buildDelta(pantryViewed, pantryViewedPrevious),
      kitchenCounterAttempts: buildDelta(
        kitchenCounterAttempts,
        kitchenCounterAttemptsPrevious,
      ),
      chatSessions: buildDelta(totalSessions, totalSessionsPrevious),
      customRecipesAccepted: buildDelta(
        customRecipesAccepted,
        customRecipesAcceptedPrevious,
      ),
    };

    const quality = {
      kitchenCounterMissingRate: percentage(
        kitchenCounterCompletedMissing,
        kitchenCounterAttempts,
      ),
      customRecipeFailureRate: percentage(
        customRecipeFailed,
        customRecipeStarted,
      ),
      customRecipeFallbackShare: percentage(
        customRecipeFallbackOpened,
        customRecipeResultOpened + customRecipeFallbackOpened,
      ),
      chatLimitHitRate: percentage(chatLimitHits, totalSessions),
    };

    const currentWeek = {
      pantryViews: toInt(currentWeekPantryViewedResult[0]?.count),
      kitchenCounterAttempts: toInt(currentWeekKitchenAttemptsResult[0]?.count),
      chatSessions: toInt(currentWeekChatSessionsResult[0]?.count),
      customRecipesAccepted: toInt(currentWeekCustomAcceptedResult[0]?.count),
      recipeOpens: toInt(currentWeekRecipeOpensResult[0]?.count),
    };

    const previousWeek = {
      pantryViews: toInt(previousWeekPantryViewedResult[0]?.count),
      kitchenCounterAttempts: toInt(previousWeekKitchenAttemptsResult[0]?.count),
      chatSessions: toInt(previousWeekChatSessionsResult[0]?.count),
      customRecipesAccepted: toInt(previousWeekCustomAcceptedResult[0]?.count),
      recipeOpens: toInt(previousWeekRecipeOpensResult[0]?.count),
    };

    const weeklyDeltaCandidates = [
      {
        label: "Pantry views",
        metric: buildDelta(currentWeek.pantryViews, previousWeek.pantryViews),
      },
      {
        label: "Kitchen counter attempts",
        metric: buildDelta(
          currentWeek.kitchenCounterAttempts,
          previousWeek.kitchenCounterAttempts,
        ),
      },
      {
        label: "Chat sessions",
        metric: buildDelta(currentWeek.chatSessions, previousWeek.chatSessions),
      },
      {
        label: "Custom recipes accepted",
        metric: buildDelta(
          currentWeek.customRecipesAccepted,
          previousWeek.customRecipesAccepted,
        ),
      },
      {
        label: "Recipe opens",
        metric: buildDelta(currentWeek.recipeOpens, previousWeek.recipeOpens),
      },
    ];

    const mostUsedSurface = Object.entries(currentWeek).reduce(
      (best, [key, value]) => (value > best.value ? { key, value } : best),
      { key: "pantryViews", value: currentWeek.pantryViews },
    );

    const topImprovingMetric = [...weeklyDeltaCandidates].sort(
      (left, right) => right.metric.change - left.metric.change,
    )[0];
    const topDegradingMetric = [...weeklyDeltaCandidates].sort(
      (left, right) => left.metric.change - right.metric.change,
    )[0];

    const attentionItems: {
      severity: AttentionSeverity;
      title: string;
      description: string;
    }[] = [];

    if (quality.customRecipeFailureRate >= 20) {
      attentionItems.push({
        severity: "critical",
        title: "Custom recipe failure rate is high",
        description:
          `Aktuálne zlyháva ${quality.customRecipeFailureRate}% custom recipe štartov, čo je nad sledovaným prahom.`,
      });
    }

    if (quality.kitchenCounterMissingRate >= 25) {
      attentionItems.push({
        severity: "warning",
        title: "Kitchen counter often finishes with missing ingredients",
        description:
          `${quality.kitchenCounterMissingRate}% kitchen counter dokončení prebehlo s missing ingredients, čo môže znamenať slabší pantry match.`,
      });
    }

    if (quality.chatLimitHitRate >= 10) {
      attentionItems.push({
        severity: "warning",
        title: "Chat limit hits are noticeable",
        description:
          `${quality.chatLimitHitRate}% chat session končí limit hitom, čo môže brzdiť pokračovanie v konverzácii.`,
      });
    }

    if (
      comparisons.chatSessions.direction === "down" &&
      (comparisons.chatSessions.percentChange ?? 0) <= -20
    ) {
      attentionItems.push({
        severity: "info",
        title: "Chat sessions dropped vs previous period",
        description:
          `Chat sessions sú nižšie o ${Math.abs(comparisons.chatSessions.percentChange ?? 0)}% oproti predchádzajúcemu obdobiu.`,
      });
    }

    if (
      comparisons.pantryViews.direction === "down" &&
      (comparisons.pantryViews.percentChange ?? 0) <= -20
    ) {
      attentionItems.push({
        severity: "info",
        title: "Pantry traffic is slowing down",
        description:
          `Pantry views klesli o ${Math.abs(comparisons.pantryViews.percentChange ?? 0)}% oproti predchádzajúcemu obdobiu.`,
      });
    }

    if (attentionItems.length === 0) {
      attentionItems.push({
        severity: "info",
        title: "No urgent issues detected",
        description:
          "Aktívne surface metriky sú v bežných hraniciach a momentálne nevyžadujú okamžitý zásah.",
      });
    }

    return NextResponse.json({
      generatedAt: now.toISOString(),
      rangeDays,
      summary: {
        totalUsers,
        pantryUsers,
        kitchenCounterAttempts30d: kitchenCounterAttempts,
        chatSessions30d: totalSessions,
        customRecipesAccepted30d: customRecipesAccepted,
      },
      comparisons,
      attention: attentionItems,
      weeklySnapshot: {
        currentWeek,
        previousWeek,
        highlights: [
          {
            label: "Most used surface this week",
            value: mostUsedSurface.key,
            note: `Najvyšší weekly usage má metrika s hodnotou ${mostUsedSurface.value}.`,
          },
          {
            label: "Top improving metric",
            value: `${topImprovingMetric.label} (${formatDeltaLabel(topImprovingMetric.metric)})`,
            note: "Pomáha rýchlo nájsť, čo sa zlepšuje oproti predchádzajúcemu týždňu.",
          },
          {
            label: "Top degrading metric",
            value: `${topDegradingMetric.label} (${formatDeltaLabel(topDegradingMetric.metric)})`,
            note: "Toto je najväčší týždenný pokles, ktorý sa oplatí skontrolovať.",
          },
        ],
      },
      product: {
        source: "active-surfaces",
        pantry: {
          usersWithItems: pantryUsers,
          totalItems: pantryItemsTotal,
          activeRestockRules,
          viewed30d: pantryViewed,
          userPenetrationRate: percentage(pantryUsers, totalUsers),
        },
        kitchenCounter: {
          viewed30d: kitchenCounterViewed,
          completed30d: kitchenCounterCompleted,
          completedWithMissingIngredients30d: kitchenCounterCompletedMissing,
          completionRate: percentage(kitchenCounterAttempts, kitchenCounterViewed),
        },
        recipes: {
          opened30d: recipeOpened,
        },
        customRecipes: {
          started30d: customRecipeStarted,
          generated30d: customRecipeGenerated,
          failed30d: customRecipeFailed,
          accepted30d: customRecipesAccepted,
          resultOpens30d: customRecipeResultOpened,
          fallbackOpens30d: customRecipeFallbackOpened,
        },
        chat: {
          totalMessages30d: totalMessages,
          totalSessions30d: totalSessions,
          uniqueUsers30d: chatUsers,
          avgMessagesPerSession:
            totalSessions > 0
              ? Number((totalMessages / totalSessions).toFixed(1))
              : 0,
          limitHits30d: chatLimitHits,
        },
        quality,
        posthog: posthogTelemetry,
        coverageNotes: [
          {
            title: "Admin scope",
            source: "active-only",
            description:
              "Dashboard teraz zobrazuje len aktivne surfaces: pantry, kitchen counter, chat with Rivo, recipe opens a custom recipe creation.",
          },
          {
            title: "PostHog bridge",
            source: posthogTelemetry.source,
            description: posthogTelemetry.message,
          },
        ],
      },
      trends: {
        dailyActiveUsers,
        dailyChatMessages,
      },
      ops: {
        recentEvents,
        recentChatSessions,
      },
    }, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[Admin Analytics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}