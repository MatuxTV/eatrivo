import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { z } from "zod";
import { goalEnumSchema, dietEnumSchema } from "@/lib/schemas/template";
import { EatrivoAIService } from "@/lib/langchain";
import { apiLogger } from "@/lib/logger";

// Schema for generation request
const generateRequestSchema = z.object({
  goal: goalEnumSchema,
  diet: dietEnumSchema,
});

/**
 * POST /api/admin/templates/generate
 * Generate template content using AI
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin/trainer
    const session = await auth();
    if (
      !session?.user?.membership ||
      !["trainer", "admin"].includes(session.user.membership.toLowerCase())
    ) {
      apiLogger.warn("Unauthorized template generation attempt", {
        metadata: { membership: session?.user?.membership },
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    apiLogger.info("Received template generation request", {
      metadata: { body },
    });

    const validationResult = generateRequestSchema.safeParse(body);

    if (!validationResult.success) {
      apiLogger.error("Validation failed for template generation", undefined, {
        metadata: { errors: validationResult.error.issues },
      });
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { goal, diet } = validationResult.data;

    // Create a generic user profile for this goal+diet combination
    // Use average values that the AI can adapt from
    const genericProfile = {
      sex: "man" as const,
      dateOfBirth: new Date(1990, 0, 1), // 34 years old
      height: 175, // Average height in cm
      weight: 75, // Average weight in kg
      goal,
      activity_level: "moderately_active" as const,
      meal_per_day: 3,
      cooking_time_pref: "normal" as const,
      diet_preferences: diet,
      budget_preference: "medium" as const,
      likes: "",
      dislikes: "",
      allergies: "",
      language: "sk" as const,
    };

    // Generate shopping list using AI
    apiLogger.info("Starting AI generation for template", {
      metadata: { goal, diet, profile: genericProfile },
    });

    const result = await EatrivoAIService.generateShoppingList(genericProfile);

    apiLogger.info("AI generation completed successfully", {
      metadata: {
        goal,
        diet,
        contentLength: result?.length || 0,
        hasContent: !!result,
        resultType: typeof result,
      },
    });

    const response = {
      markdownContent: result, // result is already a string, not an object
      goal,
      diet,
      generatedFor: "template",
    };

    apiLogger.info("Sending response to client", {
      metadata: {
        responseKeys: Object.keys(response),
        markdownContentLength: response.markdownContent?.length || 0,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error("Error generating template with AI", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 },
    );
  }
}
