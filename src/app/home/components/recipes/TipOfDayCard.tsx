"use client";

import { useTranslations } from "next-intl";

import type { BasicHomeRecipePreview } from "@/app/home/types/data";

import { MacroPill } from "./MacroPill";
import { RecipeImage } from "./RecipeImage";
import { RecipeMeta } from "./RecipeMeta";

type TipRecipe = Pick<
  BasicHomeRecipePreview,
  | "title"
  | "totalTimeMin"
  | "calories"
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "category"
  | "mealPrepFriendly"
> & { categoryKey?: string | null; imageUrl?: string | null };

interface TipOfDayCardProps {
  recipe: TipRecipe;
  onOpen: () => void;
  badge?: string;
}

/** Large featured recipe card used for the "tip of the day" / custom result. */
export function TipOfDayCard({ recipe, onOpen, badge }: TipOfDayCardProps) {
  const t = useTranslations("home");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full overflow-hidden rounded-2xl border border-gray-100 bg-white text-left transition-transform duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/30"
    >
      <RecipeImage
        categoryKey={recipe.categoryKey}
        src={recipe.imageUrl}
        alt={recipe.title}
        className="h-[172px] w-full"
        emojiClassName="text-[64px]"
      >
        <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-eatrivo-purple shadow-[0_1px_4px_rgba(17,24,39,0.10)]">
          {badge ?? t("basic.recipeCard.tipBadge")}
        </span>
      </RecipeImage>

      <div className="flex flex-col gap-2 px-4 pb-4 pt-3.5">
        <h2 className="line-clamp-2 text-[18px] font-bold leading-6 tracking-[-0.015em] text-gray-900">
          {recipe.title}
        </h2>

        <RecipeMeta
          minutes={recipe.totalTimeMin}
          calories={recipe.calories}
          label={
            recipe.mealPrepFriendly
              ? t("basic.hero.mealPrep")
              : recipe.category
          }
        />

        <div className="flex flex-wrap gap-1.5">
          <MacroPill
            highlight
            value={`${recipe.proteinG} g`}
            label={t("nutrition.protein").toLowerCase()}
          />
          <MacroPill
            value={`${recipe.carbsG} g`}
            label={t("nutrition.carbs").toLowerCase()}
          />
          <MacroPill
            value={`${recipe.fatG} g`}
            label={t("nutrition.fats").toLowerCase()}
          />
        </div>
      </div>
    </button>
  );
}
