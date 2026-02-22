// Client-side analytics tracking endpoint
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { trackEvent, type AnalyticsEventType } from "@/lib/analytics";
import { auth } from "@/../auth";
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

    const { eventType, eventName, metadata } = body;

    // Validate required fields
    if (!eventType || !eventName) {
      return NextResponse.json(
        { error: "eventType and eventName are required" },
        { status: 400 },
      );
    }

    // Validate event type
    const validTypes: AnalyticsEventType[] = [
      "auth",
      "feature",
      "subscription",
      "page_view",
      "engagement",
    ];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }

    // Track the event
    await trackEvent({
      userId: session?.user?.id || null,
      eventType,
      eventName,
      metadata,
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
