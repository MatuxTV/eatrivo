import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

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
const DEFAULT_NEW_USER_WINDOW_DAYS = 30;
const ALLOWED_NEW_USER_WINDOW_DAYS = [7, 14, 30] as const;

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

function normalizeEventName(eventName: string) {
  return eventName.replace(/_/g, " ");
}

function buildFlowStepLabel(source: string, eventName?: string | null) {
  if (source === "registration") {
    return "account created";
  }

  if (source === "chat") {
    return "chat messages sent";
  }

  if (source === "pantry") {
    return "pantry items updated";
  }

  if (source === "recipe") {
    return "custom recipe accepted";
  }

  return eventName ? normalizeEventName(eventName) : "activity";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function resolveCustomRecipeMode(metadata: unknown) {
  const record = asRecord(metadata);
  const rawMode = record?.mode;

  if (rawMode === "pantry" || rawMode === "preferences_only") {
    return rawMode;
  }

  return "unknown" as const;
}

function buildModeSplit(
  rows: Array<{
    mode: string;
    count: number;
  }>,
) {
  const summary = {
    pantry: 0,
    preferencesOnly: 0,
    unknown: 0,
  };

  for (const row of rows) {
    if (row.mode === "pantry") {
      summary.pantry = toInt(row.count);
      continue;
    }

    if (row.mode === "preferences_only") {
      summary.preferencesOnly = toInt(row.count);
      continue;
    }

    summary.unknown += toInt(row.count);
  }

  return summary;
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
    const requestedNewUserWindow = Number(
      req.nextUrl.searchParams.get("newUsersWindowDays") ??
        DEFAULT_NEW_USER_WINDOW_DAYS,
    );
    const newUsersWindowDays = ALLOWED_NEW_USER_WINDOW_DAYS.includes(
      requestedNewUserWindow as (typeof ALLOWED_NEW_USER_WINDOW_DAYS)[number],
    )
      ? requestedNewUserWindow
      : DEFAULT_NEW_USER_WINDOW_DAYS;

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
    const newUserStart = new Date(now);
    newUserStart.setDate(newUserStart.getDate() - newUsersWindowDays);

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
      newUsersRaw,
      customRecipeStartedByModeRows,
      customRecipeGeneratedByModeRows,
      customRecipeFailedByModeRows,
      customRecipeFailureLogRows,
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

      db
        .select({
          userId: userProfiles.userId,
          userProfileId: userProfiles.id,
          fullName: userProfiles.fullName,
          email: users.email,
          membership: users.membership,
          registeredAt: userProfiles.created_at,
        })
        .from(userProfiles)
        .innerJoin(users, eq(userProfiles.userId, users.id))
        .where(gte(userProfiles.created_at, newUserStart))
        .orderBy(desc(userProfiles.created_at)),

      db
        .select({
          mode:
            sql<string>`COALESCE(${analyticsEvents.metadata}->>'mode', 'unknown')`.as(
              "mode",
            ),
          count: count().as("count"),
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "custom_recipe_generation_started"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        )
        .groupBy(sql`COALESCE(${analyticsEvents.metadata}->>'mode', 'unknown')`),

      db
        .select({
          mode:
            sql<string>`COALESCE(${analyticsEvents.metadata}->>'mode', 'unknown')`.as(
              "mode",
            ),
          count: count().as("count"),
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "custom_recipe_generated"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        )
        .groupBy(sql`COALESCE(${analyticsEvents.metadata}->>'mode', 'unknown')`),

      db
        .select({
          mode:
            sql<string>`COALESCE(${analyticsEvents.metadata}->>'mode', 'unknown')`.as(
              "mode",
            ),
          count: count().as("count"),
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.eventName, "custom_recipe_generation_failed"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        )
        .groupBy(sql`COALESCE(${analyticsEvents.metadata}->>'mode', 'unknown')`),

      db
        .select({
          id: analyticsEvents.id,
          createdAt: analyticsEvents.createdAt,
          userId: analyticsEvents.userId,
          userFullName: userProfiles.fullName,
          userEmail: users.email,
          metadata: analyticsEvents.metadata,
        })
        .from(analyticsEvents)
        .leftJoin(userProfiles, eq(analyticsEvents.userId, userProfiles.userId))
        .leftJoin(users, eq(analyticsEvents.userId, users.id))
        .where(
          and(
            eq(analyticsEvents.eventName, "custom_recipe_generation_failed"),
            gte(analyticsEvents.createdAt, rangeStart),
          ),
        )
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(10),
    ]);

    const newUserIds = newUsersRaw.map((user) => user.userId);
    const newUserProfileIds = newUsersRaw.map((user) => user.userProfileId);

    const [
      newUserEventRows,
      newUserChatRows,
      newUserPantryRows,
      newUserRecipeRows,
      newUserRecentEventRows,
    ] = newUserIds.length
      ? await Promise.all([
          db
            .select({
              userId: analyticsEvents.userId,
              eventName: analyticsEvents.eventName,
              eventCount: count().as("eventCount"),
              lastOccurredAt:
                sql<string>`MAX(${analyticsEvents.createdAt})`.as("lastOccurredAt"),
            })
            .from(analyticsEvents)
            .where(
              and(
                inArray(analyticsEvents.userId, newUserIds),
                gte(analyticsEvents.createdAt, newUserStart),
              ),
            )
            .groupBy(analyticsEvents.userId, analyticsEvents.eventName),

          db
            .select({
              userProfileId: chatMessages.userProfileId,
              messageCount: count().as("messageCount"),
              sessionCount:
                sql<number>`COUNT(DISTINCT ${chatMessages.sessionId})::int`.as(
                  "sessionCount",
                ),
              firstMessageAt:
                sql<string>`MIN(${chatMessages.createdAt})`.as("firstMessageAt"),
              lastMessageAt:
                sql<string>`MAX(${chatMessages.createdAt})`.as("lastMessageAt"),
            })
            .from(chatMessages)
            .where(
              and(
                inArray(chatMessages.userProfileId, newUserProfileIds),
                gte(chatMessages.createdAt, newUserStart),
              ),
            )
            .groupBy(chatMessages.userProfileId),

          db
            .select({
              userProfileId: pantryItems.userProfileId,
              itemCount: count().as("itemCount"),
              firstPantryActivityAt:
                sql<string>`MIN(${pantryItems.updatedAt})`.as("firstPantryActivityAt"),
              lastPantryActivityAt:
                sql<string>`MAX(${pantryItems.updatedAt})`.as("lastPantryActivityAt"),
            })
            .from(pantryItems)
            .where(inArray(pantryItems.userProfileId, newUserProfileIds))
            .groupBy(pantryItems.userProfileId),

          db
            .select({
              userId: recipes.createdByUserId,
              customRecipesCount: count().as("customRecipesCount"),
              firstRecipeAt:
                sql<string>`MIN(${recipes.createdAt})`.as("firstRecipeAt"),
              lastRecipeAt:
                sql<string>`MAX(${recipes.createdAt})`.as("lastRecipeAt"),
            })
            .from(recipes)
            .where(
              and(
                eq(recipes.source, "ai_custom"),
                inArray(recipes.createdByUserId, newUserIds),
                gte(recipes.createdAt, newUserStart),
              ),
            )
            .groupBy(recipes.createdByUserId),

          db
            .select({
              userId: analyticsEvents.userId,
              eventName: analyticsEvents.eventName,
              createdAt: analyticsEvents.createdAt,
            })
            .from(analyticsEvents)
            .where(
              and(
                inArray(analyticsEvents.userId, newUserIds),
                gte(analyticsEvents.createdAt, newUserStart),
              ),
            )
            .orderBy(asc(analyticsEvents.createdAt)),
        ])
      : [[], [], [], [], []];

    const newUserEventMap = new Map<
      string,
      {
        totalTrackedEvents: number;
        lastActivityAt: string | null;
        recentActivities: { label: string; occurredAt: string }[];
        flowSteps: {
          id: string;
          label: string;
          occurredAt: string;
          eventName: string | null;
          source: "registration" | "analytics" | "chat" | "pantry" | "recipe";
        }[];
        eventCounts: Record<string, number>;
      }
    >();

    for (const row of newUserEventRows) {
      if (!row.userId) {
        continue;
      }

      const current = newUserEventMap.get(row.userId) ?? {
        totalTrackedEvents: 0,
        lastActivityAt: null,
        recentActivities: [],
        flowSteps: [],
        eventCounts: {},
      };

      const eventCount = toInt(row.eventCount);

      current.totalTrackedEvents += eventCount;
      current.eventCounts[row.eventName] = eventCount;
      if (!current.lastActivityAt || new Date(row.lastOccurredAt) > new Date(current.lastActivityAt)) {
        current.lastActivityAt = row.lastOccurredAt;
      }

      newUserEventMap.set(row.userId, current);
    }

    for (const row of newUserRecentEventRows) {
      if (!row.userId) {
        continue;
      }

      const current = newUserEventMap.get(row.userId) ?? {
        totalTrackedEvents: 0,
        lastActivityAt: null,
        recentActivities: [],
        flowSteps: [],
        eventCounts: {},
      };

      current.flowSteps.push({
        id: `${row.userId}-${row.createdAt.toISOString()}-${row.eventName}`,
        label: buildFlowStepLabel("analytics", row.eventName),
        occurredAt: row.createdAt.toISOString(),
        eventName: row.eventName,
        source: "analytics",
      });

      newUserEventMap.set(row.userId, current);
    }

    const newUserChatMap = new Map(
      newUserChatRows.map((row) => [row.userProfileId, row]),
    );
    const newUserPantryMap = new Map(
      newUserPantryRows.map((row) => [row.userProfileId, row]),
    );
    const newUserRecipeMap = new Map(
      newUserRecipeRows
        .filter(
          (
            row,
          ): row is typeof row & {
            userId: string;
          } => Boolean(row.userId),
        )
        .map((row) => [row.userId, row]),
    );

    const newUsers = newUsersRaw.map((user) => {
      const eventMetrics = newUserEventMap.get(user.userId);
      const chatMetrics = newUserChatMap.get(user.userProfileId);
      const pantryMetrics = newUserPantryMap.get(user.userProfileId);
      const recipeMetrics = newUserRecipeMap.get(user.userId);

      const flowSteps = [
        {
          id: `${user.userId}-registered-${user.registeredAt.toISOString()}`,
          label: buildFlowStepLabel("registration"),
          occurredAt: user.registeredAt.toISOString(),
          eventName: null,
          source: "registration" as const,
        },
        ...(eventMetrics?.flowSteps ?? []),
        ...(chatMetrics?.firstMessageAt
          ? [
              {
                id: `${user.userId}-chat-${new Date(chatMetrics.firstMessageAt).toISOString()}`,
                label: buildFlowStepLabel("chat"),
                occurredAt: new Date(chatMetrics.firstMessageAt).toISOString(),
                eventName: null,
                source: "chat" as const,
              },
            ]
          : []),
        ...(pantryMetrics?.firstPantryActivityAt
          ? [
              {
                id: `${user.userId}-pantry-${new Date(pantryMetrics.firstPantryActivityAt).toISOString()}`,
                label: buildFlowStepLabel("pantry"),
                occurredAt: new Date(pantryMetrics.firstPantryActivityAt).toISOString(),
                eventName: null,
                source: "pantry" as const,
              },
            ]
          : []),
        ...(recipeMetrics?.firstRecipeAt
          ? [
              {
                id: `${user.userId}-recipe-${new Date(recipeMetrics.firstRecipeAt).toISOString()}`,
                label: buildFlowStepLabel("recipe"),
                occurredAt: new Date(recipeMetrics.firstRecipeAt).toISOString(),
                eventName: null,
                source: "recipe" as const,
              },
            ]
          : []),
      ].sort(
        (left, right) =>
          new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
      );

      const recentActivities = flowSteps
        .slice(-5)
        .reverse()
        .map((step) => ({
          label: step.label,
          occurredAt: step.occurredAt,
        }));

      const lastActivityCandidates = [
        eventMetrics?.lastActivityAt ?? null,
        chatMetrics?.lastMessageAt ? new Date(chatMetrics.lastMessageAt).toISOString() : null,
        pantryMetrics?.lastPantryActivityAt
          ? new Date(pantryMetrics.lastPantryActivityAt).toISOString()
          : null,
        recipeMetrics?.lastRecipeAt ? new Date(recipeMetrics.lastRecipeAt).toISOString() : null,
      ].filter((value): value is string => Boolean(value));

      const lastActivityAt =
        lastActivityCandidates.sort((left, right) =>
          new Date(right).getTime() - new Date(left).getTime(),
        )[0] ?? null;

      return {
        userId: user.userId,
        userProfileId: user.userProfileId,
        fullName: user.fullName,
        email: user.email,
        membership: user.membership,
        registeredAt: user.registeredAt.toISOString(),
        lastActivityAt,
        daysSinceRegistration: Math.max(
          0,
          Math.floor(
            (now.getTime() - user.registeredAt.getTime()) / (1000 * 60 * 60 * 24),
          ),
        ),
        activity: {
          totalTrackedEvents: eventMetrics?.totalTrackedEvents ?? 0,
          pantryItems: toInt(pantryMetrics?.itemCount),
          pantryViews: toInt(eventMetrics?.eventCounts.pantry_viewed),
          kitchenCounterAttempts:
            toInt(eventMetrics?.eventCounts.kitchen_counter_completed) +
            toInt(
              eventMetrics?.eventCounts
                .kitchen_counter_completed_with_missing_ingredients,
            ),
          recipeOpens: toInt(eventMetrics?.eventCounts.recipe_opened),
          customRecipesAccepted: toInt(recipeMetrics?.customRecipesCount),
          chatSessions: toInt(chatMetrics?.sessionCount),
          chatMessages: toInt(chatMetrics?.messageCount),
        },
        recentActivities,
        flowSteps,
      };
    });

    const newUsersWithActivity = newUsers.filter(
      (user) =>
        user.activity.totalTrackedEvents > 0 ||
        user.activity.chatMessages > 0 ||
        user.activity.pantryItems > 0 ||
        user.activity.customRecipesAccepted > 0,
    );

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

    const customRecipeModeSplit = {
      started: buildModeSplit(
        customRecipeStartedByModeRows.map((row) => ({
          mode: row.mode,
          count: toInt(row.count),
        })),
      ),
      generated: buildModeSplit(
        customRecipeGeneratedByModeRows.map((row) => ({
          mode: row.mode,
          count: toInt(row.count),
        })),
      ),
      failed: buildModeSplit(
        customRecipeFailedByModeRows.map((row) => ({
          mode: row.mode,
          count: toInt(row.count),
        })),
      ),
    };

    const customRecipeFailureLogs = customRecipeFailureLogRows.map((row) => {
      const metadata = asRecord(row.metadata);

      return {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        userId: row.userId,
        userFullName: row.userFullName,
        userEmail: row.userEmail,
        mode: resolveCustomRecipeMode(metadata),
        usesPantry: metadata?.usesPantry === true,
        code:
          typeof metadata?.code === "string" ? metadata.code : "GENERATION_FAILED",
        node: typeof metadata?.node === "string" ? metadata.node : null,
        reason:
          typeof metadata?.reason === "string"
            ? metadata.reason
            : "Custom recipe generation failed",
        log: metadata?.errorLog ?? metadata,
      };
    });

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
      newUsers: {
        windowDays: newUsersWindowDays,
        total: newUsers.length,
        active: newUsersWithActivity.length,
        inactive: newUsers.length - newUsersWithActivity.length,
        users: newUsers,
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
          modeSplit: customRecipeModeSplit,
          failureLogs: customRecipeFailureLogs,
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