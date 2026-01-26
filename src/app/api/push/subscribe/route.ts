import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/index';
import { pushSubscriptions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || null;

    // Check if subscription already exists for this endpoint
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
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          subscription: subscription,
          userAgent: userAgent,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existingSubscription[0].id));
      
      apiLogger.info('Updated existing push subscription', { userId: session.user.id });
    } else {
      // Insert new subscription
      await db.insert(pushSubscriptions).values({
        userId: session.user.id,
        subscription: subscription,
        userAgent: userAgent,
      });
      
      apiLogger.info('Created new push subscription', { userId: session.user.id });
    }

    return NextResponse.json(
      { success: true, message: 'Subscription saved successfully' },
      { status: 200 }
    );
  } catch (error) {
    apiLogger.error('Error saving push subscription', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

