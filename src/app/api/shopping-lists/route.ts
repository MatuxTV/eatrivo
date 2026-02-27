import type {NextRequest } from 'next/server';
import { NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { db } from '@/index'
import { shoppingLists, userProfiles } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { CacheService } from '@/lib/redis'
import { apiLogger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rateLimit'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, 'standard')
    if (!rl.success) return rl.response!

    const cacheKey = `shopping-lists:${session.user.id}`
    const membership = session.user.membership?.toLowerCase() || 'basic'

    // Try Redis cache first (10 minute TTL for shopping lists)
    const cachedData = await CacheService.get(cacheKey)
    if (cachedData) {
      apiLogger.debug('Shopping lists cache HIT', { metadata: { userId: session.user.id } })
      return NextResponse.json({
        ...cachedData,
        cached: true
      })
    }

    apiLogger.debug('Shopping lists cache MISS', { metadata: { userId: session.user.id } })

    // Database fallback
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userShoppingLists = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.userProfileId, userProfile.id))
      .orderBy(desc(shoppingLists.created_at))

    // AUTO-ASSIGN TEMPLATE FOR BASIC USERS IF NO SHOPPING LISTS EXIST — temporarily disabled
    // if (userShoppingLists.length === 0 && membership === 'basic') {
    //   apiLogger.info('No shopping lists found for basic user, attempting template assignment', {
    //     metadata: { userId: session.user.id, userProfileId: userProfile.id }
    //   })
    //
    //   try {
    //     const { assignTemplateToUser } = await import('@/lib/template-assignment')
    //     const assignmentResult = await assignTemplateToUser(userProfile.id)
    //
    //     if (assignmentResult.shoppingList) {
    //       apiLogger.info('Template auto-assigned to basic user on-demand', {
    //         metadata: {
    //           userId: session.user.id,
    //           shoppingListId: assignmentResult.shoppingList.id,
    //           mealPlanId: assignmentResult.mealPlan?.id,
    //         }
    //       })
    //
    //       // Return the newly assigned shopping list
    //       const response = {
    //         success: true,
    //         shoppingLists: [assignmentResult.shoppingList],
    //         total: 1,
    //         templateAssigned: true
    //       }
    //
    //       // Cache the result
    //       await CacheService.set(cacheKey, response, 600)
    //
    //       return NextResponse.json(response)
    //     } else {
    //       apiLogger.warn('Template assignment returned no shopping list', {
    //         metadata: {
    //           userId: session.user.id,
    //           fallbackReason: assignmentResult.fallbackReason
    //         }
    //       })
    //     }
    //   } catch (assignmentError) {
    //     apiLogger.error('Failed to auto-assign template for basic user', assignmentError, {
    //       metadata: { userId: session.user.id, userProfileId: userProfile.id }
    //     })
    //     // Continue to return empty list instead of failing
    //   }
    // }

    const response = {
      success: true,
      shoppingLists: userShoppingLists,
      total: userShoppingLists.length
    }

    // Cache for 10 minutes (600 seconds)
    await CacheService.set(cacheKey, response, 600)

    return NextResponse.json(response)
  } catch (error) {
    apiLogger.error('Failed to fetch shopping lists', error, {
      metadata: { userId: (await auth())?.user?.id }
    })
    return NextResponse.json(
      { error: 'Failed to fetch shopping lists' },
      { status: 500 }
    )
  }
}