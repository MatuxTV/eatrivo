import webpush from "web-push";
import { db } from "@/index";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

// Set up web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && process.env.ADMIN_EMAIL) {
  webpush.setVapidDetails(
    `mailto:${process.env.ADMIN_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface SendPushResult {
  totalSubscriptions: number;
  successful: number;
  failed: number;
  cleaned: number; // expired subscriptions removed
}

/**
 * Send a push notification to ALL subscribed users.
 * Handles 410 (expired) subscriptions by deleting them.
 */
export async function sendPushToAll(
  payload: PushNotificationPayload,
): Promise<SendPushResult> {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !process.env.ADMIN_EMAIL) {
    throw new Error("Missing VAPID keys or ADMIN_EMAIL env variables");
  }

  // Get all push subscriptions
  const allSubscriptions = await db.select().from(pushSubscriptions);

  if (allSubscriptions.length === 0) {
    return { totalSubscriptions: 0, successful: 0, failed: 0, cleaned: 0 };
  }

  let successful = 0;
  let failed = 0;
  let cleaned = 0;

  const jsonPayload = JSON.stringify(payload);

  // Process in batches of 50 to avoid overwhelming the push service
  const BATCH_SIZE = 50;
  for (let i = 0; i < allSubscriptions.length; i += BATCH_SIZE) {
    const batch = allSubscriptions.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        try {
          await webpush.sendNotification(
            sub.subscription as webpush.PushSubscription,
            jsonPayload,
          );
          return { success: true };
        } catch (error) {
          const pushError = error as { statusCode?: number };
          // 410 Gone = subscription expired, clean it up
          if (pushError.statusCode === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, sub.id));
            cleaned++;
          }
          throw error;
        }
      }),
    );

    successful += results.filter((r) => r.status === "fulfilled").length;
    failed += results.filter((r) => r.status === "rejected").length;
  }

  return {
    totalSubscriptions: allSubscriptions.length,
    successful,
    failed,
    cleaned,
  };
}

/**
 * Send a push notification to a specific user's subscriptions.
 * Handles 410 (expired) subscriptions by deleting them.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload,
): Promise<SendPushResult> {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !process.env.ADMIN_EMAIL) {
    throw new Error("Missing VAPID keys or ADMIN_EMAIL env variables");
  }

  const userSubs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (userSubs.length === 0) {
    return { totalSubscriptions: 0, successful: 0, failed: 0, cleaned: 0 };
  }

  let successful = 0;
  let failed = 0;
  let cleaned = 0;

  const jsonPayload = JSON.stringify(payload);

  const results = await Promise.allSettled(
    userSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          jsonPayload,
        );
        return { success: true };
      } catch (error) {
        const pushError = error as { statusCode?: number };
        if (pushError.statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
          cleaned++;
        }
        throw error;
      }
    }),
  );

  successful += results.filter((r) => r.status === "fulfilled").length;
  failed += results.filter((r) => r.status === "rejected").length;

  return {
    totalSubscriptions: userSubs.length,
    successful,
    failed,
    cleaned,
  };
}

/**
 * Send personalized push notifications to a batch of subscriptions.
 * Useful for cron jobs and admin broadcasts where the payload might depend on user language or state.
 * Handles 410 (expired) subscriptions by deleting them.
 * Processes in chunks of 50 to avoid rate limits.
 */
export async function sendPushBatch(
  messages: {
    id: string; // Subscription ID
    subscription: unknown; // PushSubscription object
    payload: PushNotificationPayload;
  }[],
): Promise<SendPushResult> {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY || !process.env.ADMIN_EMAIL) {
    throw new Error("Missing VAPID keys or ADMIN_EMAIL env variables");
  }

  if (messages.length === 0) {
    return { totalSubscriptions: 0, successful: 0, failed: 0, cleaned: 0 };
  }

  let successful = 0;
  let failed = 0;
  let cleaned = 0;

  const BATCH_SIZE = 50;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async ({ id, subscription, payload }) => {
        try {
          await webpush.sendNotification(
            subscription as webpush.PushSubscription,
            JSON.stringify(payload),
          );
          return { success: true };
        } catch (error) {
          const pushError = error as { statusCode?: number };
          if (pushError.statusCode === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, id));
            cleaned++;
          }
          throw error;
        }
      }),
    );

    successful += results.filter((r) => r.status === "fulfilled").length;
    failed += results.filter((r) => r.status === "rejected").length;
  }

  return {
    totalSubscriptions: messages.length,
    successful,
    failed,
    cleaned,
  };
}
