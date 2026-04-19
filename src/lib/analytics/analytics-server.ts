import "server-only";

import { analyticsEvents } from "@/db/schema";
import { db } from "@/index";
import {
  getAnalyticsEventDefinition,
  getStoredAnalyticsEventName,
  sanitizeAnalyticsMetadata,
  type AnalyticsEventName,
} from "@/lib/analytics/analytics-events";
import type { TrackEventParams } from "@/lib/analytics/analytics-types";

function getPostHogEndpoint() {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (!host) {
    return null;
  }

  return `${host.replace(/\/$/, "")}/capture/`;
}

async function sendPostHogAnalyticsEvent({
  userId,
  eventName,
  metadata,
}: {
  userId?: string | null;
  eventName: AnalyticsEventName;
  metadata?: Record<string, unknown> | null;
}) {
  const definition = getAnalyticsEventDefinition(eventName);
  const destinations = definition.destinations as readonly string[];
  if (!destinations.includes("posthog")) {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  const endpoint = getPostHogEndpoint();
  if (!apiKey || !endpoint) {
    return;
  }

  const distinctId = userId || "anonymous";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      event: eventName,
      properties: {
        distinct_id: distinctId,
        source: "server",
        ...(metadata || {}),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`PostHog capture failed with status ${response.status}`);
  }
}

async function persistDbAnalyticsEvent({
  userId,
  eventName,
  metadata,
}: {
  userId?: string | null;
  eventName: AnalyticsEventName;
  metadata?: Record<string, unknown> | null;
}) {
  const definition = getAnalyticsEventDefinition(eventName);
  const destinations = definition.destinations as readonly string[];
  if (!destinations.includes("db")) {
    return;
  }

  await db.insert(analyticsEvents).values({
    userId: userId || null,
    eventType: definition.eventType,
    eventName: getStoredAnalyticsEventName(eventName),
    metadata: metadata || null,
  });
}

export async function captureServerAnalyticsEvent({
  userId,
  eventName,
  metadata,
}: TrackEventParams<AnalyticsEventName>): Promise<void> {
  try {
    const sanitizedMetadata = sanitizeAnalyticsMetadata(metadata);

    await Promise.all([
      persistDbAnalyticsEvent({
        userId,
        eventName,
        metadata: sanitizedMetadata,
      }),
      sendPostHogAnalyticsEvent({
        userId,
        eventName,
        metadata: sanitizedMetadata,
      }),
    ]);

    // GA sink is intentionally not wired yet.
  } catch (error) {
    console.error("[Analytics] Failed to capture server event:", error);
  }
}
