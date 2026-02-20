import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import {
  shoppingLists,
  mealPlans,
  userProfiles,
  userInfoTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { EatrivoAIService } from "@/lib/langchain";
import { apiLogger } from "@/lib/logger";
import { CacheService } from "@/lib/redis";

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

    // Calculate week dates (next Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + daysUntilMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
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

    // Generate shopping list with AI
    const shoppingListMarkdown = await EatrivoAIService.generateShoppingList({
      sex: userInfo.sex,
      dateOfBirth: new Date(userInfo.dateOfBirth!),
      height: Number(userInfo.height),
      weight: Number(userInfo.weight),
      activity_level: userInfo.activity_level,
      goal: userInfo.goal,
      meal_per_day: Number(userInfo.meal_per_day),
      cooking_time_pref: userInfo.cooking_time_pref ?? undefined,
      diet_preferences: userInfo.diet_preferences ?? undefined,
      budget_preference: userInfo.budget_preference!,
      likes: userInfo.likes ?? undefined,
      dislikes: userInfo.dislikes ?? undefined,
      allergies: userInfo.allergies ?? undefined,
      language,
    });

    // Save shopping list to database
    const [newShoppingList] = await db
      .insert(shoppingLists)
      .values({
        userProfileId: userProfile.id,
        title: `Nákupný zoznam - ${weekStart.toLocaleDateString("sk-SK", { month: "long", day: "numeric" })} - ${weekEnd.toLocaleDateString("sk-SK", { month: "long", day: "numeric" })}`,
        description: "Automaticky vygenerovaný AI nákupný zoznam",
        markdownContent: shoppingListMarkdown,
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
          sex: userInfo.sex,
          dateofBirth: new Date(userInfo.dateOfBirth!),
          height: Number(userInfo.height),
          weight: Number(userInfo.weight),
          activityLevel: userInfo.activity_level,
          goal: userInfo.goal,
          mealsPerDay: Number(userInfo.meal_per_day),
          maxPrepTime: userInfo.cooking_time_pref ?? "normal",
          dietType: userInfo.diet_preferences ?? undefined,
          budget: userInfo.budget_preference!,
          likedFoods: userInfo.likes ?? "",
          dislikedFoods: userInfo.dislikes ?? "",
          allergies: userInfo.allergies ?? "",
          language,
        },
        {
          markdown: shoppingListMarkdown,
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
    } catch (mealPlanError) {
      apiLogger.error("Failed to generate meal plan (continuing anyway)", mealPlanError, {
        metadata: { shoppingListId: newShoppingList.id },
      });
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

    return NextResponse.json({
      success: true,
      shoppingList: newShoppingList,
      mealPlan: mealPlan,
      message: "Shopping list and meal plan generated successfully!",
    });
  } catch (error) {
    apiLogger.error("Failed to generate shopping list for premium user", error, {
      metadata: { userId: (await auth())?.user?.id },
    });
    return NextResponse.json(
      { error: "Failed to generate shopping list. Please try again." },
      { status: 500 },
    );
  }
}
