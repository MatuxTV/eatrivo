import { NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { db } from '@/index'
import { mealPlans, userProfiles } from '@/db/schema'
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

    // Get user's meal plans
    const userMealPlans = await db
      .select({
        id: mealPlans.id,
        title: mealPlans.title,
        description: mealPlans.description,
        weekStartDate: mealPlans.weekStartDate,
        weekEndDate: mealPlans.weekEndDate,
        status: mealPlans.status,
        cloudinaryPublicId: mealPlans.cloudinaryPublicId,
        createdAt: mealPlans.created_at,
      })
      .from(mealPlans)
      .where(eq(mealPlans.userProfileId, userProfile.id))
      .orderBy(desc(mealPlans.created_at))

    return NextResponse.json({ 
      mealPlans: userMealPlans,
      userProfileId: userProfile.id
    })
  } catch (error) {
    console.error('Error fetching meal plans:', error)
    return NextResponse.json({ error: 'Failed to fetch meal plans' }, { status: 500 })
  }
}