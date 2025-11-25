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
      <div className="relative min-h-[400px]">
        {/* Loading Overlay */}
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 backdrop-blur-sm rounded-2xl border border-purple-100 shadow-lg">
          <div className="flex flex-col items-center gap-6 p-8">
            {/* Animated Chef Hat */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink rounded-2xl flex items-center justify-center shadow-lg ">
                <ChefHat className="w-10 h-10 text-white" />
              </div>
              
            </div>
            
            {/* Progress Bar */}
            <div className="w-72 space-y-3">
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-eatrivo-purple via-eatrivo-pink to-eatrivo-purple rounded-full"
                  style={{
                    width: '100%',
                    animation: 'slideProgress 2s ease-in-out infinite',
                  }}
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-gray-900">Pripravujeme váš jedálny plán</p>
                <p className="text-xs text-gray-500">AI analyzuje vaše preferencie a vytvára personalizované jedlá...</p>
              </div>
            </div>

            {/* Animated dots */}
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-eatrivo-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-eatrivo-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-eatrivo-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>

        {/* CSS Animation */}
        <style jsx>{`
          @keyframes slideProgress {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(0%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>

        {/* Skeleton underneath (dimmed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 opacity-30">
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
