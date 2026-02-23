import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { createPortalSession } from "@/lib/stripe";
import { db } from "@/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 per minute
    const rateLimitId = getRateLimitIdentifier(req, session.user.id);
    const rateLimit = await checkRateLimit(rateLimitId, "standard");
    if (!rateLimit.success) return rateLimit.response!;

    // Get locale from request body (optional)
    const body = await req.json().catch(() => ({}));
    const locale = body.locale || 'en';

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 },
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const portalSession = await createPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl: `${origin}/${locale}/profile/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}
