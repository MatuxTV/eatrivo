"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { KeyboardEvent } from "react";

import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import { cn } from "@/lib/utils/utils";

import { BookmarkButton } from "./BookmarkButton";
import { RecipeImage } from "./RecipeImage";

interface CookNowCardProps {
  recipe: BasicHomeRecipePreview;
  onOpen: () => void;
  bookmarked?: boolean;
  bookmarkPending?: boolean;
  onToggleBookmark?: () => void;
  className?: string;
}

/**
 * Horizontal "cook now" card (Tip dňa V2 style): square artwork on the left,
 * "have all" pill, title, time/kcal meta and the protein highlight on the right.
 */
export function CookNowCard({
  recipe,
  onOpen,
  bookmarked = false,
  bookmarkPending,
  onToggleBookmark,
  className,
}: CookNowCardProps) {
  const t = useTranslations("home");

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
        "flex items-center gap-3.5 rounded-[18px] border border-gray-100 bg-white p-3 text-left cursor-pointer transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/30",
        className,
      )}
    >
      <RecipeImage
        categoryKey={recipe.categoryKey}
        src={recipe.imageThumbUrl ?? recipe.imageUrl}
        alt={recipe.title}
        className="h-[124px] w-[124px] shrink-0 rounded-2xl"
        emojiClassName="text-[52px]"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[12px] font-bold leading-none text-green-700">
            <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
            {t("basic.recipeCard.haveAll")}
          </span>
          {onToggleBookmark ? (
            <BookmarkButton
              className="h-7 w-7 bg-transparent shadow-none"
              active={bookmarked}
              pending={bookmarkPending}
              onToggle={onToggleBookmark}
            />
          ) : null}
        </div>

        <h3 className="line-clamp-2 text-[17px] font-bold leading-[22px] tracking-[-0.01em] text-gray-900">
          {recipe.title}
        </h3>

        <p className="text-[13px] font-semibold text-gray-500">
          {`${recipe.totalTimeMin} ${t("time.minutesShort")} · ${recipe.calories} kcal`}
        </p>

        <div className="flex items-baseline gap-1">
          <span className="text-[20px] font-bold leading-6 text-eatrivo-purple">
            {`${recipe.proteinG} g`}
          </span>
          <span className="text-[13px] font-medium text-gray-500">
            {t("basic.cookNow.proteinLong")}
          </span>
        </div>
      </div>
    </div>
  );
}
