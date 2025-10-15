"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ReceiptText,
  UtensilsCrossed,
  MessageCircle,
  Target,
  Mail,
  ChefHat,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ReceiptCard from "@/components/dashboard/ReceiptCard";
import ShoppingListCard from "@/components/dashboard/ShoppingListCard";
import { toast } from "sonner";
import type { Session } from "next-auth";
import { EatrivoAIService } from "@/lib/langchain";

interface ShoppingList {
  id: string;
  title: string;
  description?: string;
  weekStartDate: string;
  weekEndDate: string;
  status: 'active' | 'completed' | 'cancelled';
  cloudinaryPublicId: string;
  createdAt: string;
}

interface DashboardPageProps {
  session: Session;
}

export default function DashboardPage({ session }: DashboardPageProps) {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoadingShoppingLists, setIsLoadingShoppingLists] = useState(true);
  const [mealPlanData, setMealPlanData] = useState<any[]>([]);
  const [isLoadingMealPlan, setIsLoadingMealPlan] = useState(false);


  useEffect(() => {
    const fetchShoppingLists = async () => {
      if (!session?.user) return;
      
      try {
        setIsLoadingShoppingLists(true);
        const response = await fetch('/api/shopping-lists');
        
        if (!response.ok) {
          throw new Error('Failed to fetch shopping lists');
        }
        
        const data = await response.json();
        setShoppingLists(data.shoppingLists || []);
      } catch (error) {
        console.error('Error fetching shopping lists:', error);
        toast.error('Nepodarilo sa načítať jedálne plány');
        setShoppingLists([]);
      } finally {
        setIsLoadingShoppingLists(false);
      }
    };
    fetchShoppingLists();
  }, [session]);

  useEffect(() => {
  const fetchMealPlan = async () => {
    if (!session?.user) return;

    try {
      setIsLoadingMealPlan(true); // Pridaj state pre loading
      
      const response = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate meal plan');
      }

      const data = await response.json();
      console.log('Generated meal plan:', data.insights);
      
      // Ulož meal plan do state
      setMealPlanData(data.insights);
      
    } catch (error) {
      console.error('Error generating meal plan:', error);
      toast.error('Nepodarilo sa vygenerovať jedálny plán');
    } finally {
      setIsLoadingMealPlan(false);
    }
  };

  fetchMealPlan();
}, [session]);
  
  const mealPlan = [
    {
      id: 1,
      time: "Raňajky",
      timeSlot: "07:00 - 09:00",
      meal: "Ovocná miska s gréckym jogurtom",
      description: "Čerstvé bobule s granolou a medom",
      image:
        "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=300&h=200&fit=crop&auto=format",
      calories: 320,
      protein: 15,
      carbs: 45,
      fat: 12,
      difficulty: "Jednoduché",
      cookTime: "5 min",
      type: "breakfast",
    },
    {
      id: 2,
      time: "Obed",
      timeSlot: "12:00 - 14:00",
      meal: "Grilované kuracie prsia so zeleninou",
      description: "S pečenou sladkou zemiakmi a brokolicou",
      image:
        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=200&fit=crop&auto=format",
      calories: 480,
      protein: 42,
      carbs: 35,
      fat: 18,
      difficulty: "Stredne",
      cookTime: "25 min",
      type: "lunch",
    },
    {
      id: 3,
      time: "Večera",
      timeSlot: "18:00 - 20:00",
      meal: "Lososový steak s quinoa šalátom",
      description: "S avokádom, cherry paradajkami a limetou",
      image:
        "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&h=200&fit=crop&auto=format",
      calories: 420,
      protein: 35,
      carbs: 28,
      fat: 22,
      difficulty: "Stredne",
      cookTime: "20 min",
      type: "dinner",
    },
  ];

  return (


    <div className="min-h-screen flex w-full bg-primary-foreground">
      {/* Profile section */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-100 flex flex-col">
        {/* Profile card */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center mb-4">
            <Image
              src={session?.user?.image || "/default-avatar.png"}
              alt={session?.user?.name || "User"}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div className="ml-3">
              <h2 className="text-sm font-semibold text-gray-900">
                {session?.user?.name}
              </h2>
              <p className="text-xs text-gray-500">Premium účet</p>
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
          <p className="text-gray-600 mb-8">Tu je váš denný plán a prehľad.</p>
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
                    <div className="w-12 h-12 rounded-xl bg-eatrivo-purple/10 border-2 border-eatrivo-purple flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-sm font-bold text-eatrivo-purple">
                          2400
                        </div>
                        <div className="text-xs text-eatrivo-purple">kcal</div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 mt-1">
                      Denné kalórie
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-eatrivo-green/10 border-2 border-eatrivo-green flex items-center justify-center">
                      <div className="text-sm font-bold text-eatrivo-green">
                        92g
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 mt-1">
                      Bielkoviny
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-eatrivo-orange/10 border-2 border-eatrivo-orange flex items-center justify-center">
                      <div className="text-sm font-bold text-eatrivo-orange">
                        108g
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 mt-1">
                      Sacharidy
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-eatrivo-pink/10 border-2 border-eatrivo-pink flex items-center justify-center">
                      <div className="text-sm font-bold text-eatrivo-pink">
                        52g
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 mt-1">Tuky</span>
                  </div>
                </div>
              </div>
              {/* Meal Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mealPlan.map((meal) => (
                  <ReceiptCard
                    key={meal.id}
                    icon={<ChefHat className="w-6 h-6 text-white" />}
                    title={meal.meal}
                    type={meal.type}
                    description={meal.description}
                    difficulty={meal.difficulty}
                    cookTime={meal.cookTime}
                    calories={meal.calories}
                    protein={meal.protein}
                    carbs={meal.carbs}
                    fat={meal.fat}
                  />
                ))}
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
           <div className=" justify-center w-full h-full text-center text-black font-bold">COMING SOON</div>
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
                    {shoppingLists.length} {shoppingLists.length === 1 ? 'zoznam' : shoppingLists.length < 5 ? 'zoznamy' : 'zoznamov'}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingShoppingLists ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Žiadne jedálne plány</h3>
                    <p className="text-gray-500 mb-6">Zatiaľ nemáte žiadne jedálne plány. Požiadajte svojho trénera o vytvorenie personalizovaného plánu.</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Tip:</strong> Jedálne plány vám pomôžu dosiahnuť vaše fitnes ciele efektívnejšie!
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
                <p className=" justify-center w-full text-center text-black font-bold h-full">COMING SOON</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
