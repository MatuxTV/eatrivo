import { db } from "@/index";
import { shoppingLists, mealPlans, aiInsights } from "@/db/schema";
import { apiLogger } from "@/lib/logger";
import { CacheService } from "@/lib/redis";
import { Analytics } from "@/lib/analytics";
import { EatrivoAIService } from "@/lib/langchain";
import type { ShoppingListState } from "../state";

export async function saveToDb(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  const { userId, userProfileId, userInfo, aiOutput } = state;

  if (!aiOutput) {
    return { error: "saveToDb: aiOutput is null" };
  }

  if (!userInfo) {
    return { error: "saveToDb: userInfo is null" };
  }

  apiLogger.info("[saveToDb] start", { metadata: { userProfileId, title: aiOutput.title } });

  try {
    // ── Week dates ──
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + daysUntilSunday);
    weekEnd.setHours(23, 59, 59, 999);

    // ── INSERT Shopping List ──
    const [newShoppingList] = await db
      .insert(shoppingLists)
      .values({
        userProfileId,
        title: aiOutput.title,
        description: aiOutput.description,
        markdownContent: aiOutput.markdown,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        status: "draft",
      })
      .returning();

    apiLogger.info("Shopping list generated and saved", {
      metadata: {
        shoppingListId: newShoppingList.id,
        userProfileId,
      },
    });

    // ── INSERT AI Insights (Shopping List) ──
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);

    try {
      await db.insert(aiInsights).values({
        userProfileId,
        insightType: "shopping_list",
        title: newShoppingList.title || "Nákupný Zoznam",
        content: {
          title: aiOutput.title,
          description: aiOutput.description,
          markdown: aiOutput.markdown,
        },
        metadata: {
          goal: userInfo.goal,
          dietPreferences: userInfo.diet_preferences,
          estimatedMacros: aiOutput.estimatedMacros,
          generationTime: new Date().toISOString(),
        },
        expiresAt: expirationDate,
      });
    } catch (dbError) {
      apiLogger.error("AI insights shopping list save FAILED:", dbError);
    }

    // ── Track analytics ──
    await Analytics.shoppingListCreated(userId, {
      source: "ai_generator",
    });

    // ── Generate Meal Plan ──
    let savedMealPlan = null;
    try {
      const language: "sk" | "en" = userInfo.language === "en" ? "en" : "sk";

      const mealPlanData = await EatrivoAIService.generateWeeklyMealPlan(
        {
          sex: userInfo.sex,
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
          dietType:
            (userInfo.diet_preferences as
              | "none"
              | "lactosefree"
              | "vegetarian"
              | "vegan"
              | "pescatarian"
              | "ketogenic"
              | "paleolithic") || undefined,
          budget:
            (userInfo.budget_preference as "low" | "medium" | "high") ||
            "medium",
          likedFoods: userInfo.likes || "",
          dislikedFoods: userInfo.dislikes || "",
          allergies: userInfo.allergies || "",
          language,
        },
        {
          markdown: aiOutput.markdown,
        },
      );

      // ── INSERT Meal Plan ──
      [savedMealPlan] = await db
        .insert(mealPlans)
        .values({
          userProfileId,
          shoppingListId: newShoppingList.id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          meals: mealPlanData,
        })
        .returning();

      apiLogger.info("Meal plan generated and saved", {
        metadata: {
          mealPlanId: savedMealPlan.id,
          shoppingListId: newShoppingList.id,
        },
      });

      // ── INSERT AI Insights (Meal Plan) ──
      try {
        await db.insert(aiInsights).values({
          userProfileId,
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

      // ── Track meal plan analytics ──
      await Analytics.mealPlanGenerated(userId, {
        tier: "premium",
      });
    } catch (mealPlanError) {
      apiLogger.error(
        "Failed to generate meal plan (continuing anyway)",
        mealPlanError,
        {
          metadata: { shoppingListId: newShoppingList.id },
        },
      );
      // Don't fail — shopping list was created successfully
    }

    // ── Invalidate caches ──
    const cacheKeys = [
      `shopping-lists:${userId}`,
      `meal-plan:${userProfileId}`,
    ];

    for (const key of cacheKeys) {
      try {
        await CacheService.delete(key);
      } catch (cacheError) {
        apiLogger.warn("Failed to invalidate cache", {
          metadata: { key, error: cacheError },
        });
      }
    }

    return {
      savedShoppingList: newShoppingList,
      savedMealPlan,
    };
  } catch (err) {
    apiLogger.error("saveToDb failed", err);
    return {
      error: `saveToDb failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
