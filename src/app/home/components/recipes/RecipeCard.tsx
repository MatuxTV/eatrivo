"use client";

import { useTranslations } from "next-intl";
import type { KeyboardEvent } from "react";

import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import { getPantryMatch } from "@/lib/recipes/pantry-match";
import { cn } from "@/lib/utils/utils";

import { BookmarkButton } from "./BookmarkButton";
import { MissingIngredientsLine } from "./MissingIngredientsLine";
import { PantryMatchBar } from "./PantryMatchBar";
import { RecipeImage } from "./RecipeImage";

interface RecipeCardProps {
  recipe: BasicHomeRecipePreview;
  onOpen: () => void;
  bookmarked?: boolean;
  bookmarkPending?: boolean;
  onToggleBookmark?: () => void;
}

/**
 * Recept tab card (Figma variant 4D): emoji/photo artwork, title, protein +
 * time row and the pantry coverage indicator with the missing ingredients.
 */
export function RecipeCard({
  recipe,
  onOpen,
  bookmarked = false,
  bookmarkPending,
  onToggleBookmark,
}: RecipeCardProps) {
  const t = useTranslations("home");
  const match = getPantryMatch(recipe);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white text-left transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/30",
      )}
    >
      <RecipeImage
        categoryKey={recipe.categoryKey}
        src={recipe.imageThumbUrl ?? recipe.imageUrl}
        loading={recipe.imagePending}
        alt={recipe.title}
        className="h-28 w-full"
      >
        {onToggleBookmark ? (
          <BookmarkButton
            className="absolute right-2 top-2"
            active={bookmarked}
            pending={bookmarkPending}
            onToggle={onToggleBookmark}
          />
        ) : null}
      </RecipeImage>

      <div className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-2.5">
        <h3 className="line-clamp-2 min-h-10 text-[15px] font-semibold leading-5 tracking-[-0.01em] text-gray-900">
          {recipe.title}
        </h3>

        <div className="flex items-baseline justify-between">
          <span className="flex items-baseline gap-1">
            <span className="text-[16px] font-bold leading-5 tracking-[-0.01em] text-gray-900">
              {`${recipe.proteinG} g`}
            </span>
            <span className="text-[12px] font-medium text-gray-500">
              {t("basic.recipeCard.proteinShort")}
            </span>
          </span>
          <span className="text-[12px] font-semibold text-gray-500">
            {`${recipe.totalTimeMin} ${t("time.minutesShort")}`}
          </span>
        </div>

        {match ? (
          <PantryMatchBar
            have={match.have}
            total={match.total}
            className="mt-0.5"
          />
        ) : null}

        {match ? <MissingIngredientsLine missing={match.missing} /> : null}
      </div>
    </div>
  );
}
