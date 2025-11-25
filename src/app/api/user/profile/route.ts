import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { users, userProfiles, userInfoTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const profileUpdateSchema = z.object({
  fullName: z.string().min(2, "Meno musí mať aspoň 2 znaky"),
  dateOfBirth: z.string(),
});

// GET /api/user/profile - Fetch current user's profile and nutrition data
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user profile
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

    const userProfile = profile[0];

    // Fetch user for membership
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // Fetch nutrition data
    const nutrition = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfile.id))
      .limit(1);

    // Format nutrition data for the frontend
    const formattedNutrition = nutrition.length > 0 ? {
      ...nutrition[0],
      weight: nutrition[0].weight ? String(nutrition[0].weight) : "",
      activity_level: nutrition[0].activity_level?.trim() || "sedentary",
      goal: nutrition[0].goal?.trim() || "maintain_weight",
      cooking_time_pref: nutrition[0].cooking_time_pref?.trim() || "normal",
      diet_preferences: nutrition[0].diet_preferences?.trim() || "none",
      budget_preference: nutrition[0].budget_preference?.trim() || "medium",
      likes: nutrition[0].likes || "",
      dislikes: nutrition[0].dislikes || "",
      allergies: nutrition[0].allergies || "",
    } : null;

    return NextResponse.json({
      profile: {
        fullName: userProfile.fullName,
        email: session.user.email,
        dateOfBirth: userProfile.dateOfBirth ? userProfile.dateOfBirth.toISOString().split('T')[0] : "",
        membership: user[0]?.membership || "basic",
      },
      nutrition: formattedNutrition,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Update user's personal info
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
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { fullName, dateOfBirth } = validation.data;

    // Update user profile
    const updated = await db
      .update(userProfiles)
      .set({
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        updated_at: new Date(),
      })
      .where(eq(userProfiles.userId, session.user.id))
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Fetch user for membership
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      profile: {
        fullName: updated[0].fullName,
        email: session.user.email,
        dateOfBirth: updated[0].dateOfBirth ? updated[0].dateOfBirth.toISOString().split('T')[0] : "",
        membership: user[0]?.membership || "basic",
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
