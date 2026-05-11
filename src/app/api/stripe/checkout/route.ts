import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/../auth";
import {
  createCheckoutSession,
  getOrCreateCustomer,
  STRIPE_PRICES,
} from "@/lib/billing/stripe";
import { db } from "@/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { unauthorizedError } from "@/lib/safeError";
import { getTrialPeriodForUser } from "@/lib/billing/subscription";
import { captureServerAnalyticsEvent } from "@/lib/analytics/analytics-server";

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
    const {
      tier,
      billingCycle = "monthly",
      discountCode,
      locale = "en",
      sourcePage = "unknown",
      surface = "checkout",
    } = body as {
      tier: "premium";
      billingCycle?: "monthly" | "yearly";
      discountCode?: string;
      locale?: string;
      sourcePage?: string;
      surface?: string;
    };

    // Validate tier
    if (tier !== "premium") {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    if (!["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
    }

    const priceId =
      tier === "premium" && billingCycle === "yearly"
        ? STRIPE_PRICES.premiumYearly
        : STRIPE_PRICES[tier];
    if (!priceId) {
      return NextResponse.json(
        {
          error:
            tier === "premium" && billingCycle === "yearly"
              ? "Yearly Plus price not configured"
              : "Price not configured",
        },
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

    const billingHomeUrl = `${origin}/home?section=profile&profileView=billing`;

    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      priceId,
      successUrl: `${billingHomeUrl}&success=true`,
      cancelUrl: `${billingHomeUrl}&canceled=true`,
      discountCode,
      trialPeriodDays,
      locale,
      sourcePage,
      surface,
    });

    await captureServerAnalyticsEvent({
      userId: session.user.id,
      eventName: "checkout_started",
      metadata: {
        tier,
        billing_cycle: billingCycle,
        price_id: priceId,
        locale,
        source_page: sourcePage,
        surface,
        discount_code_present: Boolean(discountCode),
        trial_applied: trialPeriodDays > 0,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error("Checkout error", {
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        requestId: error.requestId,
      });

      return NextResponse.json(
        {
          error:
            error.code === "resource_missing"
              ? "Checkout price is misconfigured"
              : "Failed to create checkout session",
        },
        { status: 500 },
      );
    }

    console.error("Checkout error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
