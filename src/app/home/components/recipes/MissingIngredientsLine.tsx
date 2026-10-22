"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { splitMissing } from "@/lib/recipes/pantry-match";
import { cn } from "@/lib/utils/utils";

interface MissingIngredientsLineProps {
  missing: string[];
  className?: string;
}

/** Shows either "you have everything" or the first couple of missing items. */
export function MissingIngredientsLine({
  missing,
  className,
}: MissingIngredientsLineProps) {
  const t = useTranslations("home");

  if (missing.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 text-[12px] font-bold leading-4 text-green-700",
          className,
        )}
      >
        <Check className="h-3.5 w-3.5 stroke-[2.6]" aria-hidden="true" />
        {t("basic.recipeCard.haveAll")}
      </div>
    );
  }

  const { shown, rest } = splitMissing(missing, 2);

  return (
    <p
      className={cn(
        "line-clamp-2 text-[12px] font-semibold leading-4 text-orange-700",
        className,
      )}
    >
      {t("basic.recipeCard.missing", { items: shown.join(", ") })}
      {rest ? ` ${t("basic.recipeCard.more", { count: rest })}` : ""}
    </p>
  );
}
