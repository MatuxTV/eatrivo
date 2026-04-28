"use client";

import { roundNumber } from "@/lib/utils/functions";
import { Flame, Beef, Wheat, Droplet } from "lucide-react";
import { useTranslations } from "next-intl";

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface DailyNutritionSummaryProps {
  data: NutritionData | null;
}

export default function DailyNutritionSummary({ data }: DailyNutritionSummaryProps) {
  const t = useTranslations("home");

  const items = [
    {
      label: t("nutrition.calories"),
      value: data?.calories,
      unit: "kcal",
      color: "text-eatrivo-purple",
      bg: "bg-eatrivo-purple/10",
      border: "border-eatrivo-purple/20",
      icon: Flame,
    },
    {
      label: t("nutrition.protein"),
      value: data?.protein,
      unit: "g",
      color: "text-eatrivo-green",
      bg: "bg-eatrivo-green/10",
      border: "border-eatrivo-green/20",
      icon: Beef,
    },
    {
      label: t("nutrition.carbs"),
      value: data?.carbs,
      unit: "g",
      color: "text-eatrivo-orange",
      bg: "bg-eatrivo-orange/10",
      border: "border-eatrivo-orange/20",
      icon: Wheat,
    },
    {
      label: t("nutrition.fats"),
      value: data?.fats,
      unit: "g",
      color: "text-eatrivo-pink",
      bg: "bg-eatrivo-pink/10",
      border: "border-eatrivo-pink/20",
      icon: Droplet,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 md:flex md:gap-3 w-full">
      {items.map((item, index) => (
        <div 
          key={index}
          className="bg-white rounded-2xl border border-gray-100 p-2 md:p-3 shadow-sm flex flex-col items-center justify-center group hover:border-gray-200 transition-colors"
        >
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${item.bg} flex items-center justify-center mb-1 md:mb-2 group-hover:scale-110 transition-transform duration-300`}>
            <item.icon className={`w-4 h-4 md:w-5 md:h-5 ${item.color}`} />
          </div>
          <div className={`text-sm md:text-lg font-bold ${item.color}`}>
            {item.value ? roundNumber(item.value) : "—"}
            <span className="text-[10px] md:text-xs font-medium text-gray-400 ml-0.5 md:inline">{item.unit}</span>
          </div>
          <span className="text-[8px] md:text-[10px] uppercase tracking-wider font-semibold text-gray-400 mt-0.5 md:mt-1">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
