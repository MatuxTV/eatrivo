"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { getCurrentDaySlovak } from "@/lib/functions";
import { APP_CONFIG } from "@/app/config/app";
import { logger } from "@/lib/logger";
import { ReceiptText, Target, Mail } from "lucide-react";

// Components
import WelcomeDialog from "../components/WelcomeDialog";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import MobileNavigation from "./MobileNavigation";
import DailyNutritionSummary from "./DailyNutritionSummary";
import DailyMealPlan from "./DailyMealPlan";
import ShoppingListsOverview from "./ShoppingListsOverview";

// Type definitions
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

interface ShoppingList {
  id: string;
  title: string;
  description?: string;
  weekStartDate: string;
  weekEndDate: string;
  status: "active" | "completed" | "cancelled";
  cloudinaryPublicId: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState({
    shoppingLists: false,
    mealPlan: true, // Always start loading
  });
  const [mealPlanData, setMealPlanData] = useState<DayMealPlan[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const currentDay = useMemo(() => getCurrentDaySlovak(), []);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  // Check welcome dialog visibility after session loads (prevents hydration mismatch)
  useEffect(() => {
    if (session?.user) {
      const userVersion = session.user.lastSeenWelcomeVersion;
      const currentVersion = APP_CONFIG.WELCOME_DIALOG_VERSION;
      setShowWelcomeDialog(!userVersion || userVersion !== currentVersion);
    }
  }, [session?.user]);

  const handleCloseDialog = async () => {
    setShowWelcomeDialog(false);
    try {
      await fetch("/api/user/update-dialog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: APP_CONFIG.WELCOME_DIALOG_VERSION,
        }),
      });
    } catch (error) {
      logger.error("Failed to update welcome dialog version", error, {
        context: "DashboardPage",
        metadata: { userId: session?.user?.id },
      });
    }
  };

  // FETCH SHOPPING LISTS
  useEffect(() => {
    if (!isMounted || !session?.user) return;
    
    const fetchShoppingLists = async () => {
      try {
        setIsLoading((prev) => ({ ...prev, shoppingLists: true }));
        const response = await fetch("/api/shopping-lists");
        if (!response.ok) throw new Error("Failed to fetch shopping lists");
        const data = await response.json();
        setShoppingLists(data.shoppingLists || []);
      } catch (error) {
        logger.error("Error fetching shopping lists", error, {
          context: "DashboardPage",
          metadata: { userId: session?.user?.id },
        });
        toast.error("Nepodarilo sa načítať nákupné zoznamy");
        setShoppingLists([]);
      } finally {
        setIsLoading((prev) => ({ ...prev, shoppingLists: false }));
      }
    };
    fetchShoppingLists();
  }, [isMounted, session]);

  // FETCH MEAL PLAN with polling for generation status
  useEffect(() => {
    if (!isMounted || !session?.user) return;

    let statusCheckInterval: NodeJS.Timeout | null = null;
    let isComponentMounted = true;

    const checkGenerationStatus = async (): Promise<boolean> => {
      try {
        const statusResponse = await fetch("/api/meal-plans/status");
        if (!statusResponse.ok) return false;
        
        const statusData = await statusResponse.json();
        return statusData.isGenerating === true;
      } catch (error) {
        logger.error("Error checking generation status", error);
        return false;
      }
    };

    const fetchMealPlan = async () => {
      if (!isComponentMounted) return;

      try {
        // Call API - it will check shopping list → cache → DB → lock+generate
        const response = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        // Handle 202 - generation in progress, start polling
        if (response.status === 202 && data.isGenerating) {
          logger.info("Meal plan generation in progress, starting polling");
          
          // Start polling every 3 seconds
          if (!statusCheckInterval) {
            statusCheckInterval = setInterval(async () => {
              const stillGenerating = await checkGenerationStatus();
              logger.debug("Poll check", { metadata: { stillGenerating } });
              
              if (!stillGenerating && isComponentMounted) {
                logger.info("Generation completed, fetching meal plan");
                if (statusCheckInterval) clearInterval(statusCheckInterval);
                toast.success("Jedálny plán je pripravený!", { duration: 3000 });
                fetchMealPlan(); // Re-fetch to get the result
              }
            }, 3000);
          }
          return;
        }

        if (!response.ok) throw new Error("Failed to load meal plan");

        if (!data.success) {
          throw new Error(data.message || "Invalid meal plan data");
        }

        // Successfully loaded meal plan (from cache, DB, or fresh generation)
        const hasData = data.insights?.week && data.insights.week.length > 0;
        setMealPlanData(hasData ? data.insights.week : []);
        setIsLoading((prev) => ({ ...prev, mealPlan: false }));
        
        // Only show success toast if we have data and it's freshly generated (not cached/DB)
        if (hasData && !data.cached && !data.fromDatabase && data.fallbackUsed !== 'no-data') {
          toast.success("Jedálny plán je pripravený!");
        }

      } catch (error) {
        logger.error("Error loading meal plan", error, {
          context: "DashboardPage",
          metadata: { userId: session?.user?.id },
        });
        toast.error("Nepodarilo sa načítať jedálny plán");
        setIsLoading((prev) => ({ ...prev, mealPlan: false }));
      }
    };

    fetchMealPlan();

    // Cleanup function
    return () => {
      isComponentMounted = false;
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [isMounted, session]);

  const todaysMeals = useMemo(() => {
    if (!mealPlanData || mealPlanData.length === 0) return [];
    const todayPlan = mealPlanData.find((day) => day.day === currentDay);
    if (!todayPlan || !todayPlan.meals) return [];

    return todayPlan.meals.map((meal: MealData, index: number) => ({
      id: `${currentDay}-${index}`,
      title: meal.name,
      description: `${meal.difficulty} • ${meal.prepTime} minút`,
      type: meal.meal_type || "snack",
      cookTime: `${meal.prepTime} min`,
      difficulty: meal.difficulty,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      ingredients: meal.ingredients || [],
    }));
  }, [mealPlanData, currentDay]);

  const todaysNutrition = useMemo(() => {
    if (!mealPlanData || mealPlanData.length === 0) return null;
    const todayPlan = mealPlanData.find((day) => day.day === currentDay);
    return todayPlan
      ? {
          calories: todayPlan.totalDailyCalories,
          protein: todayPlan.totalDailyProtein,
          carbs: todayPlan.totalDailyCarbs,
          fats: todayPlan.totalDailyFats,
        }
      : null;
  }, [mealPlanData, currentDay]);

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      <WelcomeDialog
        open={showWelcomeDialog}
        onOpenChange={handleCloseDialog}
        version={APP_CONFIG.WELCOME_DIALOG_VERSION}
        changelog={
          APP_CONFIG.WELCOME_DIALOG_CHANGELOG[APP_CONFIG.WELCOME_DIALOG_VERSION]
        }
      />

      {/* Desktop Sidebar */}
      <DashboardSidebar />

      {/* Mobile Header */}
      <DashboardHeader />

      {/* Main Content */}
      <main className="flex-1 w-full md:max-w-[calc(100vw-256px)] pt-20 md:pt-8 pb-24 md:pb-8 px-4 md:px-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Vitajte späť, {session?.user?.name?.split(" ")[0]}! 👋
              </h1>
              <p className="text-gray-500 mt-1">
                Tu je váš prehľad na dnes,{" "}
                <span className="font-medium text-eatrivo-purple capitalize">
                  {currentDay}
                </span>
                .
              </p>
            </div>
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-xs font-medium text-gray-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Verzia {APP_CONFIG.WELCOME_DIALOG_VERSION}
            </div>
          </div>

          {/* Daily Plan Section */}
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ReceiptText className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Váš denný plán
                </h2>
              </div>

              {/* Nutrition Summary */}
              <div className="w-full md:w-auto">
                <DailyNutritionSummary data={todaysNutrition} />
              </div>
            </div>

            {/* Meals Grid */}
            <DailyMealPlan meals={todaysMeals} isLoading={isLoading.mealPlan} />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shopping Lists - Takes up 2 columns on large screens */}
            <div className="lg:col-span-2">
              <ShoppingListsOverview
                lists={shoppingLists}
                isLoading={isLoading.shoppingLists}
              />
            </div>

            {/* Right Column: Goals & Messages */}
            <div className="space-y-6">
              {/* Goals Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-eatrivo-purple/10 rounded-lg">
                    <Target className="w-5 h-5 text-eatrivo-purple" />
                  </div>
                  <h3 className="font-bold text-gray-900">Týždenné ciele</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <Target className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    Pripravujeme
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sledovanie cieľov už čoskoro
                  </p>
                </div>
              </div>

              {/* Messages Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-eatrivo-pink/10 rounded-lg">
                    <Mail className="w-5 h-5 text-eatrivo-pink" />
                  </div>
                  <h3 className="font-bold text-gray-900">Správy</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <Mail className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    Žiadne nové správy
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Schránka je prázdna
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />
    </div>
  );
}
