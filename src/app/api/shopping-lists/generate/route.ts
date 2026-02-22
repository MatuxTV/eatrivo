import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import {
  shoppingLists,
  mealPlans,
  userProfiles,
  userInfoTable,
  aiInsights,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { EatrivoAIService } from "@/lib/langchain";
import { apiLogger } from "@/lib/logger";
import { CacheService, RequestLock } from "@/lib/redis";
import { Analytics } from "@/lib/analytics";

/**
 * POST /api/shopping-lists/generate
 * Generate a personalized shopping list and meal plan for premium users
 * Only accessible to premium, pro, and trainer members
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has premium membership (premium, pro, or trainer)
    const membership = session.user.membership?.toLowerCase();
    if (!["premium", "pro", "trainer"].includes(membership || "")) {
      return NextResponse.json(
        {
          error:
            "This feature is only available for premium members. Please upgrade your subscription.",
        },
        { status: 403 },
      );
    }

    apiLogger.info("Premium user requesting shopping list generation", {
      metadata: { userId: session.user.id, membership },
    });

    // Get user profile
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Get user info (nutrition data)
    const userInfo = await db.query.userInfoTable.findFirst({
      where: eq(userInfoTable.userProfileId, userProfile.id),
    });

    if (!userInfo) {
      return NextResponse.json(
        { error: "User nutrition data not found. Please complete onboarding." },
        { status: 404 },
      );
    }

    // Validate required fields
    const requiredFields = [
      "sex",
      "dateOfBirth",
      "height",
      "weight",
      "activity_level",
      "goal",
      "meal_per_day",
      "budget_preference",
    ] as const;

    for (const field of requiredFields) {
      if (!userInfo[field as keyof typeof userInfo]) {
        return NextResponse.json(
          {
            error: `Missing required field: ${field}. Please update your profile.`,
          },
          { status: 400 },
        );
      }
    }

    // Calculate week dates (start = today, end = nearest upcoming Sunday)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);

    const dayOfWeek = now.getDay(); // 0 is Sunday
    // If today is Sunday, we still want it to generate for the next week
    // so `7` days to next Sunday, or maybe `0` if it's meant just for today.
    // The previous implementation for templates did `dayOfWeek === 0 ? 7 : 7 - dayOfWeek`
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + daysUntilSunday);
    weekEnd.setHours(23, 59, 59, 999);

    const language: "sk" | "en" = userInfo.language === "en" ? "en" : "sk";

    apiLogger.info("Generating AI shopping list for premium user", {
      metadata: {
        userProfileId: userProfile.id,
        goal: userInfo.goal,
        diet: userInfo.diet_preferences,
        language,
      },
    });

    // Check if the user already has an active shopping list
    const activeLists = await db
      .select()
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.userProfileId, userProfile.id),
          eq(shoppingLists.status, "active"),
        ),
      );

    if (activeLists.length > 0) {
      return NextResponse.json(
        {
          error:
            "You already have an active shopping list. Please complete or cancel it before generating a new one.",
        },
        { status: 400 },
      );
    }

    // Acquire generation lock (prevents duplicate requests & persists state across reloads)
    const lockKey = `shopping-list-generation:${session.user.id}`;
    const lockAcquired = await RequestLock.acquire(lockKey, 300); // 5 min TTL

    if (!lockAcquired) {
      return NextResponse.json(
        {
          error:
            "Shopping list generation is already in progress. Please wait.",
        },
        { status: 429 },
      );
    }

    try {
      const shoppingListMarkdown = await EatrivoAIService.generateShoppingList({
        sex: userInfo.sex as "man" | "woman",
        dateOfBirth: userInfo.dateOfBirth
          ? new Date(userInfo.dateOfBirth)
          : new Date(),
        height: Number(userInfo.height),
        weight: Number(userInfo.weight),
        activity_level: userInfo.activity_level as
          | "sedentary"
          | "lightly_active"
          | "moderately_active"
          | "very_active"
          | "athlete",
        goal: userInfo.goal as
          | "lose_weight"
          | "maintain_weight"
          | "gain_muscle",
        meal_per_day: Number(userInfo.meal_per_day),
        cooking_time_pref:
          (userInfo.cooking_time_pref as "quick" | "normal" | "slow") ||
          undefined,
        diet_preferences: (userInfo.diet_preferences as any) || undefined,
        budget_preference:
          (userInfo.budget_preference as "low" | "medium" | "high") || "medium",
        likes: userInfo.likes || undefined,
        dislikes: userInfo.dislikes || undefined,
        allergies: userInfo.allergies || undefined,
        language: language || "sk",
        startDate: weekStart.toLocaleDateString(
          language === "en" ? "en-US" : "sk-SK",
          { month: "long", day: "numeric" },
        ),
        endDate: weekEnd.toLocaleDateString(
          language === "en" ? "en-US" : "sk-SK",
          { month: "long", day: "numeric" },
        ),
      });

      // Save shopping list to database
      const [newShoppingList] = await db
        .insert(shoppingLists)
        .values({
          userProfileId: userProfile.id,
          title: shoppingListMarkdown.title,
          description: shoppingListMarkdown.description,
          markdownContent: shoppingListMarkdown.markdown,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          status: "active",
        })
        .returning();

      apiLogger.info("Shopping list generated and saved", {
        metadata: {
          shoppingListId: newShoppingList.id,
          userProfileId: userProfile.id,
        },
      });

      // Track AI Insight (Shopping List)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);

      try {
        await db.insert(aiInsights).values({
          userProfileId: userProfile.id,
          insightType: "shopping_list",
          title: newShoppingList.title || "Nákupný Zoznam",
          content: shoppingListMarkdown,
          metadata: {
            goal: userInfo.goal,
            dietPreferences: userInfo.diet_preferences,
            generationTime: new Date().toISOString(),
          },
          expiresAt: expirationDate,
        });
      } catch (dbError) {
        apiLogger.error("AI insights shopping list save FAILED:", dbError);
      }

      // Track feature usage
      await Analytics.shoppingListCreated(session.user.id, {
        source: "ai_generator",
      });

      // Generate meal plan with AI
      let mealPlan = null;
      try {
        apiLogger.info("Generating AI meal plan for premium user", {
          metadata: {
            userProfileId: userProfile.id,
            shoppingListId: newShoppingList.id,
          },
        });

        const mealPlanData = await EatrivoAIService.generateWeeklyMealPlan(
          {
            sex: userInfo.sex as "man" | "woman",
            dateofBirth: userInfo.dateOfBirth
              ? new Date(userInfo.dateOfBirth)
              : new Date(),
            height: Number(userInfo.height),
            weight: Number(userInfo.weight),
            activityLevel: userInfo.activity_level as
              | "sedentary"
              | "lightly_active"
              | "moderately_active"
              | "very_active"
              | "athlete",
            goal: userInfo.goal as
              | "lose_weight"
              | "maintain_weight"
              | "gain_muscle",
            mealsPerDay: Number(userInfo.meal_per_day),
            maxPrepTime:
              (userInfo.cooking_time_pref as "quick" | "normal" | "slow") ||
              "normal",
            dietType: (userInfo.diet_preferences as any) || undefined,
            budget:
              (userInfo.budget_preference as "low" | "medium" | "high") ||
              "medium",
            likedFoods: userInfo.likes || "",
            dislikedFoods: userInfo.dislikes || "",
            allergies: userInfo.allergies || "",
            language: (language as "sk" | "en") || "sk",
          },
          {
            markdown: shoppingListMarkdown.markdown,
          },
        );

        // Save meal plan to database
        [mealPlan] = await db
          .insert(mealPlans)
          .values({
            userProfileId: userProfile.id,
            shoppingListId: newShoppingList.id,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            meals: mealPlanData,
          })
          .returning();

        apiLogger.info("Meal plan generated and saved", {
          metadata: {
            mealPlanId: mealPlan.id,
            shoppingListId: newShoppingList.id,
          },
        });

        // Track AI Insight (Meal Plan)
        try {
          await db.insert(aiInsights).values({
            userProfileId: userProfile.id,
            insightType: "meal_plan",
            title: `Meal Plan pre Nákupný Zoznam`,
            content: mealPlanData,
            metadata: {
              shoppingListId: newShoppingList.id,
              generationTime: new Date().toISOString(),
            },
            expiresAt: expirationDate,
          });
        } catch (dbError) {
          apiLogger.error("AI insights meal plan save FAILED:", dbError);
        }

        // Track feature usage
        await Analytics.mealPlanGenerated(session.user.id, {
          tier: session.user.membership || "premium",
        });
      } catch (mealPlanError) {
        apiLogger.error(
          "Failed to generate meal plan (continuing anyway)",
          mealPlanError,
          {
            metadata: { shoppingListId: newShoppingList.id },
          },
        );
        // Don't fail the request - shopping list was created successfully
      }

      // Invalidate caches
      const cacheKeys = [
        `shopping-lists:${session.user.id}`,
        `meal-plan:${userProfile.id}`,
      ];

      for (const key of cacheKeys) {
        try {
          await CacheService.delete(key);
        } catch (error) {
          apiLogger.warn("Failed to invalidate cache", {
            metadata: { key, error },
          });
        }
      }

      apiLogger.info("Successfully generated shopping list and meal plan", {
        metadata: {
          userId: session.user.id,
          shoppingListId: newShoppingList.id,
          mealPlanId: mealPlan?.id,
        },
      });

      // Release the generation lock on success
      await RequestLock.release(lockKey);

      return NextResponse.json({
        success: true,
        shoppingList: newShoppingList,
        mealPlan: mealPlan,
        message: "Shopping list and meal plan generated successfully!",
      });
    } catch (innerError) {
      // Release the lock if anything inside the generation fails
      await RequestLock.release(lockKey);
      throw innerError;
    }
  } catch (error) {
    apiLogger.error(
      "Failed to generate shopping list for premium user",
      error,
      {
        metadata: { userId: (await auth())?.user?.id },
      },
    );
    return NextResponse.json(
      { error: "Failed to generate shopping list. Please try again." },
      { status: 500 },
    );
  }
}
