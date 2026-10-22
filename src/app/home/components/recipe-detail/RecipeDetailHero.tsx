"use client";

import { Bookmark, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { RecipeImage } from "@/app/home/components/recipes";
import { cn } from "@/lib/utils/utils";

interface RecipeDetailHeroProps {
  categoryKey: string;
  imageUrl?: string | null;
  imageAlt?: string;
  counterLabel: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  bookmarked: boolean;
  bookmarkPending: boolean;
  onToggleBookmark: () => void;
}

const CIRCLE_CLASS =
  "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(17,24,39,0.12)] transition-[transform,background-color] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2";

const NAV_BUTTON_CLASS =
  "flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FAFAFA] text-gray-700 transition-[transform,background-color] duration-150 active:scale-95 disabled:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2";

export function RecipeDetailHero({
  categoryKey,
  imageUrl,
  imageAlt,
  counterLabel,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  bookmarked,
  bookmarkPending,
  onToggleBookmark,
}: RecipeDetailHeroProps) {
  const t = useTranslations("home");

  return (
    <RecipeImage
      categoryKey={categoryKey}
      src={imageUrl}
      alt={imageAlt}
      className="h-[230px] w-full"
      emojiClassName="text-[72px]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("basic.recipeDialog.close")}
        className={cn(CIRCLE_CLASS, "absolute right-4 top-3.5 text-gray-700")}
      >
        <X className="h-[18px] w-[18px]" />
      </button>

      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white p-1 shadow-[0_2px_8px_rgba(17,24,39,0.12)]">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label={t("basic.recipeDialog.previous")}
          className={NAV_BUTTON_CLASS}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-1.5 text-[13px] font-bold text-gray-900">
          {counterLabel}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label={t("basic.recipeDialog.next")}
          className={NAV_BUTTON_CLASS}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleBookmark}
        disabled={bookmarkPending}
        aria-label={
          bookmarked
            ? t("basic.recipeDialog.removeBookmark")
            : t("basic.recipeDialog.saveRecipe")
        }
        title={
          bookmarked
            ? t("basic.recipeDialog.removeBookmark")
            : t("basic.recipeDialog.saveRecipe")
        }
        className={cn(
          CIRCLE_CLASS,
          "absolute left-4 top-3.5 disabled:cursor-wait disabled:opacity-70",
          bookmarked ? "text-eatrivo-purple" : "text-gray-700",
        )}
      >
        {bookmarkPending ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : (
          <Bookmark
            className={cn(
              "h-[18px] w-[18px]",
              bookmarked && "fill-eatrivo-purple",
            )}
          />
        )}
      </button>
    </RecipeImage>
  );
}
