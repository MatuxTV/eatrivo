// Client-side analytics tracking endpoint
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import {
  getAnalyticsEventDefinition,
  getAnalyticsMetadataSize,
  isAnalyticsEventName,
  isClientAnalyticsEvent,
  MAX_ANALYTICS_METADATA_BYTES,
  sanitizeAnalyticsMetadata,
} from "@/lib/analytics/analytics-events";
import { captureServerAnalyticsEvent } from "@/lib/analytics/analytics-server";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Check rate limit for analytics
    const identifier = getRateLimitIdentifier(req, session?.user?.id);
    const rateLimitResult = await checkRateLimit(identifier, "analytics");
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    const body = await req.json();

    const { eventType, eventName, metadata } = body as {
      eventType?: unknown;
      eventName?: unknown;
      metadata?: unknown;
    };

    // Validate required fields
    if (typeof eventName !== "string") {
      return NextResponse.json(
        { error: "eventName is required" },
        { status: 400 },
      );
    }

    if (!isAnalyticsEventName(eventName)) {
      return NextResponse.json({ error: "Invalid eventName" }, { status: 400 });
    }

    if (!isClientAnalyticsEvent(eventName)) {
      return NextResponse.json(
        { error: "Event not allowed from client" },
        { status: 400 },
      );
    }

    const definition = getAnalyticsEventDefinition(eventName);
    if (eventType !== undefined && eventType !== definition.eventType) {
      return NextResponse.json(
        { error: "Invalid eventType for eventName" },
        { status: 400 },
      );
    }

    if (
      metadata !== undefined &&
      metadata !== null &&
      (typeof metadata !== "object" || Array.isArray(metadata))
    ) {
      return NextResponse.json(
        { error: "metadata must be an object" },
        { status: 400 },
      );
    }

    // Validate metadata size to prevent abuse
    const sanitizedMetadata = sanitizeAnalyticsMetadata(
      (metadata as Record<string, unknown> | undefined) ?? null,
    );
    if (getAnalyticsMetadataSize(sanitizedMetadata) > MAX_ANALYTICS_METADATA_BYTES) {
        return NextResponse.json(
          { error: "Metadata too large (max 2KB)" },
          { status: 400 },
        );
    }

    // Track the event
    await captureServerAnalyticsEvent({
      userId: session?.user?.id || null,
      eventName,
      metadata: sanitizedMetadata || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Analytics Track] Error:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 },
    );
  }
}
