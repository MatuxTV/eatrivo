"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChefHat, Loader2, Calendar } from "lucide-react";
import ReceiptCard from "@/app/home/components/ReceiptCard";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface Ingredient {
  name: string;
  amount: string;
  type?: string;
}

interface MealData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  difficulty: string;
  prepTime: number;
  meal_type: string;
  ingredients?: (string | Ingredient)[];
}

interface DayMealPlan {
  day: string;
  meals: MealData[];
  totalDailyCalories: number;
  totalDailyProtein: number;
  totalDailyCarbs: number;
  totalDailyFats: number;
}

interface MealPlanViewerModalProps {
  shoppingListId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MealPlanViewerModal({
  shoppingListId,
  isOpen,
  onOpenChange,
}: MealPlanViewerModalProps) {
  const t = useTranslations("home");
  const [mealPlan, setMealPlan] = useState<DayMealPlan[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || mealPlan !== null) return;

    const fetchMealPlan = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/meal-plans/${shoppingListId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch meal plan");
        }
        const data = await res.json();

        // The data.mealPlan is either DayMealPlan[] or wrapped in an object like { week: DayMealPlan[] }
        let planData = data.mealPlan;
        if (planData && !Array.isArray(planData) && planData.week) {
          planData = planData.week;
        }

        if (Array.isArray(planData)) {
          setMealPlan(planData);
        } else {
          toast.error("Invalid meal plan format");
        }
      } catch (error) {
        console.error("Error fetching meal plan:", error);
        toast.error("Nepodarilo sa načítať jedálniček");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMealPlan();
  }, [isOpen, shoppingListId, mealPlan]);

  const currentDayPlan = mealPlan?.[selectedDayIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden bg-eatrivo-white-primary">
        <DialogHeader className="px-5 pt-5 pb-4 border-b flex-shrink-0 bg-gradient-to-r from-eatrivo-purple/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-eatrivo-purple/10 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-5 h-5 text-eatrivo-purple" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 leading-tight">
                Priradený Jedálniček
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Vygenerovaný na základe tohto nákupného zoznamu
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span>Načítavam jedálniček...</span>
            </div>
          ) : !mealPlan || mealPlan.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <ChefHat className="w-10 h-10 mb-2 opacity-50" />
              <span>K tomuto zoznamu nebol nájdený žiadny jedálniček.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Day Selector */}
              <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
                {mealPlan.map((dayPlan, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDayIndex(index)}
                    className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedDayIndex === index
                        ? "bg-eatrivo-purple text-white shadow-md shadow-eatrivo-purple/20"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    {dayPlan.day}
                  </button>
                ))}
              </div>

              {/* Day Nutrition Summary */}
              {currentDayPlan && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Kalórie</p>
                    <p className="text-lg font-bold text-gray-900">
                      {currentDayPlan.totalDailyCalories} kcal
                    </p>
                  </div>
                  <div className="flex gap-4 sm:gap-6">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">
                        Bielkoviny
                      </p>
                      <p className="font-semibold text-eatrivo-blue">
                        {currentDayPlan.totalDailyProtein}g
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">
                        Sacharidy
                      </p>
                      <p className="font-semibold text-eatrivo-purple">
                        {currentDayPlan.totalDailyCarbs}g
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">
                        Tuky
                      </p>
                      <p className="font-semibold text-eatrivo-pink">
                        {currentDayPlan.totalDailyFats}g
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Meals Grid */}
              {currentDayPlan && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentDayPlan.meals.map((meal, index) => {
                    // Map to ReceiptCard expected format
                    const mappedMeal = {
                      id: `${selectedDayIndex}-${index}`,
                      title: meal.name,
                      description: `${meal.difficulty} • ${meal.prepTime} ${t("time.minutesShort")}`,
                      type: meal.meal_type || "snack",
                      cookTime: `${meal.prepTime} ${t("time.minutesShort")}`,
                      difficulty: meal.difficulty,
                      calories: meal.calories,
                      protein: meal.protein,
                      carbs: meal.carbs,
                      fat: meal.fat,
                      ingredients: meal.ingredients || [],
                    };
                    return (
                      <div key={mappedMeal.id} className="h-full">
                        <ReceiptCard
                          {...mappedMeal}
                          meal_type={mappedMeal.type}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
