import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  ReceiptText,
  UtensilsCrossed,
  MessageCircle,
  Target,
  Mail,
  ChefHat,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ReceiptCard from "@/components/dashboard/ReceiptCard";

export default async function DashboardPage() {
  const session = await auth();

  console.log("DashboardPage session:", session?.user);

  if (!session?.user) {
    redirect("/signin");
  }

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
      <div className=" w-1/6 min-h-screen bg-secondary-foreground drop-shadow-lg">
        {/* Profile card */}
        <div className=" p-4 flex">
          <Image
            src={session?.user?.image || "/default-avatar.png"}
            alt={session?.user?.name || "User"}
            width={50}
            height={50}
            className="rounded-full border-2 border-primary"
          />
          <div className=" ml-4">
            <h2 className="text-xl font-bold text-primary-text mt-2">
              {session?.user?.name}
            </h2>
            <p className=" text-eatrivo-green">Členstvo: {session?.user?.membership || "Základné"}</p>
          </div>
        </div>
        <div className=" p-4 flex flex-col gap-2 font-semibold text-primary-text">
          <Link className="flex items-center font-semibold" href="/dashboard">
            <ReceiptText className="mr-4 flex justify-center" />
            Dashboard
          </Link>
          <Link className="flex items-center font-semibold" href="/profile">
            <UtensilsCrossed className="mr-4 flex justify-center" />
            Profile
          </Link>
          <Link className="flex items-center font-semibold" href="/settings">
            <MessageCircle className="mr-4 flex justify-center" />
            Settings
          </Link>
        </div>
      </div>
      {/* Main content */}
      <div className="w-5/6 p-6">
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

          {/* Right Section */}
          <div className="space-y-6">
            {/* Goals Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <Target className="mr-3 text-eatrivo-purple" size={20} />
                <h2 className="text-lg font-bold text-gray-800">
                  Ciele na tento týždeň
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-3 w-4 h-4 text-eatrivo-purple"
                  />
                  <span className="text-sm text-gray-700">
                    Každý deň zjesť 100g bielkovín
                  </span>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-3 w-4 h-4 text-eatrivo-purple"
                  />
                  <span className="text-sm text-gray-700">
                    Vypiť 3l vody každý deň
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <Mail className="mr-3 text-eatrivo-purple" size={20} />
                <h2 className="text-lg font-bold text-gray-800">Správy</h2>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border-b border-gray-100 pb-3 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <Image
                        src={`https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&auto=format`}
                        alt="Tréner Matúš"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">
                            Tréner Matúš
                          </span>
                          <span className="text-xs text-gray-500">
                            pred 2 hodinami
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          Ahoj, dnes sa pokús obmedzif tuky a zameraj sa skôr na
                          kardio
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
