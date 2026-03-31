import type {
  AnalyticsEventDefinition,
  AnalyticsMetadata,
} from "@/lib/analytics-types";

export const MAX_ANALYTICS_METADATA_BYTES = 2048;

export const analyticsEventDefinitions = {
  login: {
    eventType: "auth",
    destinations: ["db"],
    canonicalName: "account_logged_in",
    persistAs: "login",
  },
  account_logged_in: {
    eventType: "auth",
    destinations: ["db", "posthog"],
    persistAs: "login",
  },
  signup: {
    eventType: "auth",
    destinations: ["db"],
    canonicalName: "account_signed_up",
    persistAs: "signup",
  },
  account_signed_up: {
    eventType: "auth",
    destinations: ["db", "posthog"],
    persistAs: "signup",
  },
  logout: {
    eventType: "auth",
    destinations: ["db"],
    canonicalName: "account_logged_out",
    persistAs: "logout",
  },
  account_logged_out: {
    eventType: "auth",
    destinations: ["db", "posthog"],
    persistAs: "logout",
  },
  landing_viewed: {
    eventType: "page_view",
    destinations: [],
  },
  landing_cta_clicked: {
    eventType: "engagement",
    destinations: [],
  },
  pricing_viewed: {
    eventType: "page_view",
    destinations: [],
  },
  pricing_plan_selected: {
    eventType: "engagement",
    destinations: [],
  },
  signin_viewed: {
    eventType: "page_view",
    destinations: [],
    allowClient: true,
  },
  welcome_auth_viewed: {
    eventType: "page_view",
    destinations: [],
    allowClient: true,
  },
  signup_started: {
    eventType: "engagement",
    destinations: [],
  },
  checkout_started: {
    eventType: "subscription",
    destinations: ["ga", "posthog", "db"],
  },
  purchase_completed: {
    eventType: "subscription",
    destinations: ["ga", "posthog", "db"],
  },
  home_viewed: {
    eventType: "page_view",
    destinations: [],
  },
  onboarding_started: {
    eventType: "engagement",
    destinations: [],
  },
  onboarding_step_viewed: {
    eventType: "engagement",
    destinations: [],
  },
  onboarding_step_completed: {
    eventType: "engagement",
    destinations: [],
  },
  onboarding_complete: {
    eventType: "engagement",
    destinations: [],
    canonicalName: "onboarding_completed",
    persistAs: "onboarding_complete",
  },
  onboarding_completed: {
    eventType: "engagement",
    destinations: [],
    persistAs: "onboarding_complete",
  },
  onboarding_save_failed: {
    eventType: "engagement",
    destinations: [],
  },
  meal_plan_generation_started: {
    eventType: "feature",
    destinations: [],
  },
  meal_plan_generated: {
    eventType: "feature",
    destinations: [],
    persistAs: "meal_plan_generated",
  },
  meal_plan_generation_failed: {
    eventType: "feature",
    destinations: [],
  },
  shopping_list_generation_started: {
    eventType: "feature",
    destinations: [],
  },
  shopping_list_generation_failed: {
    eventType: "feature",
    destinations: [],
  },
  shopping_list_created: {
    eventType: "feature",
    destinations: [],
    persistAs: "shopping_list_created",
  },
  shopping_list_viewed: {
    eventType: "feature",
    destinations: [],
    persistAs: "shopping_list_viewed",
  },
  shopping_list_downloaded: {
    eventType: "feature",
    destinations: [],
    persistAs: "shopping_list_downloaded",
  },
  pantry_viewed: {
    eventType: "page_view",
    destinations: ["db", "posthog"],
    allowClient: true,
  },
  pantry_checkout_completed: {
    eventType: "feature",
    destinations: [],
  },
  kitchen_counter_viewed: {
    eventType: "page_view",
    destinations: ["db", "posthog"],
    allowClient: true,
  },
  kitchen_counter_completed: {
    eventType: "feature",
    destinations: ["db", "posthog"],
  },
  kitchen_counter_completed_with_missing_ingredients: {
    eventType: "feature",
    destinations: ["db", "posthog"],
  },
  recipe_opened: {
    eventType: "feature",
    destinations: ["db", "posthog"],
    allowClient: true,
  },
  custom_recipe_generation_started: {
    eventType: "feature",
    destinations: ["db", "posthog"],
  },
  custom_recipe_generated: {
    eventType: "feature",
    destinations: ["db", "posthog"],
  },
  custom_recipe_generation_failed: {
    eventType: "feature",
    destinations: ["db", "posthog"],
  },
  custom_recipe_result_opened: {
    eventType: "feature",
    destinations: ["db", "posthog"],
    allowClient: true,
  },
  custom_recipe_fallback_opened: {
    eventType: "feature",
    destinations: ["db", "posthog"],
    allowClient: true,
  },
  chat_session_started: {
    eventType: "feature",
    destinations: ["db", "posthog"],
    allowClient: true,
  },
  chat_message_sent: {
    eventType: "feature",
    destinations: ["posthog"],
  },
  chat_response_received: {
    eventType: "feature",
    destinations: ["posthog"],
  },
  chat_limit_reached: {
    eventType: "feature",
    destinations: ["db", "posthog"],
  },
  ai_request: {
    eventType: "feature",
    destinations: ["db"],
    persistAs: "ai_request",
  },
  interaction: {
    eventType: "engagement",
    destinations: [],
    persistAs: "interaction",
  },
  billing_page_viewed: {
    eventType: "page_view",
    destinations: [],
  },
  billing_portal_opened: {
    eventType: "engagement",
    destinations: [],
  },
  upgrade_cta_clicked: {
    eventType: "engagement",
    destinations: [],
  },
  upgrade: {
    eventType: "subscription",
    destinations: ["db"],
    canonicalName: "subscription_upgraded",
    persistAs: "upgrade",
  },
  subscription_upgraded: {
    eventType: "subscription",
    destinations: ["db", "ga", "posthog"],
    persistAs: "upgrade",
  },
  downgrade: {
    eventType: "subscription",
    destinations: ["db"],
    canonicalName: "subscription_downgraded",
    persistAs: "downgrade",
  },
  subscription_downgraded: {
    eventType: "subscription",
    destinations: ["db"],
    persistAs: "downgrade",
  },
  cancel: {
    eventType: "subscription",
    destinations: ["db"],
    canonicalName: "subscription_cancelled",
    persistAs: "cancel",
  },
  subscription_cancelled: {
    eventType: "subscription",
    destinations: ["db"],
    persistAs: "cancel",
  },
  push_subscribed: {
    eventType: "engagement",
    destinations: ["db"],
    persistAs: "push_subscribed",
  },
  admin_analytics_viewed: {
    eventType: "engagement",
    destinations: ["db"],
  },
  ai_insight_generated: {
    eventType: "feature",
    destinations: ["db"],
  },
} as const satisfies Record<string, AnalyticsEventDefinition>;

export type AnalyticsEventName = keyof typeof analyticsEventDefinitions;

export const activeAdminAnalyticsEventNames = [
  "pantry_viewed",
  "kitchen_counter_viewed",
  "kitchen_counter_completed",
  "kitchen_counter_completed_with_missing_ingredients",
  "recipe_opened",
  "custom_recipe_generation_started",
  "custom_recipe_generated",
  "custom_recipe_generation_failed",
  "custom_recipe_result_opened",
  "custom_recipe_fallback_opened",
  "chat_session_started",
  "chat_limit_reached",
] as const satisfies readonly AnalyticsEventName[];

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return value in analyticsEventDefinitions;
}

export function getAnalyticsEventDefinition(eventName: AnalyticsEventName) {
  return analyticsEventDefinitions[eventName];
}

export function isClientAnalyticsEvent(eventName: AnalyticsEventName) {
  const definition = getAnalyticsEventDefinition(eventName);
  return "allowClient" in definition && definition.allowClient === true;
}

export function getStoredAnalyticsEventName(eventName: AnalyticsEventName) {
  const definition = getAnalyticsEventDefinition(eventName);
  return ("persistAs" in definition ? definition.persistAs : undefined) ?? eventName;
}

export function sanitizeAnalyticsMetadata(
  metadata?: AnalyticsMetadata | null,
): AnalyticsMetadata | null {
  if (metadata == null) {
    return null;
  }

  const serialized = JSON.stringify(metadata, (_key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (
      typeof value === "function" ||
      typeof value === "symbol" ||
      typeof value === "undefined"
    ) {
      return undefined;
    }

    return value;
  });

  if (!serialized) {
    return null;
  }

  const parsed = JSON.parse(serialized) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  return parsed as AnalyticsMetadata;
}

export function getAnalyticsMetadataSize(
  metadata?: AnalyticsMetadata | null,
): number {
  if (metadata == null) {
    return 0;
  }

  return JSON.stringify(metadata).length;
}
