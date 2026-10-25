"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/utils";

interface RecipeTagListProps {
  category: string;
  mealPrep: boolean;
  restrictions: { key: string; label: string }[];
}

const TAG_CLASS = "rounded-full px-2.5 py-1 text-[12px] font-bold";

export function RecipeTagList({
  category,
  mealPrep,
  restrictions,
}: RecipeTagListProps) {
  const t = useTranslations("home");

  return (
    <div className="flex flex-wrap gap-2">
      <span className={cn(TAG_CLASS, "bg-[#F6F0FF] text-eatrivo-purple")}>
        {category}
      </span>
      {mealPrep ? (
        <span className={cn(TAG_CLASS, "bg-gray-100 text-gray-900")}>
          {t("basic.recipeDialog.mealPrep")}
        </span>
      ) : null}
      {restrictions.map((restriction) => (
        <span
          key={restriction.key}
          className={cn(TAG_CLASS, "bg-orange-100 text-orange-700")}
        >
          {restriction.label}
        </span>
      ))}
    </div>
  );
}
