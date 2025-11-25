import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/index';
import { shoppingLists, userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CacheService } from '@/lib/cache';
import { apiLogger } from '@/lib/logger';

// POST endpoint - Save shopping list to database (with markdown content)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      weekStartDate,
      weekEndDate,
      status,
      userProfileId,
      markdownContent
    } = body;

    // Validate required fields
    if (!title || !weekStartDate || !weekEndDate || !userProfileId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, weekStartDate, weekEndDate, userProfileId' },
        { status: 400 }
      );
    }

    if (!markdownContent || !markdownContent.trim()) {
      return NextResponse.json(
        { error: 'markdownContent is required' },
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
        markdownContent,
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
