import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../index";
import { userInfoTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "User profile ID is required" },
        { status: 400 }
      );
    }

    // Fetch user_info by userProfileId
    const [userInfo] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, id))
      .limit(1);

    if (!userInfo) {
      return NextResponse.json(
        { error: "User info not found. User may not have completed onboarding." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      userInfo: {
        sex: userInfo.sex,
        dateOfBirth: userInfo.dateOfBirth,
        height: userInfo.height,
        weight: userInfo.weight,
        activity_level: userInfo.activity_level,
        goal: userInfo.goal,
        meal_per_day: userInfo.meal_per_day,
        cooking_time_pref: userInfo.cooking_time_pref,
        diet_preferences: userInfo.diet_preferences,
        budget_preference: userInfo.budget_preference,
        likes: userInfo.likes,
        dislikes: userInfo.dislikes,
        allergies: userInfo.allergies,
      },
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
