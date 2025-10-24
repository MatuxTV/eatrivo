"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ReceiptText,
  UtensilsCrossed,
  Target,
  Mail,
  ChefHat,
  LogOut,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ReceiptCard from "@/components/dashboard/ReceiptCard";
import ShoppingListCard from "@/components/dashboard/ShoppingListCard";
import { toast } from "sonner";
import type { Session } from "next-auth";
import { getCurrentDaySlovak, getMembershipStatus } from "@/lib/functions";
import WelcomeDialog from "../components/WelcomeDialog";
import { APP_CONFIG } from "@/app/config/app";
import { logger } from "@/lib/logger";

// Type definitions
interface MealData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  difficulty: string;
  prepTime: number;
  meal_type: string; 
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

interface DashboardPageProps {
  session: Session;
}

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
}

export default function DashboardPage({ session }: DashboardPageProps) {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState({
    shoppingLists: true,
    mealPlan: false,
  });
  const [mealPlanData, setMealPlanData] = useState<DayMealPlan[]>([]);
  const currentDay = useMemo(() => getCurrentDaySlovak(), []);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(() => {
    // Porovnať session verziu s aktuálnou verziou
    const userVersion = session?.user?.lastSeenWelcomeVersion;
    const currentVersion = APP_CONFIG.WELCOME_DIALOG_VERSION;

    // Zobraz ak: žiadna verzia ALEBO stará verzia
    return !userVersion || userVersion !== currentVersion;
  });

  const handleCloseDialog = async () => {
    setShowWelcomeDialog(false);

    // Uložiť verziu do DB
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

  //FETCH SHOPPING LISTS
  useEffect(() => {
    const fetchShoppingLists = async () => {
      if (!session?.user) return;

      try {
        setIsLoading((prev) => ({ ...prev, shoppingLists: true }));
        const response = await fetch("/api/shopping-lists");
        if (!response.ok) {
          throw new Error("Failed to fetch shopping lists");
        }
        const data = await response.json();
        setShoppingLists(data.shoppingLists || []);
      } catch (error) {
        logger.error("Error fetching shopping lists", error, {
          context: "DashboardPage",
          metadata: { userId: session?.user?.id },
        });
        toast.error("Nepodarilo sa načítať jedálne plány");
        setShoppingLists([]);
      } finally {
        setIsLoading((prev) => ({ ...prev, shoppingLists: false }));
      }
    };
    fetchShoppingLists();
  }, [session]);

  //FETCH MEAL PLAN
  useEffect(() => {
    const fetchMealPlan = async () => {
      if (!session?.user) return;

      try {
        setIsLoading((prev) => ({ ...prev, mealPlan: true }));
        const response = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to generate meal plan");

        const data = await response.json();

        if (!data.success || !data.insights?.week) {
          throw new Error(data.message || "Invalid meal plan data");
        }
        setMealPlanData(data.insights.week);
      } catch (error) {
        logger.error("Error loading meal plan", error, {
          context: "DashboardPage",
          metadata: { userId: session?.user?.id },
        });
        toast.error("Failed to load meal plan");
      } finally {
        setIsLoading((prev) => ({ ...prev, mealPlan: false }));
      }
    };

    fetchMealPlan();
  }, [session]);

  const todaysMeals = useMemo(() => {
    if (!mealPlanData || mealPlanData.length === 0) return [];

    const todayPlan = mealPlanData.find((day) => day.day === currentDay);

    if (!todayPlan || !todayPlan.meals) return [];

    return todayPlan.meals.map((meal: MealData, index: number) => ({
      id: `${currentDay}-${index}`, // Unikátny ID pre React key
      title: meal.name,
      description: `${meal.difficulty} • ${meal.prepTime} minút`, // Generujeme popis
      type: meal.meal_type || "snack", // Priradíme typ podľa poradia
      cookTime: `${meal.prepTime} min`, // Pretvoríme číslo na string
      difficulty: meal.difficulty,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    }));
  }, [mealPlanData, currentDay]);

  // 3️⃣ Získaj aj denné súčty pre dnešný deň
  const todaysNutrition = useMemo(() => {
    if (!mealPlanData || mealPlanData.length === 0) return null;

    const todayPlan = mealPlanData.find((day) => day.day === currentDay);

    console.log("Today's Plan:", todayPlan);

    return todayPlan
      ?   {
          calories: todayPlan.totalDailyCalories,
          protein: todayPlan.totalDailyProtein,
          carbs: todayPlan.totalDailyCarbs,
          fats: todayPlan.totalDailyFats,
        }
      : null;
  }, [mealPlanData, currentDay]);

  console.log("Today's Nutrition:", todaysNutrition);

  return (
    <>
      <WelcomeDialog
        open={showWelcomeDialog}
        onOpenChange={handleCloseDialog}
        session={session}
        version={APP_CONFIG.WELCOME_DIALOG_VERSION}
        changelog={
          APP_CONFIG.WELCOME_DIALOG_CHANGELOG[APP_CONFIG.WELCOME_DIALOG_VERSION]
        }
      />
      <div className="min-h-screen flex flex-col md:flex-row w-full bg-primary-foreground pb-20 md:pb-0">
        {/* Trial badge - adjust position for mobile */}
        <div className="fixed top-16 right-2 md:top-4 md:right-4 bg-eatrivo-purple text-white px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold shadow-lg z-50">
          {`Trial v${APP_CONFIG.WELCOME_DIALOG_VERSION}`}
        </div>

        {/* Mobile top bar with user info */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-100 z-40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session?.user?.name || "User"}
                  width={32}
                  height={32}
                  className="rounded-full ring-2 ring-eatrivo-purple/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-eatrivo-purple/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-eatrivo-purple" />
                </div>
              )}
              <div>
                <h2 className="text-xs font-semibold text-gray-900 truncate max-w-[150px]">
                  {session?.user?.name}
                </h2>
                <p
                  className={`text-[10px] capitalize ${getMembershipStatus(
                    session?.user?.membership
                  )}`}
                >
                  {session?.user?.membership || "basic"} účet
                </p>
              </div>
            </div>
            <Link href="/signout">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <LogOut className="w-4 h-4 text-red-600" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile section - hidden on mobile, sidebar on desktop */}
        <div className="hidden md:flex md:w-64 bg-white shadow-sm border-r border-gray-100 flex-col">
          {/* Profile card */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {session?.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session?.user?.name || "User"}
                      width={48}
                      height={48}
                      className="rounded-full ring-2 ring-eatrivo-purple/20"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-eatrivo-purple/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-eatrivo-purple" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">
                    {session?.user?.name}
                  </h2>
                  <p
                    className={`text-xs capitalize ${getMembershipStatus(
                      session?.user?.membership
                    )}`}
                  >
                    {session?.user?.membership || "basic"} účet
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs bg-primary-foreground text-secondary-text"
                  asChild
                >
                  <Link href="/profile">
                    <User className="w-3 h-3 mr-1" />
                    Profil
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  asChild
                >
                  <Link href="/signout">
                    <LogOut className="w-3 h-3 mr-1" />
                    Odhlásiť
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              <Link
                className="flex items-center p-3 rounded-lg bg-blue-50 text-blue-700 font-medium"
                href="/dashboard"
              >
                <ReceiptText className="mr-3 w-4 h-4" />
                Dashboard
              </Link>
              {/* <Link
                className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-50"
                href="/profile"
              >
                <UtensilsCrossed className="mr-3 w-4 h-4" />
                Profil
              </Link> */}
              {/* <Link
                className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-50"
                href="/settings"
              >
                <MessageCircle className="mr-3 w-4 h-4" />
                Nastavenia
              </Link> */}
            </div>
          </nav>
        </div>

        {/* Main content - full width on mobile, 5/6 on desktop */}
        <div className="w-full md:w-5/6 p-3 md:p-6 mt-14 md:mt-0">
          {/* Welcome - responsive padding and text */}
          <div className="bg-secondary-foreground p-4  md:p-6 rounded-xl md:rounded-2xl mb-4 md:mb-8">
            <h1 className="text-xl md:text-3xl text-center md:text-start  font-bold text-gray-800 mb-2 md:mb-6">
              Vitajte späť, {session?.user?.name?.split(" ")[0]}!
            </h1>
            <p className="text-sm text-center md:text-start md:text-base text-gray-600">
              Tu je váš denný plán a prehľad.
            </p>
          </div>
          {/* Main Content Grid - responsive layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Section - Daily Plan - full width on mobile */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-blue-200">
                {/* Header - responsive layout */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-4">
                  <div className="flex items-center">
                    <ReceiptText
                      className="mr-2 md:mr-3 text-blue-600"
                      size={20}
                    />
                    <h1 className="text-base md:text-xl font-bold text-gray-800">
                      Váš denný plán na dnes
                    </h1>
                  </div>
                  {/* Nutrition Summary Circles - responsive grid */}
                  <div className="flex gap-2 md:gap-3 overflow-x-auto">
                    <div className="flex flex-col items-center min-w-fit">
                      <div className="w-14 h-10 md:w-16 md:h-12 rounded-xl bg-eatrivo-purple/10 border-2 border-eatrivo-purple flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-xs md:text-sm font-bold text-eatrivo-purple">
                            {todaysNutrition?.calories ?? "—"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] md:text-xs text-gray-600 mt-1 text-center">
                        Kalórie
                      </span>
                    </div>
                    <div className="flex flex-col items-center min-w-fit">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-eatrivo-green/10 border-2 border-eatrivo-green flex items-center justify-center">
                        <div className="text-xs md:text-sm font-bold text-eatrivo-green">
                          {todaysNutrition?.protein ?? "—"}
                        </div>
                      </div>
                      <span className="text-[10px] md:text-xs text-gray-600 mt-1 text-center">
                        Proteín
                      </span>
                    </div>
                    <div className="flex flex-col items-center min-w-fit">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-eatrivo-orange/10 border-2 border-eatrivo-orange flex items-center justify-center">
                        <div className="text-xs md:text-sm font-bold text-eatrivo-orange">
                          {todaysNutrition?.carbs ?? "—"}
                        </div>
                      </div>
                      <span className="text-[10px] md:text-xs text-gray-600 mt-1 text-center">
                        Sacharidy
                      </span>
                    </div>
                    <div className="flex flex-col items-center min-w-fit">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-eatrivo-pink/10 border-2 border-eatrivo-pink flex items-center justify-center">
                        <div className="text-xs md:text-sm font-bold text-eatrivo-pink">
                          {todaysNutrition?.fats ?? "—"}
                        </div>
                      </div>
                      <span className="text-[10px] md:text-xs text-gray-600 mt-1 text-center">
                        Tuky
                      </span>
                    </div>
                  </div>
                </div>

                {/* Meal Cards - responsive grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  {isLoading.mealPlan ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-8 md:py-12">
                      {/* Spinning Loader */}
                      <div className="relative mb-4 md:mb-6">
                        <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-eatrivo-purple/20 border-t-eatrivo-purple rounded-full animate-spin"></div>
                        <ChefHat className="w-6 h-6 md:w-8 md:h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-eatrivo-purple" />
                      </div>

                      {/* Animovaný text - responsive */}
                      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 text-center px-4">
                        Pripravujem váš jedálny plán
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4 flex items-center gap-1 px-4">
                        <span>Generujem personalizované recepty</span>
                        <span className="animate-pulse">...</span>
                      </p>

                      {/* Odhadovaný čas - responsive */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 md:px-4 md:py-2 mx-4">
                        <p className="text-[10px] md:text-xs text-blue-700 text-center">
                          ⏱️ Zvyčajne to trvá 1-2 minúty. Ďakujeme za vašu
                          trpezlivosť!
                        </p>
                      </div>
                    </div>
                  ) : todaysMeals.length > 0 ? (
                    // Render meals
                    todaysMeals.map((meal: Meal) => (
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
                      />
                    ))
                  ) : (
                    // Empty state - responsive
                    <div className="col-span-full text-center py-6 md:py-8">
                      <ChefHat className="w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-300 mb-3 md:mb-4" />
                      <p className="text-sm md:text-base text-gray-500">
                        Žiadne jedlá na dnes
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Goals Section - responsive */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg">
              <div className="flex items-center mb-3 md:mb-4">
                <Target
                  className="mr-2 md:mr-3 text-eatrivo-purple"
                  size={18}
                />
                <h2 className="text-base md:text-lg font-bold text-gray-800">
                  Ciele na tento týždeň
                </h2>
              </div>
              <div className="flex justify-center items-center w-full h-32 md:h-full text-center text-eatrivo-purple font-bold text-sm md:text-base">
                COMING SOON
              </div>
            </div>

            {/* Shopping Lists Section - responsive */}
            <div className="lg:col-span-2">
              <Card className="bg-secondary-foreground rounded-xl shadow-2xl p-4 md:p-6">
                <CardHeader className="pb-3 md:pb-4 px-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-lg md:text-xl font-bold text-primary-text flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 md:w-5 md:h-5" />
                      Vaše jedálne plány
                    </CardTitle>
                    <div className="text-xs md:text-sm text-gray-500">
                      {shoppingLists.length}{" "}
                      {shoppingLists.length === 1
                        ? "zoznam"
                        : shoppingLists.length < 5
                        ? "zoznamy"
                        : "zoznamov"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  {isLoading.shoppingLists ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-white border border-gray-200 rounded-xl md:rounded-2xl p-4 md:p-6 animate-pulse"
                        >
                          <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-xl md:rounded-2xl"></div>
                            <div className="flex-1">
                              <div className="h-3 md:h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                              <div className="h-2 md:h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                          <div className="h-2 md:h-3 bg-gray-200 rounded mb-3 md:mb-4 w-2/3"></div>
                          <div className="flex items-center justify-between">
                            <div className="h-2 md:h-3 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-6 md:h-8 bg-gray-200 rounded w-16 md:w-20"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : shoppingLists.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {shoppingLists.map((plan: ShoppingList) => (
                        <ShoppingListCard key={plan.id} {...plan} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 md:py-12">
                      <UtensilsCrossed className="w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-300 mb-3 md:mb-4" />
                      <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
                        Žiadne jedálne plány
                      </h3>
                      <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6 px-4">
                        Zatiaľ nemáte žiadne jedálne plány. Požiadajte svojho
                        trénera o vytvorenie personalizovaného plánu.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4 mx-4">
                        <p className="text-xs md:text-sm text-blue-800">
                          💡 <strong>Tip:</strong> Jedálne plány vám pomôžu
                          dosiahnuť vaše fitnes ciele efektívnejšie!
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Messages Section - responsive */}
            <div className="space-y-4 md:space-y-6">
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg">
                <div className="flex items-center mb-3 md:mb-4">
                  <Mail
                    className="mr-2 md:mr-3 text-eatrivo-purple"
                    size={18}
                  />
                  <h2 className="text-base md:text-lg font-bold text-gray-800">
                    Správy
                  </h2>
                </div>
                <div>
                  <p className="flex justify-center w-full text-center text-eatrivo-purple font-bold h-32 md:h-full items-center text-sm md:text-base">
                    COMING SOON
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="grid grid-cols-3 gap-1 p-2">
            <Link
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-700"
              href="/dashboard"
            >
              <ReceiptText className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Dashboard</span>
            </Link>
            {/* <Link
              className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-50 active:bg-gray-100"
              href="/profile"
            >
              <User className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Profil</span>
            </Link> */}
            {/* <Link
              className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-50 active:bg-gray-100"
              href="/settings"
            >
              <MessageCircle className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Nastavenia</span>
            </Link> */}
          </div>
        </nav>
      </div>
    </>
  );
}
