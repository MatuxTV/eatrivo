import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { v2 as cloudinary } from 'cloudinary'
import { db } from '@/index'
import { shoppingLists, shoppingListDownloads, userProfiles, users } from '@/db/schema'
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

    // Get shopping list and verify ownership
    const [shoppingList] = await db
      .select({
        id: shoppingLists.id,
        title: shoppingLists.title,
        cloudinaryPublicId: shoppingLists.cloudinaryPublicId,
        userProfileId: shoppingLists.userProfileId,
      })
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.id, params.id),
          eq(shoppingLists.userProfileId, userProfile.id)
        )
      )

    if (!shoppingList) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 })
    }

    // Get user membership for access control
    const [user] = await db
      .select({ membership: users.membership })
      .from(users)
      .where(eq(users.id, session.user.id))

    // Get cloud name from environment
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    
    // Construct the full Cloudinary public ID with folder path
    const fullPublicId = `eatrivo/shopping-lists/${shoppingList.cloudinaryPublicId}`;
    
    // Simple direct Cloudinary URL format
    // For PDFs, we use 'image' or 'raw' in the URL path
    const downloadUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${fullPublicId}.pdf`;

    console.log('Generated Download URL:', downloadUrl);

    // Track download
    await db.insert(shoppingListDownloads).values({
      shoppingListId: shoppingList.id,
      userProfileId: userProfile.id,
    })

    return NextResponse.json({ 
      downloadUrl: downloadUrl,
      filename: `${shoppingList.title}.pdf`,
      userMembership: user?.membership || 'basic'
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}