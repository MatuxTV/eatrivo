import { NextResponse } from "next/server";
import { db } from "@/index";
import { shoppingListTemplates, mealPlanTemplates } from "@/db/schema";

export async function GET() {
  try {
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
    }, {} as Record<string, any>);

    return NextResponse.json({
      totalShoppingListTemplates: templates.length,
      totalMealPlanTemplates: mealPlans.length,
      templates,
      mealPlans,
      combinations: Object.keys(combinations),
      missing: getMissingCombinations(combinations),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function getMissingCombinations(existing: Record<string, any>) {
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
