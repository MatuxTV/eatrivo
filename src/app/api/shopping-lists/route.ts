import { NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { db } from '@/index'
import { shoppingLists, userProfiles } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get user's shopping lists
    const userShoppingLists = await db
      .select({
        id: shoppingLists.id,
        title: shoppingLists.title,
        description: shoppingLists.description,
        weekStartDate: shoppingLists.weekStartDate,
        weekEndDate: shoppingLists.weekEndDate,
        status: shoppingLists.status,
        cloudinaryPublicId: shoppingLists.cloudinaryPublicId,
        createdAt: shoppingLists.created_at,
      })
      .from(shoppingLists)
      .where(eq(shoppingLists.userProfileId, userProfile.id))
      .orderBy(desc(shoppingLists.created_at))

    return NextResponse.json({ 
      shoppingLists: userShoppingLists,
      userProfileId: userProfile.id
    })
  } catch (error) {
            console.error('Error fetching shopping lists:', error)
    return NextResponse.json({ error: 'Failed to fetch shopping lists' }, { status: 500 })
  }
}