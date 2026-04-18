import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth, isAuthError } from "@/lib/adminAuth";
import { db } from '@/index';
import { shoppingLists, userProfiles, pushSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CacheService } from '@/lib/redis';
import { apiLogger } from '@/lib/logger';
import webpush from 'web-push';

// Set up web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && process.env.ADMIN_EMAIL) {
  webpush.setVapidDetails(
    `mailto:${process.env.ADMIN_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// POST endpoint - Save shopping list to database (with markdown content)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const {
      title,
      description,
      weekStartDate,
      weekEndDate,
      status,
      userProfileId
    } = body;

    // Validate required fields
    if (!title || !weekStartDate || !weekEndDate || !userProfileId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, weekStartDate, weekEndDate, userProfileId' },
        { status: 400 }
      );
    }

    apiLogger.info('Saving shopping list to database', {
      metadata: {
        title,
        userProfileId,
        weekStartDate
      }
    });

    // Create shopping list in database
    const [newShoppingList] = await db
      .insert(shoppingLists)
      .values({
        userProfileId,
        title,
        description: description || null,
        weekStartDate: new Date(weekStartDate),
        weekEndDate: new Date(weekEndDate),
        status: status || 'active',
      })
      .returning();

    // Invalidate relevant caches
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userProfileId));

    if (userProfile) {
      const weekStart = new Date(weekStartDate);
      const cacheInvalidations = [
        CacheService.del(`shopping-lists:${userProfile.userId}`),
        CacheService.del(`meal-plan:${newShoppingList.id}`),
        CacheService.del(`user-meal-plan:${userProfileId}:${weekStart.toISOString().split('T')[0]}`),
        CacheService.invalidatePattern(`user-meal-plan:${userProfileId}:*`)
      ];

      await Promise.allSettled(cacheInvalidations);

      // Send Push Notification
      try {
        if (VAPID_PRIVATE_KEY) {
          const subscriptions = await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, userProfile.userId));

          if (subscriptions.length > 0) {
            const payload = JSON.stringify({
              title: 'New Shopping List!',
              body: `A new shopping list "${title}" has been created for you.`,
              url: '/home?section=pantry',
              icon: '/logo/icon-192x192.png'
            });

            await Promise.allSettled(
              subscriptions.map(sub => 
                webpush.sendNotification(
                  sub.subscription as webpush.PushSubscription, 
                  payload
                ).catch(err => {
                  if (err.statusCode === 410) {
                    // Delete expired subscription
                    return db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
                  }
                  apiLogger.error('Error sending push notification', err);
                })
              )
            );
          }
        }
      } catch (pushError) {
        apiLogger.error('Failed to send push notifications', pushError);
      }
    }

    apiLogger.info('Shopping list saved successfully', {
      metadata: { shoppingListId: newShoppingList.id }
    });

    return NextResponse.json(
      {
        success: true,
        shoppingList: newShoppingList,
        message: 'Shopping list saved successfully'
      },
      { status: 201 }
    );

  } catch (error) {
    apiLogger.error('Failed to save shopping list', error);
    return NextResponse.json(
      { error: 'Failed to save shopping list' },
      { status: 500 }
    );
  }
}
