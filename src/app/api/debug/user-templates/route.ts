import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { userProfiles, userInfoTable, shoppingListTemplates, templateAssignments, shoppingLists, mealPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get user info (goal + diet)
    const userInfo = await db.query.userInfoTable.findFirst({
      where: eq(userInfoTable.userProfileId, userProfile.id),
      columns: {
        goal: true,
        diet_preferences: true,
      },
    });

    // Find matching template
    const matchingTemplate = userInfo
      ? await db.query.shoppingListTemplates.findFirst({
          where: and(
            eq(shoppingListTemplates.goal, userInfo.goal),
            eq(shoppingListTemplates.diet, userInfo.diet_preferences || "none"),
            eq(shoppingListTemplates.isActive, true)
          ),
        })
      : null;

    // Get template assignments
    const assignments = await db.query.templateAssignments.findMany({
      where: eq(templateAssignments.userProfileId, userProfile.id),
    });

    // Get shopping lists
    const userShoppingLists = await db.query.shoppingLists.findMany({
      where: eq(shoppingLists.userProfileId, userProfile.id),
      columns: {
        id: true,
        title: true,
        status: true,
        created_at: true,
      },
    });

    // Get meal plans
    const userMealPlans = await db.query.mealPlans.findMany({
      where: eq(mealPlans.userProfileId, userProfile.id),
      columns: {
        id: true,
        shoppingListId: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      userId: session.user.id,
      membership: session.user.membership,
      userProfileId: userProfile.id,
      userInfo: {
        goal: userInfo?.goal,
        diet: userInfo?.diet_preferences,
      },
      matchingTemplate: matchingTemplate
        ? {
            id: matchingTemplate.id,
            goal: matchingTemplate.goal,
            diet: matchingTemplate.diet,
            title: matchingTemplate.title,
          }
        : null,
      templateAssignments: assignments.length,
      shoppingLists: userShoppingLists.length,
      mealPlans: userMealPlans.length,
      details: {
        assignments,
        shoppingLists: userShoppingLists,
        mealPlans: userMealPlans,
      },
    });
  } catch (error) {
    console.error("[Debug] Error fetching user templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
