import "server-only";

type PostHogBridgeStatus = "ready" | "not_configured" | "error";
interface PostHogEventCounts {
  pantryViewed: number;
  kitchenCounterViewed: number;
  kitchenCounterCompleted: number;
  kitchenCounterCompletedWithMissingIngredients: number;
  recipeOpened: number;
  customRecipeStarts: number;
  customRecipeGenerated: number;
  customRecipeFailures: number;
  customRecipeResultOpens: number;
  customRecipeFallbackOpens: number;
}
export interface AdminPostHogTelemetry {
  configured: boolean;
  status: PostHogBridgeStatus;
  source: "posthog" | "fallback";
  message: string;
  counts: PostHogEventCounts;
}
const EMPTY_COUNTS: PostHogEventCounts = {
  pantryViewed: 0,
  kitchenCounterViewed: 0,
  kitchenCounterCompleted: 0,
  kitchenCounterCompletedWithMissingIngredients: 0,
  recipeOpened: 0,
  customRecipeStarts: 0,
  customRecipeGenerated: 0,
  customRecipeFailures: 0,
  customRecipeResultOpens: 0,
  customRecipeFallbackOpens: 0,
};
const EVENT_TO_KEY = {
  pantry_viewed: "pantryViewed",
  kitchen_counter_viewed: "kitchenCounterViewed",
  kitchen_counter_completed: "kitchenCounterCompleted",
  kitchen_counter_completed_with_missing_ingredients:
    "kitchenCounterCompletedWithMissingIngredients",
  recipe_opened: "recipeOpened",
  custom_recipe_generation_started: "customRecipeStarts",
  custom_recipe_generated: "customRecipeGenerated",
  custom_recipe_generation_failed: "customRecipeFailures",
  custom_recipe_result_opened: "customRecipeResultOpens",
  custom_recipe_fallback_opened: "customRecipeFallbackOpens",
} as const satisfies Record<string, keyof PostHogEventCounts>;
function toCount(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}
function getPostHogAppHost() {
  const configured = process.env.POSTHOG_APP_HOST?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "https://eu.posthog.com";
}
function escapeSqlString(value: string) {
  return value.replace(/'/g, "''");
}
function getQueryRows(payload: Record<string, unknown>) {
  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload.result)) {
    return payload.result;
  }

  return [];
}
async function fetchQueryCounts(rangeDays: number) {
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();

  if (!personalApiKey || !projectId) {
    return null;
  }

  const eventList = Object.keys(EVENT_TO_KEY)
    .map((eventName) => `'${escapeSqlString(eventName)}'`)
    .join(", ");

  const response = await fetch(
    `${getPostHogAppHost()}/api/projects/${projectId}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${personalApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: `SELECT event, count() AS count FROM events WHERE event IN (${eventList}) AND timestamp >= now() - INTERVAL ${rangeDays} DAY GROUP BY event`,
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`PostHog query failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const rows = getQueryRows(payload);
  const counts = { ...EMPTY_COUNTS };

  for (const row of rows) {
    if (!row) {
      continue;
    }

    let eventName: string | null = null;
    let countValue: unknown = 0;

    if (Array.isArray(row)) {
      eventName = typeof row[0] === "string" ? row[0] : null;
      countValue = row[1];
    } else if (typeof row === "object") {
      const record = row as Record<string, unknown>;
      eventName = typeof record.event === "string" ? record.event : null;
      countValue = record.count;
    }

    if (!eventName || !(eventName in EVENT_TO_KEY)) {
      continue;
    }

    const key = EVENT_TO_KEY[eventName as keyof typeof EVENT_TO_KEY];
    counts[key] = toCount(countValue);
  }

  return counts;
}
export async function getAdminPostHogTelemetry(
  rangeDays: number,
): Promise<AdminPostHogTelemetry> {
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();

  if (!personalApiKey || !projectId) {
    return {
      configured: false,
      status: "not_configured",
      source: "fallback",
      message:
        "PostHog admin bridge nie je nakonfigurovany. Doplň POSTHOG_PROJECT_ID a POSTHOG_PERSONAL_API_KEY.",
      counts: { ...EMPTY_COUNTS },
    };
  }

  try {
    const counts = await fetchQueryCounts(rangeDays);

    return {
      configured: true,
      status: "ready",
      source: "posthog",
      message:
        "Aktivne pantry, kitchen counter, recipe open a custom recipe eventy su nacitane z PostHog Query API.",
      counts: counts ?? { ...EMPTY_COUNTS },
    };
  } catch (error) {
    return {
      configured: true,
      status: "error",
      source: "fallback",
      message:
        error instanceof Error
          ? error.message
          : "PostHog admin bridge zlyhal.",
      counts: { ...EMPTY_COUNTS },
    };
  }
}
