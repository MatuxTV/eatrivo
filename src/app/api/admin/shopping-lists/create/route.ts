import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { db } from "../../../../../";
import { shoppingLists, userProfiles } from "@/db/schema";
import { EatrivoAIService } from "@/lib/langchain";
import { CacheService } from "@/lib/cache";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const {
      title,
      description,
      weekStartDate,
      weekEndDate,
      status,
      userProfileId,
      markdownContent,
      generateWithAI,
      userInfo,
    } = body;

    // Validate required fields
    if (!title || !weekStartDate || !weekEndDate || !userProfileId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let finalMarkdownContent = markdownContent;

    // AI Generation logic
    if (generateWithAI) {
      if (!userInfo) {
        return NextResponse.json(
          { error: "userInfo is required when generateWithAI is true" },
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

      finalMarkdownContent = await EatrivoAIService.generateShoppingList({
        ...userInfo,
        dateOfBirth: new Date(userInfo.dateOfBirth),
      });
    } else {
      if (!markdownContent || !markdownContent.trim()) {
        return NextResponse.json(
          { error: "markdownContent is required when generateWithAI is false" },
          { status: 400 }
        );
      }
    }

    // Create shopping list
    const [newShoppingList] = await db
      .insert(shoppingLists)
      .values({
        userProfileId,
        title,
        description: description || null,
        weekStartDate: new Date(weekStartDate),
        weekEndDate: new Date(weekEndDate),
        markdownContent: finalMarkdownContent,
        status: status || "active",
      })
      .returning();

    // Invalidate relevant caches (parallel for better performance)
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userProfileId));

    if (userProfile) {
      const weekStart = new Date(weekStartDate);
      const cacheInvalidations = [
        // Invalidate user's shopping lists cache
        CacheService.del(`shopping-lists:${userProfile.userId}`),
        // Invalidate meal plan caches for this shopping list
        CacheService.del(`meal-plan:${newShoppingList.id}`),
        // Invalidate user's weekly meal plan cache
        CacheService.del(`user-meal-plan:${userProfileId}:${weekStart.toISOString().split('T')[0]}`),
        // Invalidate any meal plans for this user (pattern match)
        CacheService.invalidatePattern(`user-meal-plan:${userProfileId}:*`)
      ];

      await Promise.allSettled(cacheInvalidations);
    }

    return NextResponse.json(
      {
        success: true,
        shoppingList: newShoppingList,
        message: "Shopping list created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating shopping list:", error);
    return NextResponse.json(
      { error: "Failed to create shopping list" },
      { status: 500 }
    );
  }
}
