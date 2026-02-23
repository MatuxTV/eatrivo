import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "../../../../../../index";
import { userInfoTable, shoppingLists, mealPlans, userProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) return rl.response!;

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile || !["admin", "coach"].includes(userProfile.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "User profile ID is required" },
        { status: 400 },
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid user profile ID format" },
        { status: 400 },
      );
    }

    // Fetch user_info by userProfileId
    const [userInfo] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, id))
      .limit(1);

    // Fetch user's shopping lists
    const userShoppingLists = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.userProfileId, id))
      .orderBy(desc(shoppingLists.created_at));

    // Fetch user's meal plans
    const userMealPlans = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.userProfileId, id))
      .orderBy(desc(mealPlans.created_at));

    if (!userInfo) {
      return NextResponse.json(
        {
          error: "User info not found. User may not have completed onboarding.",
        },
        { status: 404 },
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
        language: userInfo.language ?? "sk",
      },
      shoppingLists: userShoppingLists,
      mealPlans: userMealPlans,
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 },
    );
  }
}
