// Deterministický výpočet (Mifflin-St Jeor) — bez DB, bez LLM
// Logika prevzatá z src/lib/langchain.ts:302-372

import type { ChatState } from "../state";
import type { MacroTargets } from "../types";
import { logger } from "@/lib/logger";

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.0,
  lightly_active: 1.175,
  moderately_active: 1.35,
  very_active: 1.52,
  athlete: 1.7,
};

export async function fetchMacros(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const { userInfo } = state;
  if (!userInfo?.dateOfBirth) {
    logger.warn(`[fetchMacros] Missing user info or date of birth.`);
    return { macroTargets: null };
  }

  const age =
    new Date().getFullYear() - new Date(userInfo.dateOfBirth).getFullYear();
  const weight = Number(userInfo.weight);
  const { height, sex, activity_level, goal } = userInfo;

  // Mifflin-St Jeor BMR
  const bmr =
    sex === "man"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] ?? 1.2;
  const tdee = Math.round(bmr * multiplier);

  const dailyCalories =
    goal === "lose_weight"
      ? Math.round(tdee - 300)
      : goal === "gain_muscle"
        ? Math.round(tdee * 1.15)
        : tdee;

  const protein =
    goal === "gain_muscle"
      ? Math.round(weight * 2.0)
      : Math.round(weight * 1.2);

  const fat = Math.round((dailyCalories * 0.25) / 9);
  const carbs = Math.round((dailyCalories - protein * 4 - fat * 9) / 4);

  const macroTargets: MacroTargets = {
    bmr: Math.round(bmr),
    tdee,
    dailyCalories,
    protein,
    fat,
    carbs,
  };

  logger.info(`[fetchMacros] Calculated macro targets:`, {
    metadata: { ...macroTargets },
  });

  return { macroTargets };
}
