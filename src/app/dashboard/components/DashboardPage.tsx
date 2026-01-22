"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { getCurrentDay, getDayIndex } from "@/lib/functions";
import { APP_CONFIG } from "@/app/config/app";
import { logger } from "@/lib/logger";
import { ReceiptText, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isLocale, replaceLocaleInPathname } from "@/i18n/routing";

// Components
import WelcomeDialog from "../components/WelcomeDialog";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import MobileNavigation from "./MobileNavigation";
import DailyNutritionSummary from "./DailyNutritionSummary";
import DailyMealPlan from "./DailyMealPlan";
import ShoppingListsOverview from "./ShoppingListsOverview";
import BodyHealthCircle from "./BodyHealtCircle";
import WeightTracker from "./WeightTracker";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { PushNotificationToggle } from "@/components/pwa/PushNotificationToggle";

// PWA utilities
import { saveLatestShoppingList, getLatestShoppingList } from "@/lib/pwa/offlineStorage";

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
  createdAt: string;
}

interface UserHealthData {
  weight: number;
  height: number;
  activityLevel: string;
  goal: "lose_weight" | "maintain_weight" | "gain_muscle";
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [userHealthData, setUserHealthData] = useState<UserHealthData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState({
    shoppingLists: false,
    mealPlan: true, // Always start loading
  });
  const [mealPlanData, setMealPlanData] = useState<DayMealPlan[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [currentDay, setCurrentDay] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(new Date().getDay());

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    setCurrentDay(getCurrentDay(locale));
    setSelectedDayIndex(new Date().getDay());
  }, [locale]);

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
        const lists = data.shoppingLists || [];
        setShoppingLists(lists);

        // Save latest shopping list for offline access
        if (lists.length > 0) {
          try {
            await saveLatestShoppingList(lists[0]);
          } catch (offlineError) {
            console.error("Failed to save shopping list offline:", offlineError);
          }
        }
      } catch (error) {
        logger.error("Error fetching shopping lists", error, {
          context: "DashboardPage",
          metadata: { userId: session?.user?.id },
        });
        
        // Try to load from offline storage
        try {
          const offlineList = await getLatestShoppingList();
          if (offlineList) {
            const formattedList: ShoppingList = {
              ...offlineList,
              description: offlineList.description || undefined,
              weekStartDate: offlineList.weekStartDate.toString(),
              weekEndDate: offlineList.weekEndDate.toString(),
              createdAt: offlineList.createdAt.toString(),
              status: offlineList.status as "active" | "completed" | "cancelled",
            };
            setShoppingLists([formattedList]);
            toast.info(t("pwa.offline.showingData"));
          } else {
            toast.error(t("toasts.shoppingListsLoadError"));
            setShoppingLists([]);
          }
        } catch {
          toast.error(t("toasts.shoppingListsLoadError"));
          setShoppingLists([]);
        }
      } finally {
        setIsLoading((prev) => ({ ...prev, shoppingLists: false }));
      }
    };
    fetchShoppingLists();
  }, [isMounted, session, t]);

  // FETCH USER HEALTH DATA
  useEffect(() => {
    if (!isMounted || !session?.user) return;

    const fetchUserHealthData = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();

        if (data.nutrition) {
          setUserHealthData({
            weight: parseFloat(data.nutrition.weight) || 70,
            height: data.nutrition.height || 170,
            activityLevel: data.nutrition.activity_level || "sedentary",
            goal: data.nutrition.goal || "maintain_weight",
          });
        }
      } catch (error) {
        logger.error("Error fetching user health data", error, {
          context: "DashboardPage",
          metadata: { userId: session?.user?.id },
        });
      }
    };
    fetchUserHealthData();
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
                toast.success(t("toasts.mealPlanReady"), { duration: 3000 });
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
        if (
          hasData &&
          !data.cached &&
          !data.fromDatabase &&
          data.fallbackUsed !== "no-data"
        ) {
          toast.success(t("toasts.mealPlanReady"));
        }
      } catch (error) {
        logger.error("Error loading meal plan", error, {
          context: "DashboardPage",
          metadata: { userId: session?.user?.id },
        });
        toast.error(t("toasts.mealPlanLoadError"));
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
  }, [isMounted, session, t]);

  const todaysMeals = useMemo(() => {
    if (!isMounted) return [];
    if (!mealPlanData || mealPlanData.length === 0) return [];
    
    const todayPlan = mealPlanData.find((day) => getDayIndex(day.day) === selectedDayIndex);
    
    if (!todayPlan || !todayPlan.meals) return [];

    return todayPlan.meals.map((meal: MealData, index: number) => ({
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
    }));
  }, [mealPlanData, isMounted, selectedDayIndex, t]);

  const todaysNutrition = useMemo(() => {
    if (!isMounted) return null;
    if (!mealPlanData || mealPlanData.length === 0) return null;
    
    const todayPlan = mealPlanData.find((day) => getDayIndex(day.day) === selectedDayIndex);
    
    return todayPlan
      ? {
          calories: todayPlan.totalDailyCalories,
          protein: todayPlan.totalDailyProtein,
          carbs: todayPlan.totalDailyCarbs,
          fats: todayPlan.totalDailyFats,
        }
      : null;
  }, [mealPlanData, isMounted, selectedDayIndex]);

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
                {t("greeting.title", {
                  name: session?.user?.name?.split(" ")[0] || "",
                })}
              </h1>
              <p className="text-gray-500 mt-1">
                {t("greeting.subtitle")}{" "}
                <span className="font-medium text-eatrivo-purple">
                  {currentDay ? currentDay : ""}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-xs font-medium text-gray-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {t("version", { version: APP_CONFIG.WELCOME_DIALOG_VERSION })}
              </div>
              <Select
                value={locale}
                onValueChange={(value) => {
                  if (!isLocale(value)) return;
                  const nextPathname = replaceLocaleInPathname(pathname, value);
                  const queryString = searchParams.toString();
                  const hash =
                    typeof window !== "undefined" ? window.location.hash : "";
                  router.push(
                    `${nextPathname}${queryString ? `?${queryString}` : ""}${hash}`
                  );
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={t("navbar.language")}
                  className="h-9 w-[4.5rem] rounded-full border-transparent bg-transparent px-2 shadow-none hover:bg-gray-100 focus:ring-eatrivo-purple/15"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sk">SK</SelectItem>
                  <SelectItem value="en">EN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Daily Plan Section */}
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ReceiptText className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {t("dailyPlan.title")}
                </h2>
                
                {/* Day Navigation */}
                {isMounted && mealPlanData.length > 0 && (
                  <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-sm border border-gray-100">
                    <button
                      onClick={() => setSelectedDayIndex((prev) => (prev === 0 ? 6 : prev - 1))}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="Previous day"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
                      {selectedDayIndex === new Date().getDay() 
                        ? <span className="text-eatrivo-purple capitalize">{t("dailyPlan.today")}</span>
                        : mealPlanData.find(day => getDayIndex(day.day) === selectedDayIndex)?.day || currentDay
                      }
                    </span>
                    <button
                      onClick={() => setSelectedDayIndex((prev) => (prev === 6 ? 0 : prev + 1))}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="Next day"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                )}
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
            {/* Shopping Lists - Takes up 2 columns on large screens, last on mobile */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <ShoppingListsOverview
                lists={shoppingLists}
                isLoading={isLoading.shoppingLists}
              />
            </div>

            {/* Right Column: Health Circle & Weight Tracker - first on mobile */}
            <div className="space-y-6 order-1 lg:order-2">
              {/* Body Health Circle */}
              {userHealthData ? (
                <BodyHealthCircle
                  weight={userHealthData.weight}
                  height={userHealthData.height}
                  activityLevel={userHealthData.activityLevel}
                />
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
                  <div className="flex justify-center">
                    <div className="w-[180px] h-[180px] bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="h-20 bg-gray-200 rounded-xl"></div>
                    <div className="h-20 bg-gray-200 rounded-xl"></div>
                  </div>
                </div>
              )}

              {/* Weight Tracker */}
              <WeightTracker
                initialWeight={userHealthData?.weight}
                goal={userHealthData?.goal}
                onWeightUpdate={(newWeight) => {
                  if (userHealthData) {
                    setUserHealthData({ ...userHealthData, weight: newWeight });
                  }
                }}
              />
              
              {/* Push Notification Toggle */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t("notifications.title")}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t("notifications.description")}
                </p>
                <PushNotificationToggle />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
