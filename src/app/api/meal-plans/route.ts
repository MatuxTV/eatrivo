import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { db } from '@/index'
import { userProfiles, shoppingLists, aiInsights,userInfoTable } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { EatrivoAIService } from '../../../lib/langchain'
import { CacheService } from '@/lib/cache'

export async function POST(request: NextRequest) {
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

    // Check Redis cache first
    const cacheKey = `ai-insights:${userProfile.id}:${new Date().toISOString().slice(0, 10)}`
    const cachedInsights = await CacheService.get(cacheKey)
    
    if (cachedInsights) {
      console.log('🧠 AI insights cache hit')
      return NextResponse.json({ success: true, insights: cachedInsights, cached: true })
    }

    // Get user's recent shopping lists
    const userShoppingLists = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.userProfileId, userProfile.id))
      .orderBy(desc(shoppingLists.created_at))
      .limit(5) // Last 5 shopping lists

    console.log('🤖 Generating AI insights for:', userProfile.fullName)

    // Generate AI insights
    const personalizedInsights = await EatrivoAIService.generateInsightsFromUserData(
      userProfile, 
      userShoppingLists
    )

    const shoppingAnalysis = await EatrivoAIService.analyzeShoppingListPatterns(
      userShoppingLists
    )

    // Combine insights
    const combinedInsights = {
      ...personalizedInsights,
      ...shoppingAnalysis,
      metadata: {
        userId: userProfile.id,
        generatedAt: new Date().toISOString(),
        shoppingListsAnalyzed: userShoppingLists.length,
        userGoal: userInfoTable.activity_level,
        userDateOfBirth: userInfoTable.age
      }
    }

    // Save to database
    const expirationDate = new Date()
    expirationDate.setHours(expirationDate.getHours() + 24) // Expire in 24 hours

    const [savedInsight] = await db
      .insert(aiInsights)
      .values({
        userProfileId: userProfile.id,
        insightType: 'comprehensive_analysis',
        title: `AI Analýza pre ${userProfile.fullName} - ${new Date().toLocaleDateString('sk')}`,
        content: combinedInsights,
        metadata: {
          shoppingListCount: userShoppingLists.length,
          generationTime: new Date().toISOString(),
          version: '1.0'
        },
        expiresAt: expirationDate
      })
      .returning()

    // Cache in Redis for 6 hours
    await CacheService.set(cacheKey, combinedInsights, 21600)

    return NextResponse.json({
      success: true,
      insights: combinedInsights,
      insightId: savedInsight.id,
      cached: false,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI insights generation failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate AI insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}