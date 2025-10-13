import { NextResponse,NextRequest } from 'next/server'
import { auth } from '../../../../auth'
import { db } from '@/index'
import { shoppingLists, userProfiles } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { CacheService } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cacheKey = `shopping-lists:${session.user.id}`


    const cachedData = await CacheService.get(cacheKey)
    if (cachedData) {
      console.log('📋 Cache hit for shopping lists')
      return NextResponse.json(cachedData)
    }

    // Database fallback
    console.log('🔄 Cache miss - fetching from database')
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

    const response = {
      success: true,
      shoppingLists: userShoppingLists,
      total: userShoppingLists.length
    }

    // Cache for 5 minutes
    await CacheService.set(cacheKey, response, 300)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch shopping lists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shopping lists' },
      { status: 500 }
    )
  }
}