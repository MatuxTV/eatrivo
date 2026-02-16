import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, getMembershipFromPriceId } from "@/lib/stripe";
import { db } from "@/index";
import { users, subscriptions, invoices, shoppingLists, userProfiles, mealPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Analytics } from "@/lib/analytics";
import { CacheService } from "@/lib/redis";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
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

        console.log(
          `Deleted all template-based shopping lists and meal plans for upgraded user: ${userId}`
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

    // Create subscription record
    await db.insert(subscriptions).values({
      userId: userId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      status: "active",
      currentPeriodEnd: periodEndDate,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
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
  const priceId = subscription.items.data[0].price.id;
  const membership = getMembershipFromPriceId(priceId);

  if (!userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  // Update user membership
  await db
    .update(users)
    .set({ membership: membership })
    .where(eq(users.id, userId));

  // Update subscription record
  await db
    .update(subscriptions)
    .set({
      stripePriceId: priceId,
      status:
        subscription.status === "active"
          ? "active"
          : subscription.status === "past_due"
            ? "past_due"
            : "canceled",
      currentPeriodEnd: new Date(
        (subscription as unknown as { current_period_end: number })
          .current_period_end * 1000,
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("Missing userId in subscription metadata");
    return;
  }

  // Downgrade user to basic
  await db
    .update(users)
    .set({ membership: "basic" })
    .where(eq(users.id, userId));

  // Update subscription record
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
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
  const subscriptionId = (invoice as unknown as { subscription: string | null })
    .subscription;
  const customerId = invoice.customer as string;

  if (!subscriptionId) return;

  // Update subscription status to past_due
  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

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

// Disable body parsing for webhook (need raw body for signature verification)
export const config = {
  api: {
    bodyParser: false,
  },
};
