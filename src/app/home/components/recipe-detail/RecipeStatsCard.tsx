"use client";

import { Carrot, Clock, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface RecipeStatsCardProps {
  minutes: number;
  servings: number;
  ingredientCount: number;
}

export function RecipeStatsCard({
  minutes,
  servings,
  ingredientCount,
}: RecipeStatsCardProps) {
  const t = useTranslations("home");

  const stats = [
    {
      key: "time",
      icon: Clock,
      value: `${minutes} ${t("time.minutesShort")}`,
      label: t("basic.recipeDialog.statTime"),
    },
    {
      key: "servings",
      icon: Users,
      value: String(servings),
      label: t("basic.recipeDialog.statServings"),
    },
    {
      key: "ingredients",
      icon: Carrot,
      value: String(ingredientCount),
      label: t("basic.recipeDialog.statIngredients"),
    },
  ];

  return (
    <div className="grid grid-cols-3 rounded-2xl border border-gray-100 py-3">
      {stats.map((stat) => (
        <div key={stat.key} className="flex flex-col items-center gap-1">
          <stat.icon className="h-4 w-4 text-gray-400" />
          <span className="text-[15px] font-bold text-gray-900">
            {stat.value}
          </span>
          <span className="text-[12px] font-medium text-gray-500">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
