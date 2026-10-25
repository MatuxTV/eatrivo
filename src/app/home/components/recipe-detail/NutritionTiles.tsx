"use client";

import { Beef, Droplet, Flame, Wheat } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/utils";

interface NutritionTilesProps {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function NutritionTiles({
  calories,
  proteinG,
  carbsG,
  fatG,
}: NutritionTilesProps) {
  const t = useTranslations("home");

  const tiles = [
    {
      key: "calories",
      icon: Flame,
      value: String(calories),
      unit: "kcal",
      label: t("nutrition.calories"),
      color: "text-orange-500",
      bg: "bg-[#FFF4E8]",
    },
    {
      key: "protein",
      icon: Beef,
      value: String(proteinG),
      unit: "g",
      label: t("nutrition.protein"),
      color: "text-eatrivo-purple",
      bg: "bg-[#F6F0FF]",
    },
    {
      key: "carbs",
      icon: Wheat,
      value: String(carbsG),
      unit: "g",
      label: t("nutrition.carbs"),
      color: "text-amber-600",
      bg: "bg-[#FEF7E0]",
    },
    {
      key: "fats",
      icon: Droplet,
      value: String(fatG),
      unit: "g",
      label: t("nutrition.fats"),
      color: "text-pink-600",
      bg: "bg-[#FDF0F6]",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[20px] font-bold text-gray-900">
          {t("basic.recipeDialog.nutritionTitle")}
        </h3>
        <span className="text-[13px] font-semibold text-gray-500">
          {t("basic.recipeDialog.perServing")}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl px-1.5 py-3",
              tile.bg,
            )}
          >
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white">
              <tile.icon className={cn("h-4 w-4", tile.color)} />
            </div>
            <span className="text-[18px] font-bold leading-none text-gray-900">
              {tile.value}
              <span className="text-[12px] font-semibold text-gray-500">
                {tile.unit}
              </span>
            </span>
            <span className={cn("text-[12px] font-semibold", tile.color)}>
              {tile.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
