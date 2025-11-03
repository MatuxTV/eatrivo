"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, ChefHat } from "lucide-react";
import { getMealTypeColor } from "@/lib/functions";

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
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto bg-primary-foreground p-4 sm:p-6 mx-auto">
        <DialogHeader>
          {/* Header with Icon and Title */}
          <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
            {/* Meal Type Icon */}
            <div
              className={`w-12 h-12 sm:w-16 sm:h-16 ${getMealTypeColor(
                meal_type
              )} rounded-xl sm:rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-lg bg-gradient-to-br from-white/30 to-white/0 relative`}
              aria-label={meal_type}
              role="img"
            >
              <span
                className="absolute inset-0 rounded-xl sm:rounded-2xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 60% 40%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.01) 80%)",
                }}
              />
              {icon || (
                <Star className="w-6 h-6 sm:w-9 sm:h-9 text-white drop-shadow-lg" />
              )}
              <span className="block text-[10px] sm:text-xs font-medium text-white/90 mt-0.5 sm:mt-1 text-center capitalize drop-shadow-sm">
                {meal_type}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 leading-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-sm sm:text-base line-clamp-3 sm:line-clamp-none">
                {description}
              </DialogDescription>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            <Badge
              variant="outline"
              className="text-gray-600 border-gray-300 bg-gray-50 text-xs sm:text-sm"
            >
              <Star className="w-3 h-3 mr-1" />
              {difficulty}
            </Badge>
            <Badge
              variant="outline"
              className="text-gray-600 border-gray-300 bg-gray-50 text-xs sm:text-sm"
            >
              <Clock className="w-3 h-3 mr-1" />
              {cookTime}
            </Badge>
          </div>
        </DialogHeader>

        {/* Nutrition Info Section */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
            <span className="text-eatrivo-purple text-lg sm:text-xl">📊</span>
            Nutričné hodnoty
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-gray-600 text-xs sm:text-sm">Kalórie:</span>
              <span className="font-semibold text-gray-900 text-sm sm:text-lg">
                {calories} kcal
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-gray-600 text-xs sm:text-sm">Proteíny:</span>
              <span className="font-semibold text-gray-900 text-sm sm:text-lg">
                {protein}g
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-gray-600 text-xs sm:text-sm">Sacharidy:</span>
              <span className="font-semibold text-gray-900 text-sm sm:text-lg">
                {carbs}g
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-gray-600 text-xs sm:text-sm">Tuky:</span>
              <span className="font-semibold text-gray-900 text-sm sm:text-lg">
                {fat}g
              </span>
            </div>
          </div>
        </div>

        {/* Ingredients Section */}
        {ingredients && ingredients.length > 0 && (
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
              <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-eatrivo-purple" />
              Ingrediencie
            </h3>
            <ul className="space-y-2 bg-gray-50 p-3 sm:p-4 rounded-lg">
              {ingredients.map((ingredient, index) => {
                // Handle both object and string formats
                const isObject = typeof ingredient === 'object' && ingredient !== null;
                const displayText = isObject 
                  ? `${ingredient.name} - ${ingredient.amount}`
                  : ingredient;
                
                return (
                  <li
                    key={index}
                    className="flex items-start gap-2 sm:gap-3 text-gray-700 text-sm sm:text-base"
                  >
                    <span className="text-eatrivo-purple font-bold mt-0.5 sm:mt-1 text-sm sm:text-base">•</span>
                    <span className="flex-1 leading-relaxed">{displayText}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Empty State for Ingredients */}
        {(!ingredients || ingredients.length === 0) && (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <ChefHat className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-300" />
            <p className="text-sm sm:text-base">Zoznam ingrediencií zatiaľ nie je k dispozícii.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
