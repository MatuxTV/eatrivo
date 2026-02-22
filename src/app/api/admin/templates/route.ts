import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminAuth, isAuthError } from "@/lib/adminAuth";
import { db } from "@/index";
import {
  shoppingListTemplates,
  mealPlanTemplates,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  createTemplateSchema,
  templateFilterSchema,
} from "@/lib/schemas/template";
import { apiLogger } from "@/lib/logger";
import { EatrivoAIService } from "@/lib/langchain";

/**
 * GET /api/admin/templates
 * List all templates (optionally filter by goal/diet)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filterParams = {
      goal: searchParams.get("goal") || undefined,
      diet: searchParams.get("diet") || undefined,
      isActive:
        searchParams.get("isActive") === null
          ? undefined
          : searchParams.get("isActive") === "true",
    };

    // Validate filter parameters
    const validationResult = templateFilterSchema.safeParse(filterParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid filter parameters", details: validationResult.error },
        { status: 400 },
      );
    }

    const filters = validationResult.data;

    // Build where clause
    const conditions = [];
    if (filters.goal) {
      conditions.push(eq(shoppingListTemplates.goal, filters.goal));
    }
    if (filters.diet) {
      conditions.push(eq(shoppingListTemplates.diet, filters.diet));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(shoppingListTemplates.isActive, filters.isActive));
    }

    // Fetch templates
    const templates =
      conditions.length > 0
        ? await db.query.shoppingListTemplates.findMany({
            where: and(...conditions),
            orderBy: (templates, { desc }) => [desc(templates.created_at)],
            with: {
              createdBy: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          })
        : await db.query.shoppingListTemplates.findMany({
            orderBy: (templates, { desc }) => [desc(templates.created_at)],
          });

    // Count templates by goal+diet combination for coverage stats
    const allTemplates = await db.query.shoppingListTemplates.findMany({
      where: eq(shoppingListTemplates.isActive, true),
      columns: {
        id: true,
        goal: true,
        diet: true,
      },
    });

    const coverage = {
      total: allTemplates.length,
      maxPossible: 21, // 3 goals × 7 diets
      percentage: Math.round((allTemplates.length / 21) * 100),
    };

    return NextResponse.json({
      templates,
      coverage,
    });
  } catch (error) {
    apiLogger.error("Error fetching templates", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/templates
 * Create new template (shopping list + optional meal plan)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth();
    if (isAuthError(authResult)) return authResult;
    const { session } = authResult;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { shoppingList, mealPlan, includeMealPlan } = validationResult.data;

    // Check if template already exists for this goal+diet combination
    const existingTemplate = await db.query.shoppingListTemplates.findFirst({
      where: and(
        eq(shoppingListTemplates.goal, shoppingList.goal),
        eq(shoppingListTemplates.diet, shoppingList.diet),
        eq(shoppingListTemplates.isActive, true),
      ),
    });

    if (existingTemplate) {
      return NextResponse.json(
        {
          error: `Active template already exists for goal="${shoppingList.goal}" and diet="${shoppingList.diet}"`,
        },
        { status: 409 },
      );
    }

    // Insert shopping list template
    const [newShoppingListTemplate] = await db
      .insert(shoppingListTemplates)
      .values({
        goal: shoppingList.goal,
        diet: shoppingList.diet,
        title: shoppingList.title,
        description: shoppingList.description || null,
        markdownContent: shoppingList.markdownContent,
        isActive: shoppingList.isActive,
        createdBy: session.user.id!,
      })
      .returning();

    apiLogger.info("Shopping list template created, starting meal plan generation", {
      metadata: {
        templateId: newShoppingListTemplate.id,
        goal: shoppingList.goal,
        diet: shoppingList.diet,
      },
    });

    // AUTOMATICALLY generate meal plan template using AI
    let newMealPlanTemplate = null;
    try {
      // Create generic user profile for meal plan generation
      const genericProfile = {
        dateofBirth: new Date(1990, 0, 1),
        weight: 75,
        height: 175,
        sex: "man" as const,
        goal: shoppingList.goal,
        activityLevel: "moderately_active" as const,
        mealsPerDay: 3,
        maxPrepTime: "normal" as const,
        dietType: shoppingList.diet,
        budget: "medium" as const,
        likedFoods: "",
        dislikedFoods: "",
        allergies: "",
        language: "sk" as const,
      };

      // Generate meal plan based on shopping list
      const mealPlanResult = await EatrivoAIService.generateWeeklyMealPlan(
        genericProfile,
        { markdown: shoppingList.markdownContent }
      );

      apiLogger.info("Meal plan generated successfully", {
        metadata: {
          templateId: newShoppingListTemplate.id,
          hasMealPlan: !!mealPlanResult,
        },
      });

      // Save meal plan template to database
      [newMealPlanTemplate] = await db
        .insert(mealPlanTemplates)
        .values({
          shoppingListTemplateId: newShoppingListTemplate.id,
          goal: shoppingList.goal,
          diet: shoppingList.diet,
          meals: mealPlanResult,
          isActive: shoppingList.isActive,
          createdBy: session.user.id!,
        })
        .returning();

      apiLogger.info("Meal plan template saved to database", {
        metadata: {
          mealPlanTemplateId: newMealPlanTemplate.id,
          shoppingListTemplateId: newShoppingListTemplate.id,
        },
      });
    } catch (mealPlanError) {
      // Log error but don't fail the entire request
      apiLogger.error("Failed to generate meal plan template", mealPlanError, {
        metadata: {
          shoppingListTemplateId: newShoppingListTemplate.id,
        },
      });
      // Continue - shopping list template was created successfully
    }

    apiLogger.info("Template creation completed", {
      metadata: {
        templateId: newShoppingListTemplate.id,
        goal: shoppingList.goal,
        diet: shoppingList.diet,
        createdBy: session.user.id!,
        hasMealPlan: !!newMealPlanTemplate,
      },
    });

    return NextResponse.json(
      {
        shoppingListTemplate: newShoppingListTemplate,
        mealPlanTemplate: newMealPlanTemplate,
      },
      { status: 201 },
    );
  } catch (error) {
    apiLogger.error("Error creating template", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}
