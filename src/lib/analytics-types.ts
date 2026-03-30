export type AnalyticsEventType =
  | "auth"
  | "feature"
  | "subscription"
  | "page_view"
  | "engagement";

export type AnalyticsDestination = "db" | "ga" | "posthog";

export type AnalyticsMetadata = Record<string, unknown>;

export interface AnalyticsEventDefinition {
  eventType: AnalyticsEventType;
  destinations: readonly AnalyticsDestination[];
  allowClient?: boolean;
  canonicalName?: string;
  persistAs?: string;
}

export interface TrackEventParams<TEventName extends string = string> {
  userId?: string | null;
  eventName: TEventName;
  eventType?: AnalyticsEventType;
  metadata?: AnalyticsMetadata;
}
