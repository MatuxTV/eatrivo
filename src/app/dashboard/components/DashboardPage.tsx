"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ReceiptText,
  UtensilsCrossed,
  MessageCircle,
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
  const [mealPlanData, setMealPlanData] = useState<any[]>([]);
  const currentDay = useMemo(() => getCurrentDaySlovak(), []);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(() => {
    // Check if user has seen the welcome dialog
    if (typeof window !== "undefined") {
      return !localStorage.getItem("welcomeDialogSeen");
    }
    return true;
  });

  const handleCloseDialog = () => {
    setShowWelcomeDialog(false);
    localStorage.setItem("welcomeDialogSeen", "true");
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
        console.error("Error fetching shopping lists:", error);
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
        console.log("Fetching meal plan...");
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
        console.error("Error:", error);
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

    // 2️⃣ Transformuj meals na formát pre ReceiptCard
    const mealTypes = ["breakfast", "lunch", "dinner", "snack"]; // Podľa počtu jedál

    return todayPlan.meals.map((meal: any, index: number) => ({
      id: `${currentDay}-${index}`, // Unikátny ID pre React key
      title: meal.name,
      description: `${meal.difficulty} • ${meal.prepTime} minút`, // Generujeme popis
      type: mealTypes[index] || "snack", // Priradíme typ podľa poradia
      cookTime: `${meal.prepTime} min`, // Pretvoríme číslo na string
      difficulty: meal.difficulty,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    }));
  }, [mealPlanData]);

  // 3️⃣ Získaj aj denné súčty pre dnešný deň
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
  }, [mealPlanData]);
  console.log("Meal plan:", todaysMeals);

  return (
    <>
      <WelcomeDialog
        open={showWelcomeDialog}
        onOpenChange={setShowWelcomeDialog}
        session={session}
      />
      <div className="min-h-screen flex w-full bg-primary-foreground">
        <div className="fixed top-4 right-4 bg-eatrivo-purple text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-50">
          Trial v0.0.1
        </div>
        {/* Profile section */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-100 flex flex-col">
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
              <Link
                className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-50"
                href="/profile"
              >
                <UtensilsCrossed className="mr-3 w-4 h-4" />
                Profil
              </Link>
              <Link
                className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-50"
                href="/settings"
              >
                <MessageCircle className="mr-3 w-4 h-4" />
                Nastavenia
              </Link>
            </div>
          </nav>
        </div>

        {/* Main content */}
        <div className="w-5/6 p-6">
          {/* Welcome */}
          <div className=" bg-secondary-foreground p-6 rounded-2xl mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              Vitajte späť, {session?.user?.name?.split(" ")[0]}!
            </h1>
            <p className="text-gray-600 mb-8">
              Tu je váš denný plán a prehľad.
            </p>
          </div>
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Section - Daily Plan */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <ReceiptText className="mr-3 text-blue-600" size={24} />
                    <h1 className="text-xl font-bold text-gray-800">
                      Váš denný plán na dnes
                    </h1>
                  </div>
                  {/* Nutrition Summary Circles */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-12 rounded-xl bg-eatrivo-purple/10 border-2 border-eatrivo-purple flex items-center justify-center">
                        <div className="text-center ">
                          <div className="text-sm font-bold text-eatrivo-purple">
                            {todaysNutrition?.calories ?? "—"}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 mt-1">
                        Denné kalórie
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-eatrivo-green/10 border-2 border-eatrivo-green flex items-center justify-center">
                        <div className="text-sm font-bold text-eatrivo-green">
                          {todaysNutrition?.protein ?? "—"}
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 mt-1">
                        Bielkoviny
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-eatrivo-orange/10 border-2 border-eatrivo-orange flex items-center justify-center">
                        <div className="text-sm font-bold text-eatrivo-orange">
                          {todaysNutrition?.carbs ?? "—"}
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 mt-1">
                        Sacharidy
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-eatrivo-pink/10 border-2 border-eatrivo-pink flex items-center justify-center">
                        <div className="text-sm font-bold text-eatrivo-pink">
                          {todaysNutrition?.fats ?? "—"}
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 mt-1">Tuky</span>
                    </div>
                  </div>
                </div>

                {/* Meal Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {isLoading.mealPlan ? (
                    <div className="col-span-3 flex flex-col items-center justify-center py-12">
                      {/* Spinning Loader */}
                      <div className="relative mb-6">
                        <div className="w-16 h-16 border-4 border-eatrivo-purple/20 border-t-eatrivo-purple rounded-full animate-spin"></div>
                        <ChefHat className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-eatrivo-purple" />
                      </div>

                      {/* Animovaný text */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Pripravujem váš jedálny plán
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                        <span>Generujem personalizované recepty</span>
                        <span className="animate-pulse">...</span>
                      </p>

                      {/* Odhadovaný čas */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                        <p className="text-xs text-blue-700">
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
                    // Empty state
                    <div className="col-span-3 text-center py-8">
                      <ChefHat className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">Žiadne jedlá na dnes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Goals Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <Target className="mr-3 text-eatrivo-purple" size={20} />
                <h2 className="text-lg font-bold text-gray-800">
                  Ciele na tento týždeň
                </h2>
              </div>
              <div className=" justify-center w-full h-full text-center text-eatrivo-purple font-bold">
                COMING SOON
              </div>
            </div>

            {/* Shopping Lists Section */}
            <div className="lg:col-span-2">
              <Card className="bg-secondary-foreground rounded-xl shadow-2xl p-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-primary-text flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5" />
                      Vaše jedálne plány
                    </CardTitle>
                    <div className="text-sm text-gray-500">
                      {shoppingLists.length}{" "}
                      {shoppingLists.length === 1
                        ? "zoznam"
                        : shoppingLists.length < 5
                        ? "zoznamy"
                        : "zoznamov"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading.shoppingLists ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse"
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                          <div className="h-3 bg-gray-200 rounded mb-4 w-2/3"></div>
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-8 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : shoppingLists.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {shoppingLists.map((plan: ShoppingList) => (
                        <ShoppingListCard key={plan.id} {...plan} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <UtensilsCrossed className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Žiadne jedálne plány
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Zatiaľ nemáte žiadne jedálne plány. Požiadajte svojho
                        trénera o vytvorenie personalizovaného plánu.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-sm text-blue-800">
                          💡 <strong>Tip:</strong> Jedálne plány vám pomôžu
                          dosiahnuť vaše fitnes ciele efektívnejšie!
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Messages Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <Mail className="mr-3 text-eatrivo-purple" size={20} />
                  <h2 className="text-lg font-bold text-gray-800">Správy</h2>
                </div>
                <div>
                  <p className=" justify-center w-full text-center text-eatrivo-purple font-bold h-full">
                    COMING SOON
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
