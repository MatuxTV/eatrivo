import {
  getAnalyticsEventDefinition,
  type AnalyticsEventName,
} from "@/lib/analytics-events";
import { captureServerAnalyticsEvent } from "@/lib/analytics-server";
import type {
  AnalyticsEventType,
  TrackEventParams as BaseTrackEventParams,
} from "@/lib/analytics-types";

export type TrackEventParams = BaseTrackEventParams<AnalyticsEventName>;

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
  const definition = getAnalyticsEventDefinition(eventName);
  if (eventType && eventType !== definition.eventType) {
    console.warn("[Analytics] Ignoring mismatched eventType for event:", {
      eventName,
      provided: eventType,
      expected: definition.eventType,
    });
  }

  await captureServerAnalyticsEvent({ userId, eventName, metadata });
}

/**
 * Helper functions for common events
 */
export const Analytics = {
  // Auth events
  login: (userId: string, metadata?: { provider?: string; locale?: string }) =>
    trackEvent({ userId, eventName: "account_logged_in", metadata }),

  signup: (userId: string, metadata?: { provider?: string; locale?: string }) =>
    trackEvent({ userId, eventName: "account_signed_up", metadata }),

  logout: (userId: string) =>
    trackEvent({ userId, eventName: "account_logged_out" }),

  // Feature events
  mealPlanGenerated: (
    userId: string,
    metadata?: { tier?: string; cached?: boolean },
  ) =>
    trackEvent({
      userId,
      eventName: "meal_plan_generated",
      metadata,
    }),

  shoppingListCreated: (userId: string, metadata?: { source?: string }) =>
    trackEvent({
      userId,
      eventName: "shopping_list_created",
      metadata,
    }),

  aiRequest: (userId: string, metadata?: { type?: string }) =>
    trackEvent({
      userId,
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
      eventName: "subscription_upgraded",
      metadata,
    }),

  subscriptionDowngrade: (
    userId: string,
    metadata: { from: string; to: string },
  ) =>
    trackEvent({
      userId,
      eventName: "subscription_downgraded",
      metadata,
    }),

  subscriptionCancel: (userId: string, metadata?: { tier?: string }) =>
    trackEvent({
      userId,
      eventName: "subscription_cancelled",
      metadata,
    }),

  // Engagement events
  onboardingComplete: (userId: string) =>
    trackEvent({
      userId,
      eventName: "onboarding_completed",
    }),

  pushSubscribed: (userId: string) =>
    trackEvent({
      userId,
      eventName: "push_subscribed",
    }),
};
