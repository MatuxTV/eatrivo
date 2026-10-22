"use client";

import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/utils";

interface BookmarkButtonProps {
  active: boolean;
  pending?: boolean;
  onToggle: () => void;
  className?: string;
}

/** Round floating bookmark toggle used on top of a recipe image. */
export function BookmarkButton({
  active,
  pending,
  onToggle,
  className,
}: BookmarkButtonProps) {
  const t = useTranslations("home");

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={t(
        active ? "basic.recipeCard.unbookmark" : "basic.recipeCard.bookmark",
      )}
      disabled={pending}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onToggle();
      }}
      className={cn(
        "flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(17,24,39,0.12)] transition-transform active:scale-90 disabled:opacity-60",
        className,
      )}
    >
      <Bookmark
        className={cn(
          "h-3.5 w-3.5",
          active ? "fill-eatrivo-purple text-eatrivo-purple" : "text-gray-900",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
