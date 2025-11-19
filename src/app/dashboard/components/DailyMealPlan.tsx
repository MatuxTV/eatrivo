"use client";

import { ChefHat } from "lucide-react";
import ReceiptCard from "@/components/dashboard/ReceiptCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Ingredient } from "@/types/meal-plan";

interface Meal {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  cookTime: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  type: string;
  ingredients?: (string | Ingredient)[];
}

interface DailyMealPlanProps {
  meals: Meal[];
  isLoading: boolean;
}

export default function DailyMealPlan({
  meals,
  isLoading,
}: DailyMealPlanProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4"
          >
            <div className="flex gap-4">
              <Skeleton className="w-16 h-16 rounded-2xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <ChefHat className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Žiadne jedlá na dnes
        </h3>
        <p className="text-sm text-gray-500 max-w-xs text-center mt-1">
          Váš tréner pre vás zatiaľ nepripravil jedálny plán na tento deň.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {meals.map((meal) => (
        <ReceiptCard
          key={meal.id}
          icon={<ChefHat className="w-6 h-6 text-white" />}
          title={meal.title}
          description={meal.description}
          difficulty={meal.difficulty}
          cookTime={meal.cookTime}
          calories={meal.calories}
          protein={meal.protein}
          carbs={meal.carbs}
          fat={meal.fat}
          meal_type={meal.type}
          ingredients={meal.ingredients}
        />
      ))}
    </div>
  );
}
