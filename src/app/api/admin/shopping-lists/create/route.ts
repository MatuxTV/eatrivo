import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAdminAuth, isAuthError } from "@/lib/auth/adminAuth";
import { EatrivoAIService } from "@/lib/langchain";
import { apiLogger } from "@/lib/logger";

// POST endpoint - Generate shopping list markdown with AI (without saving to DB)
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;

    const body = await req.json();
    const { userInfo } = body;

    // Validate userInfo
    if (!userInfo) {
      return NextResponse.json(
        { error: "userInfo is required" },
        { status: 400 }
      );
    }

    const requiredFields = ['sex', 'dateOfBirth', 'height', 'weight', 'activity_level', 'goal', 'meal_per_day', 'budget_preference'];
    for (const field of requiredFields) {
      if (!userInfo[field]) {
        return NextResponse.json(
          { error: `userInfo.${field} is required for AI generation` },
          { status: 400 }
        );
      }
    }

    const normalizedLanguage = userInfo.language === "en" ? "en" : "sk";

    apiLogger.info('Generating shopping list with AI (no DB save)', {
      metadata: {
        goal: userInfo.goal,
        diet: userInfo.diet_preferences,
        budget: userInfo.budget_preference,
        language: normalizedLanguage
      }
    });

    // Generate shopping list markdown using AI
    const markdown = await EatrivoAIService.generateShoppingList({
      sex: userInfo.sex,
      dateOfBirth: new Date(userInfo.dateOfBirth),
      height: Number(userInfo.height),
      weight: Number(userInfo.weight),
      activity_level: userInfo.activity_level,
      goal: userInfo.goal,
      meal_per_day: Number(userInfo.meal_per_day),
      cooking_time_pref: userInfo.cooking_time_pref,
      diet_preferences: userInfo.diet_preferences,
      budget_preference: userInfo.budget_preference,
      likes: userInfo.likes,
      dislikes: userInfo.dislikes,
      allergies: userInfo.allergies,
      language: normalizedLanguage,
    });

    apiLogger.info('AI shopping list generated successfully (no DB save)');

    // Return only the markdown content (don't save to DB)
    return NextResponse.json({
      success: true,
      markdown,
      message: 'Shopping list generated successfully. Review and save manually.'
    });

  } catch (error) {
    apiLogger.error('Failed to generate shopping list with AI', error);
    return NextResponse.json(
      { error: 'Failed to generate shopping list' },
      { status: 500 }
    );
  }
}
