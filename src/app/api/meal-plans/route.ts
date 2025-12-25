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
import { CacheService } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { RequestLock } from "@/lib/redis";

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

    // Check if meal plan generation is already in progress for this user
    const lockKey = `meal-plan-generation:${userProfile.id}`;
    const isLocked = await RequestLock.isLocked(lockKey);
    
    if (isLocked) {
      const remainingTime = await RequestLock.getRemainingTime(lockKey);
      logger.info(`Meal plan generation already in progress for user ${userProfile.id}, waiting... (${remainingTime}s remaining)`);
      
      return NextResponse.json({
        success: false,
        error: "Generation in progress",
        message: "Meal plan is being generated. Please wait...",
        remainingTime,
        isGenerating: true,
      }, { status: 202 }); // 202 Accepted - request received but not yet processed
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
    
    // STEP 1: Check if active shopping list exists
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
    const cacheKey = `meal-plan:${latestShoppingList.id}`;
    const userCacheKey = `user-meal-plan:${userProfile.id}:${startOfWeek.toISOString().split('T')[0]}`;

    // STEP 2: Check Redis cache
    const [cachedMealPlan, userCachedPlan] = await Promise.all([
      CacheService.get(cacheKey),
      CacheService.get(userCacheKey)
    ]);

    if (cachedMealPlan) {
      logger.debug('Redis cache HIT (shopping list key)');
      return NextResponse.json({
        success: true,
        insights: cachedMealPlan,
        cached: true,
        cacheKey,
        message: "Cached meal plan"
      });
    }

    if (userCachedPlan) {
      logger.debug('Redis cache HIT (user weekly key)');
      return NextResponse.json({
        success: true,
        insights: userCachedPlan,
        cached: true,
        cacheKey: userCacheKey,
        message: "Cached meal plan"
      });
    }

    logger.debug('Redis cache MISS - checking database');
    
    // STEP 3: Check database
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
      logger.debug('Database HIT - caching and returning');
      
      // Cache with dual keys for better hit rate (1 hour TTL)
      await Promise.all([
        CacheService.set(cacheKey, existingMealPlan.meals, 3600),
        CacheService.set(userCacheKey, existingMealPlan.meals, 3600)
      ]);
      
      return NextResponse.json({
        success: true,
        insights: existingMealPlan.meals,
        cached: false,
        fromDatabase: true,
        mealPlanId: existingMealPlan.id,
        message: "Meal plan from database"
      });
    }

    logger.debug('Database MISS - need to generate with AI');

    // STEP 4: Acquire lock before AI generation (3 minutes TTL)
    const lockAcquired = await RequestLock.acquire(lockKey, 180);
    
    if (!lockAcquired) {
      // Another request just acquired the lock, return waiting status
      logger.info('Failed to acquire lock - another request is generating meal plan');
      return NextResponse.json({
        success: false,
        error: "Generation in progress",
        message: "Meal plan is being generated by another request. Please wait...",
        isGenerating: true,
      }, { status: 202 });
    }

    logger.info(`Lock acquired for meal plan generation: ${lockKey}`);

    try {
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
        language: userInfo.language || "sk",
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

      // Save to cache & database (parallel for better performance)
      if (fallbackUsed === 'none') {
        logger.debug('Saving meal plan to Redis and database');
        
        // Parallel cache and database save
        const savePromises = [
          // Cache with dual keys (1 hour TTL)
          CacheService.set(cacheKey, mealPlan, 3600),
          CacheService.set(userCacheKey, mealPlan, 3600),
          // Database insert
          db.insert(mealPlans).values({
            userProfileId: userProfile.id,
            shoppingListId: latestShoppingList.id,
            weekStartDate: latestShoppingList.weekStartDate,
            weekEndDate: latestShoppingList.weekEndDate,
            meals: mealPlan,
          }).returning().catch((dbError) => {
            logger.error('Database save FAILED:', dbError instanceof Error ? dbError.message : String(dbError));
            return null;
          })
        ];

        await Promise.allSettled(savePromises);
        logger.debug('Meal plan saved successfully');
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

    } catch (generationError) {
      // Release lock on error
      await RequestLock.release(lockKey);
      logger.error('Error during meal plan generation, lock released:', generationError);
      throw generationError; // Re-throw to outer catch
    } finally {
      // Ensure lock is always released
      await RequestLock.release(lockKey).catch(() => {
        // Ignore errors on release in finally
      });
    }

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