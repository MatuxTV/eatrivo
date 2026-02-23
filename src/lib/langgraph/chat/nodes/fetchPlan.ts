import { db } from "@/index";
import { mealPlans } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ChatState } from "../state";
import { logger } from "@/lib/logger";

export async function fetchPlan(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  try {
    const [plan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.userProfileId, state.userProfileId))
      .orderBy(desc(mealPlans.created_at))
      .limit(1);

    logger.info(`[fetchPlan] Fetched plan for user ${state.userProfileId}:`, {
      metadata: {
        found: !!plan,
        planId: plan?.id,
      },
    });

    return {
      todaysPlan: plan
        ? { id: plan.id, meals: plan.meals, weekStartDate: plan.weekStartDate }
        : null,
    };
  } catch (error) {
    logger.error(`[fetchPlan] Error fetching plan`, error);
    return { todaysPlan: null };
  }
}
