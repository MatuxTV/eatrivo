import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { db } from "@/index";
import {
  userProfiles,
  shoppingLists,
  aiInsights,
  userInfoTable,
  mealPlans,
} from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { EatrivoAIService } from "../../../lib/langchain";
import { CacheService } from "@/lib/cache";
import { logger } from "@/lib/logger";

const STATIC_FALLBACK = {
  week: [
    {
      day: "Pondelok",
      meals: [
        { name: "Ovosné müsli s jogurtom", prepTime: 5, difficulty: "ľahké", calories: 320, protein: 12, carbs: 45, fat: 8 },
        { name: "Kuracie prsia s ryžou", prepTime: 25, difficulty: "stredne", calories: 480, protein: 42, carbs: 55, fat: 12 },
        { name: "Grilovaná zelenina s tofu", prepTime: 20, difficulty: "ľahké", calories: 350, protein: 18, carbs: 35, fat: 15 }
      ]
    }
  ]
};

export async function POST(_request: NextRequest) {
  logger.debug('\n🚀 ========== MEAL PLAN API CALLED ==========');
  
  try {
    // 1️⃣ AUTH CHECK
    logger.debug('\n1️⃣ Checking authentication...');
    const session = await auth();
    
    if (!session?.user?.id) {
      logger.warn('❌ No session found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  logger.debug('✅ User authenticated:', session.user.id);
  logger.debug('   User email:', session.user.email);

  // 2️⃣ USER PROFILE
  logger.debug('\n2️⃣ Fetching user profile...');
  logger.debug("",userProfiles.userId);
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

    if (!userProfile) {
      logger.warn('❌ User profile not found for userId:', session.user.id);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }
  logger.debug('✅ User profile found:', userProfile.id);
  logger.debug('   Full name:', userProfile.fullName);
  logger.debug('   Profile complete:', userProfile.isProfileComplete);

  // 3️⃣ USER INFO
  logger.debug('\n3️⃣ Fetching user info...');
    const [userInfo] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfile.id));

    if (!userInfo) {
      logger.warn('❌ User info not found - profile incomplete');
      return NextResponse.json(
        {
          success: false,
          error: "User profile incomplete",
          message: "Please complete your profile setup first",
          redirectTo: "/onboarding",
        },
        { status: 422 }
      );
    }
  logger.debug('✅ User info found');
  logger.debug('   Age:', userInfo.age);
  logger.debug('   Weight:', userInfo.weight);
  logger.debug('   Goal:', userInfo.goal);
  logger.debug('   Activity:', userInfo.activity_level);

  // 4️⃣ SHOPPING LISTS
  logger.debug('\n4️⃣ Calculating week start...');
    const now = new Date();
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    // Create start of week in local timezone (not UTC)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Convert to ISO string but keep local date (strip timezone for DB comparison)
    const startOfWeekLocal = new Date(startOfWeek.getTime() - startOfWeek.getTimezoneOffset() * 60000);
    
  logger.debug('   Current date:', now.toISOString());
  logger.debug('   Current day of week:', currentDay, '(0=Sun, 1=Mon, ...)');
  logger.debug('   Week starts (local):', startOfWeek.toLocaleString('sk-SK'));
  logger.debug('   Week starts (for DB):', startOfWeekLocal.toISOString());

  logger.debug('\n5️⃣ Fetching shopping lists...');
  logger.debug('   Strategy 1: Try finding by weekStartDate first...');

    // Try to find by weekStartDate (more reliable)
    let userShoppingLists = await db
      .select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfile.id),
          gte(shoppingLists.weekStartDate, startOfWeekLocal)
        )
      )
      .orderBy(desc(shoppingLists.created_at));

  logger.debug('   Found by weekStartDate:', userShoppingLists.length);

    // Fallback: Try last 7 days by created_at
    if (userShoppingLists.length === 0) {
  logger.debug('   Strategy 2: Trying last 7 days by created_at...');
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const sevenDaysAgoLocal = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000);

      userShoppingLists = await db
        .select()
        .from(shoppingLists)
        .where(
          and(
            eq(shoppingLists.userProfileId, userProfile.id),
            gte(shoppingLists.created_at, sevenDaysAgoLocal)
          )
        )
        .orderBy(desc(shoppingLists.created_at));

  logger.debug('   Found by created_at (last 7 days):', userShoppingLists.length);
    }

    // Ultimate fallback: Get any shopping list for this user
    if (userShoppingLists.length === 0) {
  logger.debug('   Strategy 3: Getting ANY shopping list for this user...');
      userShoppingLists = await db
        .select()
        .from(shoppingLists)
        .where(eq(shoppingLists.userProfileId, userProfile.id))
        .orderBy(desc(shoppingLists.created_at))
        .limit(1);

  logger.debug('   Found (any):', userShoppingLists.length);
      
      if (userShoppingLists.length > 0) {
        logger.warn('   ⚠️  Using older shopping list - not from current week');
        logger.debug('   Shopping list created:', userShoppingLists[0].created_at);
        logger.debug('   Shopping list weekStart:', userShoppingLists[0].weekStartDate);
      }
    }

  logger.debug('\n   📊 Final result: Found', userShoppingLists.length, 'shopping list(s)');
    
    if (userShoppingLists.length === 0) {
    logger.warn('❌ No shopping lists found for this week');
      return NextResponse.json({
        success: true,
        insights: { week: [] },
        cached: false,
        message: "No shopping lists found for this week. Upload a shopping list to get personalized meal plans.",
        fallbackUsed: 'no-data'
      });
    }

    const latestShoppingList = userShoppingLists[0];
  logger.debug('✅ Using latest shopping list:', latestShoppingList.id);
  logger.debug('   Title:', latestShoppingList.title);
  logger.debug('   Created:', latestShoppingList.created_at);
  logger.debug('   Markdown length:', latestShoppingList.markdownContent?.length || 0);

    // 6️⃣ CACHE CHECK
    const cacheKey = `meal-plan:${latestShoppingList.id}`;
  logger.debug(`\n6️⃣ Checking cache with key: ${cacheKey}`);
    
    const cachedMealPlan = await CacheService.get(cacheKey);

    if (cachedMealPlan) {
  logger.debug('✅ CACHE HIT! Returning cached meal plan');
  logger.debug('   Cached data type:', typeof cachedMealPlan);
  logger.debug('   Has week array:', !!(cachedMealPlan as any)?.week);
      
      return NextResponse.json({
        success: true,
        insights: cachedMealPlan,
        cached: true,
        cacheKey,
        message: "Returning cached meal plan"
      });
    }

  logger.debug('❌ Cache MISS');

    // 7️⃣ DATABASE CHECK
  logger.debug('\n7️⃣ Checking database for existing meal plan...');
    const [existingMealPlan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.shoppingListId, latestShoppingList.id))
      .orderBy(desc(mealPlans.created_at))
      .limit(1);

    if (existingMealPlan) {
  logger.debug('✅ DATABASE HIT! Found existing meal plan');
  logger.debug('   Meal plan ID:', existingMealPlan.id);
  logger.debug('   Created at:', existingMealPlan.created_at);
  logger.debug('   Meals data type:', typeof existingMealPlan.meals);
  logger.debug('   Has week array:', !!(existingMealPlan.meals as any)?.week);
      
      // Cache it for 1 hour
      await CacheService.set(cacheKey, existingMealPlan.meals, 3600);
  logger.debug('   ✅ Saved to cache for future requests');
      
      return NextResponse.json({
        success: true,
        insights: existingMealPlan.meals,
        cached: false,
        fromDatabase: true,
        mealPlanId: existingMealPlan.id,
        message: "Returning meal plan from database"
      });
    }

  logger.debug('❌ Database MISS - need to generate new meal plan');

    // 8️⃣ PREPARE AI DATA
  logger.debug('\n8️⃣ Preparing user data for AI...');
    const userInfoForAi = {
      age: userInfo.age || 25,
      weight: Number(userInfo.weight) || 70,
      height: userInfo.height || 170,
      sex: userInfo.sex || "man",
      goal: userInfo.goal || "maintain_weight",
      activityLevel: userInfo.activity_level || "moderately_active",
      mealsPerDay: userInfo.meal_per_day || 3,
      maxPrepTime: userInfo.cooking_time_pref || "normal",
      dietType: userInfo.diet_preferences || "none",
      budget: userInfo.budget_preference || "medium",
      likedFoods: userInfo.likes || "",
      dislikedFoods: userInfo.dislikes || "",
      allergies: userInfo.allergies || "",
    };
  logger.debug('   User data prepared:', JSON.stringify(userInfoForAi, null, 2));

    // 9️⃣ AI GENERATION
  logger.debug('\n9️⃣ Calling AI to generate meal plan...');
    let mealPlan;
    let fallbackUsed = 'none';

    try {
      const shoppingData = {
        markdown: latestShoppingList.markdownContent
      };

  logger.debug('   Calling EatrivoAIService.generateWeeklyMealPlan...');
      
      mealPlan = await EatrivoAIService.generateWeeklyMealPlan(
        userInfoForAi,
        shoppingData
      );

  logger.debug('✅ AI generation completed');
  logger.debug('   Meal plan structure:', JSON.stringify(Object.keys(mealPlan), null, 2));
  logger.debug('   Has week array:', !!mealPlan?.week);
  logger.debug('   Week length:', mealPlan?.week?.length);
      
    } catch (aiError) {
  logger.error('❌ AI generation FAILED:', aiError);
  logger.error('   Error type:', aiError instanceof Error ? aiError.constructor.name : typeof aiError);
  logger.error('   Error message:', aiError instanceof Error ? aiError.message : String(aiError));
      
      mealPlan = STATIC_FALLBACK;
      fallbackUsed = 'static';
  logger.warn('⚠️  Using STATIC_FALLBACK');
    }

    // 🔟 SAVE TO CACHE & DATABASE
    if (fallbackUsed === 'none') {
    logger.debug('\n🔟 Saving generated meal plan...');
      
      // Save to cache
  logger.debug('   Saving to cache (1 hour)...');
      await CacheService.set(cacheKey, mealPlan, 3600);
  logger.debug(`   ✅ Cached: ${cacheKey}`);

      // Save to database
      try {
  logger.debug('   Saving to database...');
        await db.insert(mealPlans).values({
          userProfileId: userProfile.id,
          shoppingListId: latestShoppingList.id,
          weekStartDate: latestShoppingList.weekStartDate,
          weekEndDate: latestShoppingList.weekEndDate,
          meals: mealPlan,
        }).returning();

  logger.debug('   ✅ Saved to DB');
      } catch (dbError) {
  logger.error('   ⚠️ Database save failed:', dbError);
      }
    }

    // 1️⃣1️⃣ AI INSIGHTS (OPTIONAL)
  logger.debug('\n1️⃣1️⃣ Saving to AI insights audit trail...');
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);

    try {
      await db.insert(aiInsights).values({
        userProfileId: userProfile.id,
        insightType: "meal_plan",
        title: `Meal Plan - ${new Date().toLocaleDateString("sk")}`,
        content: mealPlan,
        metadata: {
          shoppingListId: latestShoppingList.id,
          shoppingListCount: userShoppingLists.length,
          generationTime: new Date().toISOString(),
          fallbackUsed,
          version: "3.0",
        },
        expiresAt: expirationDate,
      });
  logger.debug('   ✅ Saved to ai_insights');
    } catch (dbError) {
  logger.error('   ⚠️ AI insights save failed (non-critical):', dbError);
    }

    // 1️⃣2️⃣ RETURN RESPONSE
  logger.debug('\n1️⃣2️⃣ Returning response...');
    const response = {
      success: true,
      insights: mealPlan,
      cached: false,
      fallbackUsed,
      shoppingListId: latestShoppingList.id,
      generatedAt: new Date().toISOString(),
      message: fallbackUsed === 'static' 
        ? 'Using fallback meal plan due to AI error'
        : 'Fresh meal plan generated'
    };
    
    logger.debug('   Response structure:', JSON.stringify({
      ...response,
      insights: '... (meal plan data)'
    }, null, 2));
    logger.debug('\n✅ ========== MEAL PLAN API COMPLETED ==========\n');
    
    return NextResponse.json(response);

  } catch (error) {
  logger.error("\n❌ ========== CRITICAL ERROR ==========");
  logger.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
  logger.error("Error message:", error instanceof Error ? error.message : String(error));
  logger.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
  logger.error("========================================\n");
    
    // ULTIMATE FALLBACK
    return NextResponse.json({
      success: true,
      insights: STATIC_FALLBACK,
      cached: false,
      fallbackUsed: 'error',
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Using fallback meal plan due to system error"
    }, { status: 200 });
  }
}