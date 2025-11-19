"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, Star } from "lucide-react";
import { getMealTypeColor, roundNumber } from "@/lib/functions";
import RecipeDialog from "./RecipeDialog";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Ingredient } from "@/types/meal-plan";

interface ReceiptCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  difficulty: string;
  cookTime: string;
  calories: number;
  protein: number;
  carbs: number;
  meal_type: string;
  fat: number;
  ingredients?: (string | Ingredient)[];
}

export default function ReceiptCard({
  icon,
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
}: ReceiptCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card
          className="group relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white cursor-pointer h-full flex flex-col"
          onClick={() => setIsDialogOpen(true)}
        >
          {/* Top Gradient Bar based on meal type */}
          <div
            className={`h-1.5 w-full ${getMealTypeColor(meal_type)} opacity-80`}
          />

          <div className="p-5 flex flex-col h-full">
            {/* Header Section */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 h-5"
                  >
                    {meal_type}
                  </Badge>
                  <div className="flex items-center text-xs text-gray-400 font-medium">
                    <Clock className="w-3 h-3 mr-1" />
                    {cookTime}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-eatrivo-purple transition-colors">
                  {title}
                </h3>
              </div>

              {/* Icon Circle */}
              <div
                className={`
                w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                ${getMealTypeColor(meal_type)} bg-opacity-10 text-eatrivo-purple
              `}
              >
                {icon || <Star className="w-5 h-5" />}
              </div>
            </div>

            {/* Description - truncated */}
            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">
              {description}
            </p>

            {/* Nutrition Grid - Compact */}
            <div className="grid grid-cols-4 gap-2 py-3 border-t border-gray-50 mt-auto">
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">
                  Kcal
                </div>
                <div className="text-sm font-bold text-gray-700">
                  {roundNumber(calories)}
                </div>
              </div>
              <div className="text-center border-l border-gray-100">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">
                  Biel
                </div>
                <div className="text-sm font-bold text-eatrivo-green">
                  {roundNumber(protein)}g
                </div>
              </div>
              <div className="text-center border-l border-gray-100">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">
                  Sach
                </div>
                <div className="text-sm font-bold text-eatrivo-orange">
                  {roundNumber(carbs)}g
                </div>
              </div>
              <div className="text-center border-l border-gray-100">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">
                  Tuky
                </div>
                <div className="text-sm font-bold text-eatrivo-pink">
                  {roundNumber(fat)}g
                </div>
              </div>
            </div>

            {/* Hover Action Overlay (Subtle) */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-eatrivo-purple transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </div>
        </Card>
      </motion.div>

      {/* Recipe Dialog */}
      <RecipeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={title}
        description={description}
        difficulty={difficulty}
        cookTime={cookTime}
        calories={calories}
        protein={protein}
        carbs={carbs}
        fat={fat}
        meal_type={meal_type}
        ingredients={ingredients}
        icon={icon}
      />
    </>
  );
}
