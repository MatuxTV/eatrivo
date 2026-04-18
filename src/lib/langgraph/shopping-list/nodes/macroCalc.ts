import type { ShoppingListState } from "../state";
import type { MacroTargets } from "../types";
import { apiLogger } from "@/lib/logger";

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
  extremely_active: 1.9,
};

const deficitByActivity: Record<string, number> = {
  sedentary: 300,
  lightly_active: 280,
  moderately_active: 260,
  very_active: 240,
  athlete: 220,
};

export async function macroCalc(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  const { userInfo } = state;
  if (!userInfo) return { error: "macroCalc: userInfo is null" };

  apiLogger.info("[macroCalc] start", { metadata: { userProfileId: state.userProfileId, goal: userInfo.goal, activity: userInfo.activity_level } });

  // ── Age ──
  const today = new Date();
  const birthDate = new Date(userInfo.dateOfBirth!);
  let userAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    userAge--;
  }

  // ── BMR (Mifflin-St Jeor) ──
  const weight = Number(userInfo.weight);
  let bmr: number;
  if (userInfo.sex === "man") {
    bmr = 10 * weight + 6.25 * userInfo.height - 5 * userAge + 5;
  } else {
    bmr = 10 * weight + 6.25 * userInfo.height - 5 * userAge - 161;
  }

  // ── TDEE ──
  const tdee = bmr * (activityMultipliers[userInfo.activity_level] ?? 1);

  // ── Daily Calories ──
  let dailyCalories: number;
  if (userInfo.goal === "lose_weight") {
    const deficit = deficitByActivity[userInfo.activity_level] ?? 300;
    dailyCalories = Math.round(tdee - deficit);
  } else if (userInfo.goal === "gain_muscle") {
    dailyCalories = Math.round(tdee * 1.15);
  } else {
    dailyCalories = Math.round(tdee);
  }

  // ── Protein ──
  const proteinMultiplier =
    userInfo.goal === "lose_weight"
      ? 1.2
      : userInfo.goal === "gain_muscle"
        ? 2.0
        : 1.6;
  const protein = Math.round(weight * proteinMultiplier);

  // ── Fat (25% of daily kcal) ──
  const fat = Math.round((dailyCalories * 0.25) / 9);

  // ── Carbs (remainder) ──
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbs = Math.round((dailyCalories - proteinKcal - fatKcal) / 4);

  const macroTargets: MacroTargets = {
    dailyCalories,
    protein,
    fat,
    carbs,
  };

  apiLogger.info("[macroCalc] result", {
    metadata: {
      userProfileId: state.userProfileId,
      dailyCalories,
      protein,
      fat,
      carbs,
    },
  });

  return { macroTargets };
}
