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

/**
 * Client-side utility to track user interactions with UI components.
 * This sends an event to the backend analytics API without blocking the UI thread.
 */
export const trackInteraction = ({
  componentName,
  action,
  metadata = {},
}: TrackInteractionParams) => {
  try {
    // Fire and forget
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "engagement",
        eventName: "interaction",
        metadata: {
          componentName,
          action,
          ...metadata,
        },
      }),
    }).catch((err) => {
      // Silently catch fetch errors so it never breaks the user experience
      console.warn("[Analytics] Failed to track interaction:", err);
    });
  } catch (error) {
    console.warn("[Analytics] Error in trackInteraction:", error);
  }
};
