import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { v2 as cloudinary } from 'cloudinary'
import { db } from '@/index'
import { mealPlans, mealPlanDownloads, userProfiles, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(params)

    // Get user profile and meal plan
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get meal plan and verify ownership
    const [mealPlan] = await db
      .select({
        id: mealPlans.id,
        title: mealPlans.title,
        cloudinaryPublicId: mealPlans.cloudinaryPublicId,
        userProfileId: mealPlans.userProfileId,
      })
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.id, params.id),
          eq(mealPlans.userProfileId, userProfile.id)
        )
      )

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    // Get user membership for access control
    const [user] = await db
      .select({ membership: users.membership })
      .from(users)
      .where(eq(users.id, session.user.id))

    // Generate secure download URL using Cloudinary's private download method
    // This method handles all signature generation internally without exposing secrets
    const privateDownloadUrl = cloudinary.utils.private_download_url(
      mealPlan.cloudinaryPublicId,
      'pdf',
      {
        resource_type: 'raw',
        attachment: true,
        expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      }
    );

    // Track download
    await db.insert(mealPlanDownloads).values({
      mealPlanId: mealPlan.id,
      userProfileId: userProfile.id,
    })

    return NextResponse.json({ 
      downloadUrl: privateDownloadUrl, // Use Cloudinary's secure private download
      filename: `${mealPlan.title}.pdf`,
      expiresIn: 300, // seconds
      userMembership: user?.membership || 'basic'
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}