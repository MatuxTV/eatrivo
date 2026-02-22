import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import {
  createCheckoutSession,
  getOrCreateCustomer,
  STRIPE_PRICES,
} from "@/lib/stripe";
import { db } from "@/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { unauthorizedError } from "@/lib/safeError";
import { getTrialPeriodForUser } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return unauthorizedError();
    }

    // Rate limit: 10 requests per minute (expensive operation)
    const rateLimitResult = await checkRateLimit(
      getRateLimitIdentifier(req, session.user.id),
      "expensive",
    );
    if (!rateLimitResult.success) {
      return rateLimitResult.response!;
    }

    const body = await req.json();
    const { tier, discountCode, locale = "en" } = body as {
      tier: "premium" | "pro";
      discountCode?: string;
      locale?: string;
    };

    // Validate tier
    if (!tier || !["premium", "pro"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const priceId = STRIPE_PRICES[tier];
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured" },
        { status: 500 },
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get trial period based on user's account age
    const trialPeriodDays = await getTrialPeriodForUser(session.user.id);

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await getOrCreateCustomer({
        email: session.user.email,
        userId: session.user.id,
        name: session.user.name || undefined,
      });
      customerId = customer.id;

      // Save customer ID to database
      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, session.user.id));
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      priceId,
      successUrl: `${origin}/${locale}/profile/billing?success=true`,
      cancelUrl: `${origin}/${locale}/pricing?canceled=true`,
      discountCode,
      trialPeriodDays,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
