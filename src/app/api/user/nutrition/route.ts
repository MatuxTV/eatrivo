import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { userProfiles, userInfoTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const nutritionUpdateSchema = z.object({
  sex: z.enum(["man", "woman"]),
  height: z.coerce.number().min(100).max(250),
  weight: z.string().min(2),
  activity_level: z.string().min(1),
  goal: z.string().min(1),
  meal_per_day: z.coerce.number().min(1).max(6),
  cooking_time_pref: z.string().min(1),
  diet_preferences: z.string().min(1),
  budget_preference: z.string().min(1),
  likes: z.string().optional(),
  dislikes: z.string().optional(),
  allergies: z.string().optional(),
});

// PUT /api/user/nutrition - Update user's nutrition preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = nutritionUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Get user profile ID
    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (!profile || profile.length === 0) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const userProfileId = profile[0].id;

    // Update nutrition data
    const updated = await db
      .update(userInfoTable)
      .set({
        sex: validation.data.sex,
        height: validation.data.height,
        weight: validation.data.weight.trim(),
        activity_level: validation.data.activity_level.trim() as "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "athlete",
        goal: validation.data.goal.trim() as "lose_weight" | "maintain_weight" | "gain_muscle",
        meal_per_day: validation.data.meal_per_day,
        cooking_time_pref: validation.data.cooking_time_pref.trim() as "quick" | "normal" | "slow",
        diet_preferences: validation.data.diet_preferences.trim() as "none" | "lactosefree" | "vegetarian" | "vegan" | "pescatarian" | "ketogenic" | "paleolithic",
        budget_preference: validation.data.budget_preference.trim() as "low" | "medium" | "high",
        likes: validation.data.likes?.trim(),
        dislikes: validation.data.dislikes?.trim(),
        allergies: validation.data.allergies?.trim(),
      })
      .where(eq(userInfoTable.userProfileId, userProfileId))
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "Nutrition data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      nutrition: updated[0],
    });
  } catch (error) {
    console.error("Error updating nutrition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
