import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { userProfiles, userInfoTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { userFoodPreferencesSchema } from "@/lib/schemas/user";
import { checkRateLimit } from "@/lib/rateLimit";
import { invalidateUserContextCaches } from "@/lib/user-context-cache";

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

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) return rl.response!;

    const body = await request.json();
    const validation = userFoodPreferencesSchema.safeParse(body);

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
        weight: String(validation.data.weight),
        activity_level: validation.data.activity_level,
        goal: validation.data.goal ?? "maintain_weight",
        meal_per_day: validation.data.meal_per_day ?? null,
        cooking_time_pref: validation.data.cooking_time_pref ?? null,
        meal_prep: validation.data.meal_prep ?? false,
        meal_prep_days: validation.data.meal_prep_days ?? null,
        diet_preferences: validation.data.diet_preferences ?? "none",
        budget_preference: validation.data.budget_preference ?? "medium",
        likes: validation.data.likes?.trim() || null,
        dislikes: validation.data.dislikes?.trim() || null,
        allergies: validation.data.allergies?.trim() || null,
      })
      .where(eq(userInfoTable.userProfileId, userProfileId))
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "Nutrition data not found" },
        { status: 404 }
      );
    }

    await invalidateUserContextCaches(session.user.id);

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
