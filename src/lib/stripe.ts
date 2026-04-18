import Stripe from "stripe";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));

// Price IDs from environment
export const STRIPE_PRICES = {
  premium: requireEnv("STRIPE_PRICE_PREMIUM"),
  pro: requireEnv("STRIPE_PRICE_PRO"),
} as const;

export type MembershipTier = "basic" | "premium" | "pro" | "trainer";

// Map Stripe price IDs to membership tiers
export function getMembershipFromPriceId(priceId: string): MembershipTier {
  if (priceId === STRIPE_PRICES.premium) return "premium";
  if (priceId === STRIPE_PRICES.pro) return "pro";
  return "basic";
}

// Map membership tier to Stripe price ID
export function getPriceIdFromMembership(tier: MembershipTier): string | null {
  switch (tier) {
    case "premium":
      return STRIPE_PRICES.premium;
    case "pro":
      return STRIPE_PRICES.pro;
    default:
      return null; // basic is free, trainer is not purchasable
  }
}

// Create a checkout session for subscription
export async function createCheckoutSession({
  userId,
  email,
  priceId,
  successUrl,
  cancelUrl,
  discountCode,
  trialPeriodDays,
  locale,
  sourcePage,
  surface,
}: {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  discountCode?: string;
  trialPeriodDays?: number;
  locale?: string;
  sourcePage?: string;
  surface?: string;
}) {
  const metadata = {
    userId,
    locale: locale || "en",
    sourcePage: sourcePage || "unknown",
    surface: surface || "checkout",
    discountCodePresent: String(Boolean(discountCode)),
    trialApplied: String(Boolean(trialPeriodDays && trialPeriodDays > 0)),
  };

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata,
    },
  };

  // Add free trial if specified
  if (trialPeriodDays && trialPeriodDays > 0) {
    sessionParams.subscription_data!.trial_period_days = trialPeriodDays;
  }

  // Add discount code if provided, otherwise allow users to enter one
  if (discountCode) {
    sessionParams.discounts = [{ coupon: discountCode }];
  } else {
    sessionParams.allow_promotion_codes = true;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

// Create customer portal session
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Get or create Stripe customer
export async function getOrCreateCustomer({
  email,
  userId,
  name,
}: {
  email: string;
  userId: string;
  name?: string;
}) {
  // Search for existing customer
  const customers = await stripe.customers.list({ email, limit: 1 });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  // Create new customer
  return stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });
}

// Create a discount coupon
export async function createDiscountCoupon({
  name,
  percentOff,
  amountOff,
  currency = "eur",
  duration = "once",
  durationInMonths,
  maxRedemptions,
}: {
  name: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration?: "once" | "forever" | "repeating";
  durationInMonths?: number;
  maxRedemptions?: number;
}) {
  const couponParams: Stripe.CouponCreateParams = {
    name,
    duration,
  };

  if (percentOff) {
    couponParams.percent_off = percentOff;
  } else if (amountOff) {
    couponParams.amount_off = amountOff;
    couponParams.currency = currency;
  }

  if (duration === "repeating" && durationInMonths) {
    couponParams.duration_in_months = durationInMonths;
  }

  if (maxRedemptions) {
    couponParams.max_redemptions = maxRedemptions;
  }

  return stripe.coupons.create(couponParams);
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Cancel subscription at period end
export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
