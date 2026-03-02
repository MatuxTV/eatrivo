import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/index';
import { pushSubscriptions, consentLogs } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { apiLogger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  apiLogger.info('[PushSubscribe] POST /api/push/subscribe called');
  try {
    const session = await auth();

    apiLogger.info('[PushSubscribe] session resolved', {
      metadata: { userId: session?.user?.id ?? 'none', hasSession: !!session },
    });

    if (!session?.user?.id) {
      apiLogger.warn('[PushSubscribe] Unauthorized — no session user id');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, 'standard');
    if (!rl.success) {
      apiLogger.warn('[PushSubscribe] Rate limited', { metadata: { userId: session.user.id } });
      return rl.response!;
    }

    const body = await request.json();
    const { subscription } = body;

    apiLogger.info('[PushSubscribe] Request body parsed', {
      metadata: {
        hasSubscription: !!subscription,
        hasEndpoint: !!subscription?.endpoint,
        endpointPrefix: subscription?.endpoint?.slice(0, 60) ?? 'MISSING',
        hasAuth: !!subscription?.keys?.auth,
        hasP256dh: !!subscription?.keys?.p256dh,
      },
    });

    if (!subscription || !subscription.endpoint) {
      apiLogger.error('[PushSubscribe] Invalid subscription data — missing endpoint');
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || null;

    // Check if subscription already exists for this endpoint
    apiLogger.info('[PushSubscribe] Checking for existing subscription in DB...', {
      metadata: { userId: session.user.id },
    });
    let existingSubscription;
    try {
      existingSubscription = await db
        .select()
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, session.user.id),
            sql<boolean>`${pushSubscriptions.subscription}->>'endpoint' = ${subscription.endpoint}`
          )
        )
        .limit(1);
      apiLogger.info('[PushSubscribe] Existing subscription check complete', {
        metadata: { found: existingSubscription.length > 0 },
      });
    } catch (dbQueryErr) {
      apiLogger.error('[PushSubscribe] DB query for existing subscription failed', dbQueryErr as Error);
      throw dbQueryErr;
    }

    if (existingSubscription.length > 0) {
      // Update existing subscription
      apiLogger.info('[PushSubscribe] Updating existing subscription...', {
        metadata: { subscriptionId: existingSubscription[0].id },
      });
      await db
        .update(pushSubscriptions)
        .set({
          subscription: subscription,
          userAgent: userAgent,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existingSubscription[0].id));
      
      apiLogger.info('Updated existing push subscription', { metadata: { userId: session.user.id } });
    } else {
      // Insert new subscription
      apiLogger.info('[PushSubscribe] Inserting new subscription...', {
        metadata: { userId: session.user.id },
      });
      await db.insert(pushSubscriptions).values({
        userId: session.user.id,
        subscription: subscription,
        userAgent: userAgent,
      });
      
      apiLogger.info('Created new push subscription', { metadata: { userId: session.user.id } });
    }

    // Log push notification consent for GDPR audit trail
    apiLogger.info('[PushSubscribe] Logging GDPR consent...');
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    await db.insert(consentLogs).values({
      userId: session.user.id,
      type: 'push_notifications',
      agreed: true,
      ipAddress: ipAddress,
      userAgent: userAgent || 'unknown',
      documentVersion: 'v1.0',
    });

    apiLogger.info('[PushSubscribe] All done — returning 200');
    return NextResponse.json(
      { success: true, message: 'Subscription saved successfully' },
      { status: 200 }
    );
  } catch (error) {
    apiLogger.error('Error saving push subscription', error as Error);
    console.error('[PushSubscribe] UNHANDLED ERROR:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

