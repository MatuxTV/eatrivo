import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { shoppingListTemplates, mealPlanTemplates, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile || userProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await db.query.shoppingListTemplates.findMany({
      columns: {
        id: true,
        goal: true,
        diet: true,
        title: true,
        isActive: true,
        created_at: true,
      },
    });

    const mealPlans = await db.query.mealPlanTemplates.findMany({
      columns: {
        id: true,
        goal: true,
        diet: true,
        shoppingListTemplateId: true,
        isActive: true,
      },
    });

    // Group templates by goal + diet
    const combinations = templates.reduce((acc, t) => {
      const key = `${t.goal}_${t.diet}`;
      acc[key] = t;
      return acc;
    }, {} as Record<string, (typeof templates)[0]>);

    return NextResponse.json({
      totalShoppingListTemplates: templates.length,
      totalMealPlanTemplates: mealPlans.length,
      templates,
      mealPlans,
      combinations: Object.keys(combinations),
      missing: getMissingCombinations(combinations),
    });
  } catch (error) {
    console.error("[Debug] Error fetching templates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getMissingCombinations(existing: Record<string, unknown>) {
  const goals = ["lose_weight", "maintain_weight", "gain_muscle"];
  const diets = ["none", "lactosefree", "vegetarian", "vegan", "pescatarian", "ketogenic", "paleolithic"];

  const missing = [];
  for (const goal of goals) {
    for (const diet of diets) {
      const key = `${goal}_${diet}`;
      if (!existing[key]) {
        missing.push({ goal, diet });
      }
    }
  }

  return missing;
}
