import { NextResponse } from "next/server";
import { cleanupExpiredSubscriptions } from "@/lib/subscription";

// Secret token to protect the cron endpoint
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint to cleanup expired subscriptions
 *
 * Setup in Vercel:
 * 1. Add CRON_SECRET to environment variables
 * 2. Create vercel.json with cron config:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/cleanup-subscriptions",
 *        "schedule": "0 3 * * *"
 *      }]
 *    }
 *
 * Or call manually via:
 * curl -X POST https://your-domain.com/api/cron/cleanup-subscriptions \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    // Apply rate limit against cron endpoint brute-forcing
    const identifier = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, "webhook");
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }
    // Verify cron secret - only allow Bearer token auth
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!CRON_SECRET || token !== CRON_SECRET) {
      console.error("[Cron] Unauthorized cleanup attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.warn("[Cron] Starting subscription cleanup...");

    const result = await cleanupExpiredSubscriptions();

    console.warn(
      `[Cron] Cleanup complete. Downgraded ${result.downgraded} users.`,
    );

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.downgraded} expired subscriptions`,
      downgraded: result.downgraded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Subscription cleanup error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
