import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/index';
import { pushSubscriptions, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { apiLogger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rateLimit';
import { createOrReusePendingPushOptIn, normalizePushOptInLocale, clearPendingPushOptIn } from '@/lib/pwa/pushDoubleOptIn';
import { sendPushDoubleOptInEmail } from '@/lib/email/emailService';

type SubscribeRequestBody = {
  subscription?: {
    endpoint?: string;
    keys?: {
      auth?: string;
      p256dh?: string;
    };
  };
  locale?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, 'standard');
    if (!rl.success) {
      return rl.response!;
    }

    const body = (await request.json()) as SubscribeRequestBody;
    const { subscription } = body;

    if (!subscription?.endpoint || !subscription.keys?.auth || !subscription.keys?.p256dh) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || null;
    const locale = normalizePushOptInLocale(body.locale);
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    const existingSubscription = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, session.user.id),
          sql<boolean>`${pushSubscriptions.subscription}->>'endpoint' = ${subscription.endpoint}`
        )
      )
      .limit(1);

    if (existingSubscription.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({
          subscription: subscription,
          userAgent: userAgent,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existingSubscription[0].id));

      return NextResponse.json(
        { success: true, status: 'confirmed', message: 'Subscription already confirmed' },
        { status: 200 }
      );
    }

    const pending = await createOrReusePendingPushOptIn({
      userId: session.user.id,
      userEmail: user.email,
      userName: user.name,
      subscription,
      endpoint: subscription.endpoint,
      userAgent,
      ipAddress,
      locale,
      createdAt: new Date().toISOString(),
    });

    if (pending.isNew) {
      const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
      const confirmUrl = `${origin}/api/push/confirm/${pending.token}`;
      const emailResult = await sendPushDoubleOptInEmail(
        user.email,
        {
          userName: user.name,
          confirmUrl,
        },
        locale,
      );

      if (!emailResult.success) {
        await clearPendingPushOptIn(pending.token, {
          userId: session.user.id,
          userEmail: user.email,
          userName: user.name,
          subscription,
          endpoint: subscription.endpoint,
          userAgent,
          ipAddress,
          locale,
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
      }
    }

    return NextResponse.json(
      {
        success: true,
        status: 'pending',
        message:
          locale === 'en'
            ? 'Check your email to confirm push notifications.'
            : 'Skontrolujte email a potvrďte push notifikácie.',
      },
      { status: 202 }
    );
  } catch (error) {
    apiLogger.error('Error saving push subscription', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

