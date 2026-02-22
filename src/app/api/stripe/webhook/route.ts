import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, getMembershipFromPriceId } from "@/lib/stripe";
import { db } from "@/index";
import {
  users,
  subscriptions,
  invoices,
  shoppingLists,
  userProfiles,
  mealPlans,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { Analytics } from "@/lib/analytics";
import { CacheService } from "@/lib/redis";

import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Apply rate limit against webhook flooding
  const identifier = getRateLimitIdentifier(req);
  const rateLimitResult = await checkRateLimit(identifier, "webhook");
  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error("Missing userId in checkout session metadata");
    return;
  }

  if (!subscriptionId) {
    console.error("Missing subscriptionId in checkout session");
    return;
  }

  try {
    // Get subscription details from Stripe
    const stripeSubscription =
      await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = stripeSubscription.items.data[0].price.id;
    const membership = getMembershipFromPriceId(priceId);

    // Access current_period_end safely
    const rawSubscription = stripeSubscription as unknown as Record<
      string,
      unknown
    >;
    const currentPeriodEnd = rawSubscription.current_period_end as
      | number
      | undefined;

    // Get user's profile before updating
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    // Update user with Stripe customer ID and membership
    const updateResult = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        membership: membership,
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id, membership: users.membership });

    if (updateResult.length === 0) {
      console.error("No user found with id:", userId);
      return;
    }

    // CLEAN UP TEMPLATE ASSIGNMENTS - User upgraded to premium
    if (userProfile && (membership === "premium" || membership === "pro")) {
      try {
        // Delete all associated meal plans first (due to foreign key constraints)
        await db
          .delete(mealPlans)
          .where(eq(mealPlans.userProfileId, userProfile.id));

        // Delete all shopping lists (completely remove template assignments)
        await db
          .delete(shoppingLists)
          .where(eq(shoppingLists.userProfileId, userProfile.id));

        console.warn(
          `[Subscription] Deleted all template-based shopping lists and meal plans for upgraded user: ${userId}`,
        );

        // Invalidate cache so user gets fresh empty state
        const cacheKey = `shopping-lists:${userId}`;
        try {
          await CacheService.delete(cacheKey);
        } catch (cacheError) {
          console.warn("Failed to invalidate shopping list cache:", cacheError);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up template assignments:", cleanupError);
        // Continue anyway - subscription creation is more important
      }
    }

    // Calculate currentPeriodEnd date - use 30 days from now as fallback
    const periodEndDate = currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Get cancel_at from Stripe subscription
    const cancelAtTimestamp = (
      stripeSubscription as unknown as { cancel_at: number | null }
    ).cancel_at;

    // Create subscription record
    await db.insert(subscriptions).values({
      userId: userId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: "active",
      currentPeriodEnd: periodEndDate,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
      cancelAt: cancelAtTimestamp ? new Date(cancelAtTimestamp * 1000) : null,
    });

    // Track subscription upgrade event
    Analytics.subscriptionUpgrade(userId, {
      from: "basic",
      to: membership,
    });
  } catch (error) {
    console.error("Error in handleCheckoutComplete:", error);
    throw error;
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0]?.price.id;

  if (!userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  if (!priceId) {
    console.error("Missing priceId in subscription items");
    return;
  }

  const membership = getMembershipFromPriceId(priceId);

  // Check if user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  });

  if (!existingUser) {
    console.error("User not found for subscription update:", userId);
    return;
  }

  // Check if subscription record exists
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
    columns: { id: true },
  });

  if (!existingSubscription) {
    console.error("Subscription record not found:", subscriptionId);
    return;
  }

  // Map Stripe subscription status to our database enum
  const mapSubscriptionStatus = (
    stripeStatus: string,
  ): "active" | "canceled" | "past_due" | "gifted" => {
    switch (stripeStatus) {
      case "active":
      case "trialing":
        return "active";
      case "past_due":
      case "unpaid":
        return "past_due";
      case "canceled":
      case "incomplete":
      case "incomplete_expired":
        return "canceled";
      default:
        console.warn(
          `Unknown subscription status: ${stripeStatus}, defaulting to canceled`,
        );
        return "canceled";
    }
  };

  // Safely get current_period_end and cancel_at
  const rawSubscription = subscription as unknown as Record<string, unknown>;
  let currentPeriodEnd = rawSubscription.current_period_end as
    | number
    | undefined;
  let cancelAtTimestamp = rawSubscription.cancel_at as
    | number
    | null
    | undefined;

  // If current_period_end is not at top level, check subscription items
  if (!currentPeriodEnd && subscription.items?.data?.[0]) {
    const firstItem = subscription.items.data[0] as unknown as Record<
      string,
      unknown
    >;
    currentPeriodEnd = firstItem.current_period_end as number | undefined;
  }

  // If critical fields are still missing for active subscriptions, fetch from Stripe API
  if (!currentPeriodEnd && subscription.status === "active") {
    console.warn(
      `[Webhook] Missing current_period_end for active subscription ${subscriptionId}, fetching from Stripe API`,
    );

    try {
      const fullSubscription =
        await stripe.subscriptions.retrieve(subscriptionId);
      const fullRaw = fullSubscription as unknown as Record<string, unknown>;

      // Check subscription level first
      currentPeriodEnd = fullRaw.current_period_end as number | undefined;

      // If not there, check items
      if (!currentPeriodEnd && fullSubscription.items?.data?.[0]) {
        const item = fullSubscription.items.data[0] as unknown as Record<
          string,
          unknown
        >;
        currentPeriodEnd = item.current_period_end as number | undefined;
      }

      cancelAtTimestamp = fullRaw.cancel_at as number | null | undefined;

      console.warn(
        `[Webhook] Fetched full subscription data: current_period_end=${!!currentPeriodEnd}, cancel_at=${!!cancelAtTimestamp}`,
      );
    } catch (error) {
      console.error(
        `Failed to fetch full subscription ${subscriptionId}:`,
        error,
      );
    }
  }

  // Build update object conditionally
  const updateData: {
    stripePriceId: string;
    status: "active" | "canceled" | "past_due" | "gifted";
    cancelAtPeriodEnd: boolean;
    cancelAt: Date | null;
    updatedAt: Date;
    currentPeriodEnd?: Date;
  } = {
    stripePriceId: priceId,
    status: mapSubscriptionStatus(subscription.status),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    cancelAt: cancelAtTimestamp ? new Date(cancelAtTimestamp * 1000) : null,
    updatedAt: new Date(),
  };

  // Only update currentPeriodEnd if it exists
  if (currentPeriodEnd) {
    updateData.currentPeriodEnd = new Date(currentPeriodEnd * 1000);
  } else {
    console.warn(
      `Missing current_period_end for subscription ${subscriptionId}, keeping existing value`,
    );
  }

  // Update user membership
  await db
    .update(users)
    .set({ membership: membership })
    .where(eq(users.id, userId));

  // Update subscription record with validated data
  await db
    .update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  // Check if user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, membership: true },
  });

  if (!existingUser) {
    console.error("User not found for subscription deletion:", userId);
    return;
  }

  // Check if subscription record exists
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscription.id),
    columns: { id: true },
  });

  if (!existingSubscription) {
    console.warn(
      "Subscription record not found for deletion:",
      subscription.id,
    );
    // Continue to downgrade user even if subscription record is missing
  }

  // Downgrade user to basic (only if they're not already basic)
  if (existingUser.membership !== "basic") {
    await db
      .update(users)
      .set({ membership: "basic" })
      .where(eq(users.id, userId));
  }

  // Update subscription record if it exists
  if (existingSubscription) {
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
  }

  // Track cancellation event
  Analytics.subscriptionCancel(userId, {
    tier: existingUser.membership,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as unknown as { subscription: string | null })
    .subscription;

  // Find user by Stripe customer ID
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user.length) {
    console.error("User not found for customer:", customerId);
    return;
  }

  const userId = user[0].id;

  // Map Stripe status to our enum
  const statusMap: Record<
    string,
    "draft" | "open" | "paid" | "void" | "uncollectible"
  > = {
    draft: "draft",
    open: "open",
    paid: "paid",
    void: "void",
    uncollectible: "uncollectible",
  };

  // Create or update invoice record
  await db
    .insert(invoices)
    .values({
      userId: userId,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subscriptionId,
      status: statusMap[invoice.status || "paid"] || "paid",
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      invoiceUrl: invoice.hosted_invoice_url || null,
      invoicePdf: invoice.invoice_pdf || null,
      periodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : null,
      periodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : null,
      paidAt: new Date(),
    })
    .onConflictDoUpdate({
      target: invoices.stripeInvoiceId,
      set: {
        status: "paid",
        amountPaid: invoice.amount_paid,
        paidAt: new Date(),
      },
    });

  // Invoice recorded successfully - no IDs logged for security
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const rawInvoice = invoice as unknown as { subscription: string | null };
  const subscriptionId = rawInvoice.subscription;
  const customerId = invoice.customer as string;

  if (!subscriptionId) {
    console.warn(
      "Invoice payment failed but no subscription ID found:",
      invoice.id,
    );
    return;
  }

  if (!customerId) {
    console.error("Missing customer ID in failed invoice:", invoice.id);
    return;
  }

  // Check if subscription exists before updating
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
    columns: { id: true },
  });

  if (!existingSubscription) {
    console.warn("Subscription not found for payment failure:", subscriptionId);
    // Continue to record invoice even if subscription is missing
  } else {
    // Update subscription status to past_due
    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
  }

  // Also record the failed invoice
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (user.length) {
    await db
      .insert(invoices)
      .values({
        userId: user[0].id,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: subscriptionId,
        status: "open", // Failed invoices stay open until paid/void
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid || 0,
        currency: invoice.currency,
        invoiceUrl: invoice.hosted_invoice_url || null,
        invoicePdf: invoice.invoice_pdf || null,
        periodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : null,
        periodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null,
      })
      .onConflictDoNothing();
  }
}
