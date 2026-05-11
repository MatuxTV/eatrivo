export type Intent =
  | "meal_swap"
  | "macros"
  | "pantry"
  | "recipe"
  | "recipe_creation"
  | "general";

export interface ChatUserProfile {
  id: string;
  fullName: string;
}

export interface ChatUserInfo {
  sex: "man" | "woman";
  goal: string;
  diet_preferences: string | null;
  allergies: string | null;
  likes: string | null;
  dislikes: string | null;
  weight: string;
  height: number;
  dateOfBirth: Date | null;
  activity_level: string;
  meal_per_day: number | null;
}

export interface MacroTargets {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface MealPlanData {
  id: string;
  meals: unknown;
  weekStartDate: Date;
}

export interface PantryItem {
  name: string;
  quantity?: string;
}
