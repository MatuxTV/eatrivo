import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth, isAuthError } from "@/lib/adminAuth";
import { db } from '@/index';
import { pushSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import webpush from 'web-push';

// Set up web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BIJKe58tvcY8dYNVegyV1PApzs7UAHiMyDTTp3s-8C-LLSwlodPm_NN-ns-3I6kGFIad6CnAiM0J8sLdoXsVcp0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PRIVATE_KEY && process.env.ADMIN_EMAIL) {
  webpush.setVapidDetails(
    `mailto:${process.env.ADMIN_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    if (!VAPID_PRIVATE_KEY || !process.env.ADMIN_EMAIL) {
       console.error("Missing VAPID keys or Admin Email");
       return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const { userId, payload }: { userId: string; payload: PushPayload } = body;

    if (!userId || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user's push subscriptions
    const userSubscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (userSubscriptions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No subscriptions found for user' },
        { status: 404 }
      );
    }

    // Send notification to all user's subscriptions
    const results = await Promise.allSettled(
      userSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            sub.subscription as webpush.PushSubscription,
            JSON.stringify(payload)
          );
          return { success: true, id: sub.id };
        } catch (error) {
          // If subscription is no longer valid, delete it
          const pushError = error as { statusCode?: number };
          if (pushError.statusCode === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, sub.id));
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json(
      {
        success: true,
        message: `Sent ${successful} notifications, ${failed} failed`,
        sent: successful,
        failed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
