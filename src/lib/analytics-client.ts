import {
  getAnalyticsEventDefinition,
  isClientAnalyticsEvent,
  sanitizeAnalyticsMetadata,
  type AnalyticsEventName,
} from "@/lib/analytics-events";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type ComponentInteractionType =
  | "click"
  | "view"
  | "submit"
  | "cancel"
  | "expand"
  | "collapse"
  | "download";

export interface TrackInteractionParams {
  componentName: string;
  action: ComponentInteractionType;
  metadata?: Record<string, unknown>;
}

export interface TrackClientEventParams {
  eventName: AnalyticsEventName;
  metadata?: Record<string, unknown>;
}

export const trackClientEvent = ({
  eventName,
  metadata,
}: TrackClientEventParams) => {
  if (!isClientAnalyticsEvent(eventName)) {
    console.warn("[Analytics] Attempted to send non-client analytics event:", {
      eventName,
    });
    return;
  }

  const sanitizedMetadata = sanitizeAnalyticsMetadata(metadata);
  const definition = getAnalyticsEventDefinition(eventName);
  const destinations = definition.destinations as readonly string[];

  if (destinations.includes("ga") && typeof window !== "undefined") {
    window.gtag?.("event", eventName, sanitizedMetadata || {});
  }

  if (destinations.includes("posthog")) {
    void import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.capture(eventName, sanitizedMetadata || {});
      })
      .catch((error) => {
        console.warn("[Analytics] Failed to track PostHog event:", error);
      });
  }

  if (!destinations.includes("db")) {
    return;
  }

  try {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        metadata: sanitizedMetadata,
      }),
    }).catch((err) => {
      console.warn("[Analytics] Failed to track client event:", err);
    });
  } catch (error) {
    console.warn("[Analytics] Error in trackClientEvent:", error);
  }
};

/**
 * Client-side utility to track user interactions with UI components.
 * This sends an event to the backend analytics API without blocking the UI thread.
 */
export const trackInteraction = ({
  componentName,
  action,
  metadata = {},
}: TrackInteractionParams) => {
  trackClientEvent({
    eventName: "interaction",
    metadata: {
      componentName,
      action,
      ...metadata,
    },
  });
};
