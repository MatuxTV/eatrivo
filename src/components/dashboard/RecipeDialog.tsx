"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Star,
  ChefHat,
  Flame,
  Droplet,
  Wheat,
  Beef,
} from "lucide-react";
import { getMealTypeColor, roundNumber } from "@/lib/functions";

interface Ingredient {
  name: string;
  amount: string;
  type?: string;
}

interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  difficulty: string;
  cookTime: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: string;
  ingredients?: (string | Ingredient)[];
  icon?: React.ReactNode;
}

export default function RecipeDialog({
  open,
  onOpenChange,
  title,
  description,
  difficulty,
  cookTime,
  calories,
  protein,
  carbs,
  fat,
  meal_type,
  ingredients,
  icon,
}: RecipeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-0 gap-0 border-none shadow-2xl rounded-3xl">
        {/* Header Section with Gradient Background */}
        <div
          className={`relative p-6 sm:p-8 ${getMealTypeColor(
            meal_type
          )} bg-opacity-10 overflow-hidden`}
        >
          {/* Background Pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          ></div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
            {/* Icon Box */}
            <div
              className={`
              w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0
              bg-white shadow-lg text-eatrivo-purple
            `}
            >
              {icon || <Star className="w-8 h-8 sm:w-10 sm:h-10" />}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge
                  variant="secondary"
                  className="bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white/80"
                >
                  <Star className="w-3 h-3 mr-1 text-yellow-500" />
                  {difficulty}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white/80"
                >
                  <Clock className="w-3 h-3 mr-1 text-blue-500" />
                  {cookTime}
                </Badge>
              </div>

              <DialogTitle className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {title}
              </DialogTitle>

              <DialogDescription className="text-gray-600 text-base leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Nutrition Grid */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              Nutričné hodnoty
              <div className="h-px flex-1 bg-gray-100"></div>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-eatrivo-purple/10 flex items-center justify-center mb-2 text-eatrivo-purple">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {roundNumber(calories)}
                </span>
                <span className="text-xs font-medium text-gray-500 uppercase">
                  Kcal
                </span>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-eatrivo-green/10 flex items-center justify-center mb-2 text-eatrivo-green">
                  <Beef className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {roundNumber(protein)}g
                </span>
                <span className="text-xs font-medium text-gray-500 uppercase">
                  Proteíny
                </span>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-eatrivo-orange/10 flex items-center justify-center mb-2 text-eatrivo-orange">
                  <Wheat className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {roundNumber(carbs)}g
                </span>
                <span className="text-xs font-medium text-gray-500 uppercase">
                  Sacharidy
                </span>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-eatrivo-pink/10 flex items-center justify-center mb-2 text-eatrivo-pink">
                  <Droplet className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  {roundNumber(fat)}g
                </span>
                <span className="text-xs font-medium text-gray-500 uppercase">
                  Tuky
                </span>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              Ingrediencie
              <div className="h-px flex-1 bg-gray-100"></div>
            </h3>

            {ingredients && ingredients.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {ingredients.map((ingredient, index) => {
                  const isObject =
                    typeof ingredient === "object" && ingredient !== null;
                  const name = isObject ? ingredient.name : ingredient;
                  const amount = isObject ? ingredient.amount : "";

                  return (
                    <div
                      key={index}
                      className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                    >
                      <div className="w-2 h-2 rounded-full bg-eatrivo-purple mr-3 flex-shrink-0" />
                      <span className="text-gray-700 font-medium flex-1">
                        {name}
                      </span>
                      {amount && (
                        <span className="text-sm text-gray-400 font-medium ml-2">
                          {amount}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <ChefHat className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">
                  Zoznam ingrediencií nie je k dispozícii
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
