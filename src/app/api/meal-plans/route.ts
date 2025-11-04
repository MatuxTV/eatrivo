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
  // logger.debug('Meal plan API called');
  
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

    if (!userProfile) {
      logger.warn('User profile not found');
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const [userInfo] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfile.id));

    if (!userInfo) {
      logger.warn('User info not found - profile incomplete');
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

    const now = new Date();
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    // Create start of week in local timezone (not UTC)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Convert to ISO string but keep local date (strip timezone for DB comparison)
    const startOfWeekLocal = new Date(startOfWeek.getTime() - startOfWeek.getTimezoneOffset() * 60000);

    // Try to find by weekStartDate (more reliable) - ONLY ACTIVE
    let userShoppingLists = await db
      .select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfile.id),
          eq(shoppingLists.status, 'active'),
          gte(shoppingLists.weekStartDate, startOfWeekLocal)
        )
      )
      .orderBy(desc(shoppingLists.created_at));

    // logger.debug(`Shopping lists found by weekStartDate: ${userShoppingLists.length}`);

    // Fallback: Try last 7 days by created_at - ONLY ACTIVE
    if (userShoppingLists.length === 0) {
      // logger.debug('Trying fallback: last 7 days by created_at');
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
            eq(shoppingLists.status, 'active'),
            gte(shoppingLists.created_at, sevenDaysAgoLocal)
          )
        )
        .orderBy(desc(shoppingLists.created_at));

      // logger.debug(`Found by created_at (last 7 days): ${userShoppingLists.length}`);
    }

    // Ultimate fallback: Get any ACTIVE shopping list for this user
    if (userShoppingLists.length === 0) {
      // logger.debug('Strategy 3: Getting ANY active shopping list');
      userShoppingLists = await db
        .select()
        .from(shoppingLists)
        .where(
          and(
            eq(shoppingLists.userProfileId, userProfile.id),
            eq(shoppingLists.status, 'active')
          )
        )
        .orderBy(desc(shoppingLists.created_at))
        .limit(1);
      
      if (userShoppingLists.length > 0) {
        logger.warn('Using older active shopping list - not from current week');
      }
    }

    // logger.debug(`Final shopping lists count: ${userShoppingLists.length}`);
    
    if (userShoppingLists.length === 0) {
      logger.warn('No active shopping lists found');
      return NextResponse.json({
        success: true,
        insights: { week: [] },
        cached: false,
        message: "No active shopping lists found for this week. Upload a shopping list to get personalized meal plans.",
        fallbackUsed: 'no-data'
      });
    }

    const latestShoppingList = userShoppingLists[0];
    // logger.debug(`Using shopping list: ${latestShoppingList.title}`);

    // Cache check
    const cacheKey = `meal-plan:${latestShoppingList.id}`;
    // logger.debug(`Checking cache: ${cacheKey}`);

    const cachedMealPlan = await CacheService.get(cacheKey);

    if (cachedMealPlan) {
      // logger.debug('Cache HIT - returning cached meal plan');
      return NextResponse.json({
        success: true,
        insights: cachedMealPlan,
        cached: true,
        cacheKey,
        message: "Returning cached meal plan"
      });
    }

    // logger.debug('Cache MISS - checking database');
    
    // Database check
    const [existingMealPlan] = await db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.shoppingListId, latestShoppingList.id),
          eq(mealPlans.weekStartDate, latestShoppingList.weekStartDate),
          eq(mealPlans.weekEndDate, latestShoppingList.weekEndDate)
        )
      )
      .orderBy(desc(mealPlans.created_at))
      .limit(1);

    if (existingMealPlan) {
      // logger.debug('Database HIT - returning existing meal plan');
      // Cache it for 1 hour
      await CacheService.set(cacheKey, existingMealPlan.meals, 3600);
      
      return NextResponse.json({
        success: true,
        insights: existingMealPlan.meals,
        cached: false,
        fromDatabase: true,
        mealPlanId: existingMealPlan.id,
        message: "Returning meal plan from database"
      });
    }

    // logger.debug('Database MISS - generating new meal plan with AI');

    // Prepare AI data
    const userInfoForAi = {
      dateofBirth: userInfo.dateOfBirth || new Date(), // lowercase 'o' to match langchain type
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

    // logger.debug('Calling AI service to generate meal plan');
    
    // AI generation
    let mealPlan;
    let fallbackUsed = 'none';

    const shoppingData = {
      markdown: latestShoppingList.markdownContent
    };

    try {
      mealPlan = await EatrivoAIService.generateWeeklyMealPlan(
        userInfoForAi,
        shoppingData
      );
      // logger.debug('AI meal plan generated successfully');
    } catch (aiError) {
      logger.error('AI generation FAILED:', aiError instanceof Error ? aiError.message : String(aiError));
      mealPlan = STATIC_FALLBACK;
      fallbackUsed = 'static';
      logger.warn('Using STATIC_FALLBACK meal plan');
    }

    // Save to cache & database
    if (fallbackUsed === 'none') {
      // logger.debug('Saving meal plan to cache and database');
      await CacheService.set(cacheKey, mealPlan, 3600);
      
      try {
        await db.insert(mealPlans).values({
          userProfileId: userProfile.id,
          shoppingListId: latestShoppingList.id,
          weekStartDate: latestShoppingList.weekStartDate,
          weekEndDate: latestShoppingList.weekEndDate,
          meals: mealPlan,
        }).returning();
        // logger.debug('Meal plan saved to database successfully');
      } catch (dbError) {
        logger.error('Database save FAILED:', dbError instanceof Error ? dbError.message : String(dbError));
      }
    }

    // Save to AI insights audit trail
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
      // logger.debug('AI insights saved successfully');
    } catch (dbError) {
      logger.error('AI insights save FAILED:', dbError instanceof Error ? dbError.message : String(dbError));
    }

    // Return response
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

    // logger.debug('Meal plan API completed - returning response');
    return NextResponse.json(response);

  } catch (error) {
    logger.error("CRITICAL ERROR:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      logger.error("Stack:", error.stack);
    }
    
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