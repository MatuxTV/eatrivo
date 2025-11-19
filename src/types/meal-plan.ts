// Meal Plan Types
export interface Meal {
  id: string;
  name: string;
  description?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  ingredients?: string[];
  instructions?: string[];
}

export interface DayMealPlan {
  date: string;
  meals: Meal[];
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFats?: number;
}

export interface WeekMealPlan {
  id: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  days: DayMealPlan[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MealPlanResponse {
  success: boolean;
  mealPlan: WeekMealPlan | null;
  shoppingList?: {
    id: string;
    title: string;
    weekStartDate: string;
    weekEndDate: string;
  } | null;
  error?: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  type?: string;
}
