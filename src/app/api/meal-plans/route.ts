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
import { apiLogger } from "@/lib/logger";

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
  apiLogger.info('🚀 ========== MEAL PLAN API CALLED ==========', { metadata: { route: 'meal-plans' } });
  
  try {
  // 1️⃣ AUTH CHECK
  apiLogger.debug('1️⃣ Checking authentication...');
    const session = await auth();
    
    if (!session?.user?.id) {
      apiLogger.warn('❌ No session found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    apiLogger.info('✅ User authenticated', { metadata: { userId: session.user.id, email: session.user.email } });

  // 2️⃣ USER PROFILE
  apiLogger.debug('2️⃣ Fetching user profile...', { metadata: { userId: session.user.id } });
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

    if (!userProfile) {
      apiLogger.warn('❌ User profile not found', { metadata: { userId: session.user.id } });
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }
    apiLogger.info('✅ User profile found', { metadata: { profileId: userProfile.id, fullName: userProfile.fullName, profileComplete: userProfile.isProfileComplete } });

  // 3️⃣ USER INFO
  apiLogger.debug('3️⃣ Fetching user info...', { metadata: { profileId: userProfile.id } });
    const [userInfo] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfile.id));

    if (!userInfo) {
      apiLogger.warn('❌ User info not found - profile incomplete', { metadata: { profileId: userProfile.id } });
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
    apiLogger.info('✅ User info found', { metadata: userInfo });

  // 4️⃣ SHOPPING LISTS
  apiLogger.debug('4️⃣ Calculating week start...');
    const now = new Date();
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    // Create start of week in local timezone (not UTC)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Convert to ISO string but keep local date (strip timezone for DB comparison)
    const startOfWeekLocal = new Date(startOfWeek.getTime() - startOfWeek.getTimezoneOffset() * 60000);
    
  apiLogger.debug('   Current date', { metadata: { now: now.toISOString() } });
  apiLogger.debug('   Current day of week', { metadata: { currentDay } });
  apiLogger.debug('   Week starts (local)', { metadata: { local: startOfWeek.toLocaleString('sk-SK') } });
  apiLogger.debug('   Week starts (for DB)', { metadata: { iso: startOfWeekLocal.toISOString() } });

  apiLogger.debug('5️⃣ Fetching shopping lists...');
  apiLogger.debug('   Strategy 1: Try finding by weekStartDate first...');

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

  apiLogger.debug('   Found by weekStartDate', { metadata: { count: userShoppingLists.length } });

    // Fallback: Try last 7 days by created_at
    if (userShoppingLists.length === 0) {
  apiLogger.debug('   Strategy 2: Trying last 7 days by created_at...');
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

  apiLogger.debug('   Found by created_at (last 7 days)', { metadata: { count: userShoppingLists.length } });
    }

    // Ultimate fallback: Get any shopping list for this user
    if (userShoppingLists.length === 0) {
  apiLogger.debug('   Strategy 3: Getting ANY shopping list for this user...');
      userShoppingLists = await db
        .select()
        .from(shoppingLists)
        .where(eq(shoppingLists.userProfileId, userProfile.id))
        .orderBy(desc(shoppingLists.created_at))
        .limit(1);

  apiLogger.debug('   Found (any)', { metadata: { count: userShoppingLists.length } });
      
      if (userShoppingLists.length > 0) {
    apiLogger.warn('⚠️  Using older shopping list - not from current week', { metadata: { shoppingListId: userShoppingLists[0].id } });
    apiLogger.debug('   Shopping list created', { metadata: { createdAt: userShoppingLists[0].created_at } });
    apiLogger.debug('   Shopping list weekStart', { metadata: { weekStart: userShoppingLists[0].weekStartDate } });
      }
    }

  apiLogger.info('📊 Final result: Found shopping lists', { metadata: { count: userShoppingLists.length } });
    
    if (userShoppingLists.length === 0) {
  apiLogger.warn('❌ No shopping lists found for this week', { metadata: { userId: session.user.id } });
      return NextResponse.json({
        success: true,
        insights: { week: [] },
        cached: false,
        message: "No shopping lists found for this week. Upload a shopping list to get personalized meal plans.",
        fallbackUsed: 'no-data'
      });
    }

    const latestShoppingList = userShoppingLists[0];
  apiLogger.info('✅ Using latest shopping list', { metadata: { shoppingListId: latestShoppingList.id, title: latestShoppingList.title, createdAt: latestShoppingList.created_at, markdownLength: latestShoppingList.markdownContent?.length || 0 } });

    // 6️⃣ CACHE CHECK
    const cacheKey = `meal-plan:${latestShoppingList.id}`;
  apiLogger.debug('6️⃣ Checking cache', { metadata: { cacheKey } });
    
    const cachedMealPlan = await CacheService.get(cacheKey);

    if (cachedMealPlan) {
  apiLogger.info('✅ CACHE HIT! Returning cached meal plan', { metadata: { cacheKey } });
  apiLogger.debug('   Cached data type', { metadata: { type: typeof cachedMealPlan } });
  apiLogger.debug('   Has week array', { metadata: { hasWeek: Array.isArray((cachedMealPlan as { week?: unknown })?.week) } });
      
      return NextResponse.json({
        success: true,
        insights: cachedMealPlan,
        cached: true,
        cacheKey,
        message: "Returning cached meal plan"
      });
    }

  apiLogger.debug('❌ Cache MISS', { metadata: { cacheKey } });

    // 7️⃣ DATABASE CHECK
  apiLogger.debug('7️⃣ Checking database for existing meal plan...');
    const [existingMealPlan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.shoppingListId, latestShoppingList.id))
      .orderBy(desc(mealPlans.created_at))
      .limit(1);

    if (existingMealPlan) {
  apiLogger.info('✅ DATABASE HIT! Found existing meal plan', { metadata: { mealPlanId: existingMealPlan.id } });
  apiLogger.debug('   Created at', { metadata: { createdAt: existingMealPlan.created_at } });
  apiLogger.debug('   Meals data type', { metadata: { type: typeof existingMealPlan.meals } });
  apiLogger.debug('   Has week array', { metadata: { hasWeek: Array.isArray((existingMealPlan.meals as { week?: unknown })?.week) } });
      
      // Cache it for 1 hour
      await CacheService.set(cacheKey, existingMealPlan.meals, 3600);
  apiLogger.debug('   ✅ Saved to cache for future requests', { metadata: { cacheKey } });
      
      return NextResponse.json({
        success: true,
        insights: existingMealPlan.meals,
        cached: false,
        fromDatabase: true,
        mealPlanId: existingMealPlan.id,
        message: "Returning meal plan from database"
      });
    }

  apiLogger.debug('❌ Database MISS - need to generate new meal plan');

    // 8️⃣ PREPARE AI DATA
  apiLogger.debug('8️⃣ Preparing user data for AI...');
    const userInfoForAi = {
      dateOfBirth: userInfo.date_of_birth || "1990-01-01",
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
  apiLogger.debug('   User data prepared', { metadata: userInfoForAi });

    // 9️⃣ AI GENERATION
  apiLogger.debug('9️⃣ Calling AI to generate meal plan...');
    let mealPlan;
    let fallbackUsed = 'none';

    try {
      const shoppingData = {
        markdown: latestShoppingList.markdownContent
      };

  apiLogger.debug('   Calling EatrivoAIService.generateWeeklyMealPlan...');
      
      mealPlan = await EatrivoAIService.generateWeeklyMealPlan(
        userInfoForAi,
        shoppingData
      );

  apiLogger.info('✅ AI generation completed');
  apiLogger.debug('   Meal plan structure', { metadata: { keys: Object.keys(mealPlan) } });
  apiLogger.debug('   Has week array', { metadata: { hasWeek: !!mealPlan?.week } });
  apiLogger.debug('   Week length', { metadata: { weekLength: mealPlan?.week?.length } });
      
    } catch (aiError) {
      apiLogger.error('❌ AI generation FAILED', aiError);
      apiLogger.error('   Error type', aiError instanceof Error ? aiError.constructor.name : typeof aiError);
      apiLogger.error('   Error message', aiError instanceof Error ? aiError.message : String(aiError));
      mealPlan = STATIC_FALLBACK;
      fallbackUsed = 'static';
      apiLogger.warn('⚠️  Using STATIC_FALLBACK');
    }

    // 🔟 SAVE TO CACHE & DATABASE
    if (fallbackUsed === 'none') {
      apiLogger.debug('🔟 Saving generated meal plan...');
      // Save to cache
      apiLogger.debug('   Saving to cache (1 hour)...', { metadata: { cacheKey } });
      await CacheService.set(cacheKey, mealPlan, 3600);
      apiLogger.debug('   ✅ Cached', { metadata: { cacheKey } });
      // Save to database
      try {
        apiLogger.debug('   Saving to database...', { metadata: { shoppingListId: latestShoppingList.id } });
        await db.insert(mealPlans).values({
          userProfileId: userProfile.id,
          shoppingListId: latestShoppingList.id,
          weekStartDate: latestShoppingList.weekStartDate,
          weekEndDate: latestShoppingList.weekEndDate,
          meals: mealPlan,
        }).returning();
        apiLogger.debug('   ✅ Saved to DB', { metadata: { shoppingListId: latestShoppingList.id } });
      } catch (dbError) {
        apiLogger.error('⚠️ Database save failed', dbError);
      }
    }

    // 1️⃣1️⃣ AI INSIGHTS (OPTIONAL)
  apiLogger.debug('1️⃣1️⃣ Saving to AI insights audit trail...');
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
      apiLogger.debug('   ✅ Saved to ai_insights', { metadata: { shoppingListId: latestShoppingList.id } });
    } catch (dbError) {
      apiLogger.error('⚠️ AI insights save failed (non-critical)', dbError);
    }

    // 1️⃣2️⃣ RETURN RESPONSE
  apiLogger.debug('1️⃣2️⃣ Returning response...');
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
    
    apiLogger.debug('   Response structure', { metadata: { ...response, insights: '... (meal plan data)' } });
    apiLogger.info('✅ ========== MEAL PLAN API COMPLETED ==========', { metadata: { route: 'meal-plans' } });
    
    return NextResponse.json(response);

  } catch (error) {
    apiLogger.error('❌ ========== CRITICAL ERROR ==========', error);
    apiLogger.error('Error type', error instanceof Error ? error.constructor.name : typeof error);
    apiLogger.error('Error message', error instanceof Error ? error.message : String(error));
    apiLogger.error('Stack trace', error instanceof Error ? error.stack : 'No stack trace');
    apiLogger.error('========================================', { metadata: { route: 'meal-plans' } });
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