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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
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

    // Check Redis cache first
    const cacheKey = `ai-insights:${userProfile.id}:${new Date()
      .toISOString()
      .slice(0, 10)}`;
    const cachedInsights = await CacheService.get(cacheKey);

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

    const userInfoForAi = {
      age: userInfo.age || 25, // Default age if null
      weight: Number(userInfo.weight) || 70, // Default weight if null
      height: userInfo.height || 170, // Default height if null
      sex: userInfo.sex || "man", // Default sex if null
      goal: userInfo.goal || "maintain_weight", // Default goal if null
      activityLevel: userInfo.activity_level || "moderately_active",
      mealsPerDay: userInfo.meal_per_day || 3, // Default 3 meals if null
      maxPrepTime: userInfo.cooking_time_pref || "normal",
      dietType: userInfo.diet_preferences || "none",
      budget: userInfo.budget_preference || "medium",
      likedFoods: userInfo.likes || "",
      dislikedFoods: userInfo.dislikes || "",
      allergies: userInfo.allergies || "",
    };

    // Calculate start of current week (Monday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Handle Sunday as 6 days from Monday
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0); // Set to midnight

    // Get user's shopping lists from this week only
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

    if (userShoppingLists.length === 0) {
      const noDataInsights = {
        weeklyRecommendations: [
          "Zatiaľ nemáte žiadne nákupné zoznamy z tohto týždňa",
          "Pridajte svoj prvý nákupný zoznam pre personalizované odporúčania",
          "AI analýza bude dostupná po nahraní aspoň jedného zoznamu",
        ],
        nutritionalTips: [
          "Začnite s vyváženou stravou obsahujúcou všetky makronutrienty",
          "Nezabudnite na dostatok zeleniny a ovocia",
          "Hydratácia je kľúčová pre zdravý životný štýl",
        ],
        metadata: {
          userId: userProfile.id,
          generatedAt: new Date().toISOString(),
          shoppingListsAnalyzed: 0,
          weekPeriod: `${startOfWeek.toLocaleDateString(
            "sk"
          )} - ${new Date().toLocaleDateString("sk")}`,
        },
      };

      // Cache the no-data response for 2 hours
      await CacheService.set(cacheKey, noDataInsights, 7200);

      return NextResponse.json({
        success: true,
        insights: noDataInsights,
        cached: false,
        message: "No shopping lists found for this week",
      });
    }

    // Generate AI insights
    const personalizedInsights = await EatrivoAIService.generateWeeklyMealPlan(
      userInfoForAi
    );

    // Combine insights
    const combinedInsights = {
      ...personalizedInsights,
      metadata: {
        userId: userProfile.id,
        generatedAt: new Date().toISOString(),
        shoppingListsAnalyzed: userShoppingLists.length,
        userGoal: userInfo?.activity_level,
        userDateOfBirth: userInfo?.age,
      },
    };

    // Save to database
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24); // Expire in 24 hours

    const [savedInsight] = await db
      .insert(aiInsights)
      .values({
        userProfileId: userProfile.id,
        insightType: "comprehensive_analysis",
        title: `AI Analýza pre ${
          userProfile.fullName
        } - ${new Date().toLocaleDateString("sk")}`,
        content: combinedInsights,
        metadata: {
          shoppingListCount: userShoppingLists.length,
          generationTime: new Date().toISOString(),
          version: "1.0",
        },
        expiresAt: expirationDate,
      })
      .returning();

    // Cache in Redis for 6 hours
    await CacheService.set(cacheKey, combinedInsights, 21600);

    return NextResponse.json({
      success: true,
      insights: combinedInsights,
      insightId: savedInsight.id,
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI insights generation failed:", error);
    return NextResponse.json(
      {
        error: "Failed to generate AI insights",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
