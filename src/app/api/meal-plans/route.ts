import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  // console.log('\n🚀 ========== MEAL PLAN API CALLED ==========');
  // console.log('⏰ Timestamp:', new Date().toISOString());
  
  try {
    // 1️⃣ AUTH CHECK
    // console.log('\n1️⃣ Checking authentication...');
    const session = await auth();
    
    if (!session?.user?.id) {
      // console.log('❌ No session found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // console.log('✅ User authenticated:', session.user.id);
    // console.log('   User email:', session.user.email);

    // 2️⃣ USER PROFILE
    // console.log('\n2️⃣ Fetching user profile...');
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

    if (!userProfile) {
      // console.log('❌ User profile not found for userId:', session.user.id);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }
    // console.log('✅ User profile found:', userProfile.id);
    // console.log('   Full name:', userProfile.fullName);
    // console.log('   Profile complete:', userProfile.isProfileComplete);

    // 3️⃣ USER INFO
    // console.log('\n3️⃣ Fetching user info...');
    const [userInfo] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfile.id));

    if (!userInfo) {
      // console.log('❌ User info not found - profile incomplete');
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
    // console.log('✅ User info found');
    // console.log('   Age:', userInfo.age);
    // console.log('   Weight:', userInfo.weight);
    // console.log('   Goal:', userInfo.goal);
    // console.log('   Activity:', userInfo.activity_level);

    // 4️⃣ SHOPPING LISTS
    // console.log('\n4️⃣ Calculating week start...');
    const now = new Date();
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    // Create start of week in local timezone (not UTC)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Convert to ISO string but keep local date (strip timezone for DB comparison)
    const startOfWeekLocal = new Date(startOfWeek.getTime() - startOfWeek.getTimezoneOffset() * 60000);
    
    // console.log('   Current date:', now.toISOString());
    // console.log('   Current day of week:', currentDay, '(0=Sun, 1=Mon, ...)');
    // console.log('   Week starts (local):', startOfWeek.toLocaleString('sk-SK'));
    // console.log('   Week starts (for DB):', startOfWeekLocal.toISOString());

    // console.log('\n5️⃣ Fetching shopping lists...');
    // console.log('   Strategy 1: Try finding by weekStartDate first...');

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

    // console.log('   Found by weekStartDate:', userShoppingLists.length);

    // Fallback: Try last 7 days by created_at
    if (userShoppingLists.length === 0) {
      // console.log('   Strategy 2: Trying last 7 days by created_at...');
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

      // console.log('   Found by created_at (last 7 days):', userShoppingLists.length);
    }

    // Ultimate fallback: Get any shopping list for this user
    if (userShoppingLists.length === 0) {
      // console.log('   Strategy 3: Getting ANY shopping list for this user...');
      userShoppingLists = await db
        .select()
        .from(shoppingLists)
        .where(eq(shoppingLists.userProfileId, userProfile.id))
        .orderBy(desc(shoppingLists.created_at))
        .limit(1);

      // console.log('   Found (any):', userShoppingLists.length);
      
      // if (userShoppingLists.length > 0) {
      //   console.log('   ⚠️  Using older shopping list - not from current week');
      //   console.log('   Shopping list created:', userShoppingLists[0].created_at);
      //   console.log('   Shopping list weekStart:', userShoppingLists[0].weekStartDate);
      // }
    }

    // console.log('\n   📊 Final result: Found', userShoppingLists.length, 'shopping list(s)');
    
    if (userShoppingLists.length === 0) {
      // console.log('❌ No shopping lists found for this week');
      return NextResponse.json({
        success: true,
        insights: { week: [] },
        cached: false,
        message: "No shopping lists found for this week. Upload a shopping list to get personalized meal plans.",
        fallbackUsed: 'no-data'
      });
    }

    const latestShoppingList = userShoppingLists[0];
    // console.log('✅ Using latest shopping list:', latestShoppingList.id);
    // console.log('   Title:', latestShoppingList.title);
    // console.log('   Created:', latestShoppingList.created_at);
    // console.log('   Markdown length:', latestShoppingList.markdownContent?.length || 0);

    // 6️⃣ CACHE CHECK
    const cacheKey = `meal-plan:${latestShoppingList.id}`;
    // console.log(`\n6️⃣ Checking cache with key: ${cacheKey}`);
    
    const cachedMealPlan = await CacheService.get(cacheKey);

    if (cachedMealPlan) {
      // console.log(`✅ CACHE HIT! Returning cached meal plan`);
      // console.log('   Cached data type:', typeof cachedMealPlan);
      // console.log('   Has week array:', !!(cachedMealPlan as any)?.week);
      
      return NextResponse.json({
        success: true,
        insights: cachedMealPlan,
        cached: true,
        cacheKey,
        message: "Returning cached meal plan"
      });
    }

    // console.log(`❌ Cache MISS`);

    // 7️⃣ DATABASE CHECK
    // console.log('\n7️⃣ Checking database for existing meal plan...');
    const [existingMealPlan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.shoppingListId, latestShoppingList.id))
      .orderBy(desc(mealPlans.created_at))
      .limit(1);

    if (existingMealPlan) {
      // console.log(`✅ DATABASE HIT! Found existing meal plan`);
      // console.log('   Meal plan ID:', existingMealPlan.id);
      // console.log('   Created at:', existingMealPlan.created_at);
      // console.log('   Meals data type:', typeof existingMealPlan.meals);
      // console.log('   Has week array:', !!(existingMealPlan.meals as any)?.week);
      
      // Cache it for 1 hour
      await CacheService.set(cacheKey, existingMealPlan.meals, 3600);
      // console.log('   ✅ Saved to cache for future requests');
      
      return NextResponse.json({
        success: true,
        insights: existingMealPlan.meals,
        cached: false,
        fromDatabase: true,
        mealPlanId: existingMealPlan.id,
        message: "Returning meal plan from database"
      });
    }

    // console.log(`❌ Database MISS - need to generate new meal plan`);

    // 8️⃣ PREPARE AI DATA
    // console.log('\n8️⃣ Preparing user data for AI...');
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
    // console.log('   User data prepared:', JSON.stringify(userInfoForAi, null, 2));

    // 9️⃣ AI GENERATION
    // console.log('\n9️⃣ Calling AI to generate meal plan...');
    let mealPlan;
    let fallbackUsed = 'none';

    try {
      const shoppingData = {
        markdown: latestShoppingList.markdownContent
      };

      // console.log('   Calling EatrivoAIService.generateWeeklyMealPlan...');
      const startTime = Date.now();
      
      mealPlan = await EatrivoAIService.generateWeeklyMealPlan(
        userInfoForAi,
        shoppingData
      );

      const duration = Date.now() - startTime;
      // console.log(`✅ AI generation completed in ${duration}ms`);
      // console.log('   Meal plan structure:', JSON.stringify(Object.keys(mealPlan), null, 2));
      // console.log('   Has week array:', !!mealPlan?.week);
      // console.log('   Week length:', mealPlan?.week?.length);
      
    } catch (aiError) {
      console.error('❌ AI generation FAILED:', aiError);
      // console.error('   Error type:', aiError instanceof Error ? aiError.constructor.name : typeof aiError);
      // console.error('   Error message:', aiError instanceof Error ? aiError.message : String(aiError));
      
      mealPlan = STATIC_FALLBACK;
      fallbackUsed = 'static';
      // console.log('⚠️  Using STATIC_FALLBACK');
    }

    // 🔟 SAVE TO CACHE & DATABASE
    if (fallbackUsed === 'none') {
      // console.log('\n🔟 Saving generated meal plan...');
      
      // Save to cache
      // console.log('   Saving to cache (1 hour)...');
      await CacheService.set(cacheKey, mealPlan, 3600);
      // console.log(`   ✅ Cached: ${cacheKey}`);

      // Save to database
      try {
        // console.log('   Saving to database...');
        const [savedMealPlan] = await db.insert(mealPlans).values({
          userProfileId: userProfile.id,
          shoppingListId: latestShoppingList.id,
          weekStartDate: latestShoppingList.weekStartDate,
          weekEndDate: latestShoppingList.weekEndDate,
          meals: mealPlan,
        }).returning();

        // console.log(`   ✅ Saved to DB: meal_plans.id = ${savedMealPlan.id}`);
      } catch (dbError) {
        console.error('   ⚠️ Database save failed:', dbError);
      }
    }

    // 1️⃣1️⃣ AI INSIGHTS (OPTIONAL)
    // console.log('\n1️⃣1️⃣ Saving to AI insights audit trail...');
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
      // console.log('   ✅ Saved to ai_insights');
    } catch (dbError) {
      console.error('   ⚠️ AI insights save failed (non-critical):', dbError);
    }

    // 1️⃣2️⃣ RETURN RESPONSE
    // console.log('\n1️⃣2️⃣ Returning response...');
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
    
    // console.log('   Response structure:', JSON.stringify({
    //   ...response,
    //   insights: '... (meal plan data)'
    // }, null, 2));
    // console.log('\n✅ ========== MEAL PLAN API COMPLETED ==========\n');
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("\n❌ ========== CRITICAL ERROR ==========");
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("========================================\n");
    
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