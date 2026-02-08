// Analytics tracking utility
import { db } from "@/index";
import { analyticsEvents } from "@/db/schema";

export type AnalyticsEventType =
  | "auth"
  | "feature"
  | "subscription"
  | "page_view"
  | "engagement";

export interface TrackEventParams {
  userId?: string | null;
  eventType: AnalyticsEventType;
  eventName: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track an analytics event
 * Can be called from server-side code
 */
export async function trackEvent({
  userId,
  eventType,
  eventName,
  metadata,
}: TrackEventParams): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      userId: userId || null,
      eventType,
      eventName,
      metadata: metadata || null,
    });
  } catch (error) {
    // Don't let analytics errors break the app
    console.error("[Analytics] Failed to track event:", error);
  }
}

/**
 * Helper functions for common events
 */
export const Analytics = {
  // Auth events
  login: (userId: string, metadata?: { provider?: string; locale?: string }) =>
    trackEvent({ userId, eventType: "auth", eventName: "login", metadata }),

  signup: (userId: string, metadata?: { provider?: string; locale?: string }) =>
    trackEvent({ userId, eventType: "auth", eventName: "signup", metadata }),

  logout: (userId: string) =>
    trackEvent({ userId, eventType: "auth", eventName: "logout" }),

  // Feature events
  mealPlanGenerated: (
    userId: string,
    metadata?: { tier?: string; cached?: boolean },
  ) =>
    trackEvent({
      userId,
      eventType: "feature",
      eventName: "meal_plan_generated",
      metadata,
    }),

  shoppingListCreated: (userId: string, metadata?: { source?: string }) =>
    trackEvent({
      userId,
      eventType: "feature",
      eventName: "shopping_list_created",
      metadata,
    }),

  aiRequest: (userId: string, metadata?: { type?: string }) =>
    trackEvent({
      userId,
      eventType: "feature",
      eventName: "ai_request",
      metadata,
    }),

  // Subscription events
  subscriptionUpgrade: (
    userId: string,
    metadata: { from: string; to: string },
  ) =>
    trackEvent({
      userId,
      eventType: "subscription",
      eventName: "upgrade",
      metadata,
    }),

  subscriptionDowngrade: (
    userId: string,
    metadata: { from: string; to: string },
  ) =>
    trackEvent({
      userId,
      eventType: "subscription",
      eventName: "downgrade",
      metadata,
    }),

  subscriptionCancel: (userId: string, metadata?: { tier?: string }) =>
    trackEvent({
      userId,
      eventType: "subscription",
      eventName: "cancel",
      metadata,
    }),

  // Engagement events
  onboardingComplete: (userId: string) =>
    trackEvent({
      userId,
      eventType: "engagement",
      eventName: "onboarding_complete",
    }),

  pushSubscribed: (userId: string) =>
    trackEvent({
      userId,
      eventType: "engagement",
      eventName: "push_subscribed",
    }),
};
