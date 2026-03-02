import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { mealPlans, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shoppingListId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shoppingListId } = await params;

  try {
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const mealPlan = await db.query.mealPlans.findFirst({
      where: and(
        eq(mealPlans.userProfileId, userProfile.id),
        eq(mealPlans.shoppingListId, shoppingListId),
      ),
    });

    if (!mealPlan) {
      return NextResponse.json(
        { error: "Meal plan not found for this shopping list" },
        { status: 404 },
      );
    }

    return NextResponse.json({ mealPlan: mealPlan.meals });
  } catch (error) {
    apiLogger.error("GET /api/meal-plans/[shoppingListId] error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
