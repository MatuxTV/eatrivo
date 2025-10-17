// src/app/api/meal-plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { db } from "@/index";
import {
  userProfiles,
  shoppingLists,
  aiInsights,
  userInfoTable,
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
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // 3️⃣ Get user info
    const [userInfo] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfile.id));

    if (!userInfo) {
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

    //  Get shopping lists from this week
    const now = new Date();
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const userShoppingLists = await db
      .select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfile.id),
          gte(shoppingLists.created_at, startOfWeek)
        )
      )
      .orderBy(desc(shoppingLists.created_at));

    // 5️⃣ No shopping lists case
    if (userShoppingLists.length === 0) {
      return NextResponse.json({
        success: true,
        insights: { week: [] },
        cached: false,
        message: "No shopping lists found for this week. Upload a shopping list to get personalized meal plans.",
        fallbackUsed: 'no-data'
      });
    }

    const latestShoppingList = userShoppingLists[0];
    const cacheKey = `meal-plan:${latestShoppingList.id}`;
    
    console.log(`🔍 Checking cache: ${cacheKey}`);
    const cachedMealPlan = await CacheService.get(cacheKey);

    if (cachedMealPlan) {
      console.log(`✅ Cache HIT - returning cached meal plan`);
      return NextResponse.json({
        success: true,
        insights: cachedMealPlan,
        cached: true,
        cacheKey,
        message: "Returning cached meal plan"
      });
    }

    // 7️⃣ Prepare user data for AI
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


    let mealPlan;
    let fallbackUsed = 'none';

    try {
      const shoppingData = {
        markdown: latestShoppingList.markdownContent
      };

      mealPlan = await EatrivoAIService.generateWeeklyMealPlan(
        userInfoForAi,
        shoppingData
      );
    } catch (aiError) {
      console.error('❌ AI generation failed:', aiError);
      
      mealPlan = STATIC_FALLBACK;
      fallbackUsed = 'static';
    }

    if (fallbackUsed === 'none') {
      await CacheService.set(cacheKey, mealPlan,  604800); // 24h
      console.log(`💾 Saved to cache: ${cacheKey}`);
    }

    // 🔟 **SAVE TO DATABASE** (optional - for audit trail)
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
          version: "2.0",
        },
        expiresAt: expirationDate,
      });
    } catch (dbError) {
      console.error('⚠️ Failed to save to database (non-critical):', dbError);
      // Continue - DB save is optional
    }

    // 1️⃣1️⃣ **RETURN RESPONSE**
    return NextResponse.json({
      success: true,
      insights: mealPlan,
      cached: false,
      fallbackUsed,
      shoppingListId: latestShoppingList.id,
      generatedAt: new Date().toISOString(),
      message: fallbackUsed === 'static' 
        ? 'Using fallback meal plan due to AI error'
        : 'Fresh meal plan generated'
    });

  } catch (error) {
    console.error("❌ Critical error in meal plan generation:", error);
    
    // ULTIMATE FALLBACK
    return NextResponse.json({
      success: true, // Still return 200 to avoid breaking UI
      insights: STATIC_FALLBACK,
      cached: false,
      fallbackUsed: 'error',
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Using fallback meal plan due to system error"
    }, { status: 200 }); // Return 200 with fallback data instead of 500
  }
}