"use client";

import { ArrowLeftRight, Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import type { IngredientRow } from "./ingredient-rows";
import { cn } from "@/lib/utils/utils";

interface IngredientListItemProps {
  row: IngredientRow;
  added?: boolean;
  onAdd?: () => void;
}

const CIRCLE_CLASS =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full";

export function IngredientListItem({
  row,
  added = false,
  onAdd,
}: IngredientListItemProps) {
  const t = useTranslations("home");

  const isMissing = !row.available;
  const isAdded = isMissing && added;
  const isRed = isMissing && !added;
  const isOrange = !isMissing && row.tone === "orange";

  const amountClass = isMissing
    ? "text-[13px] font-semibold text-red-600"
    : "text-[13px] font-semibold text-gray-500";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        isRed && "bg-red-50",
        isAdded && "bg-red-50/40",
      )}
    >
      {isRed ? (
        onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            aria-label={t("basic.recipeDialog.addToShoppingList")}
            className={cn(
              CIRCLE_CLASS,
              "bg-red-600 text-white transition-[transform,background-color] duration-150 hover:bg-red-700 active:scale-90",
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
          </button>
        ) : (
          <span className={cn(CIRCLE_CLASS, "bg-red-600 text-white")}>
            <Plus className="h-4 w-4" strokeWidth={3} />
          </span>
        )
      ) : isAdded ? (
        <span className={cn(CIRCLE_CLASS, "bg-gray-200")}>
          <Check className="h-4 w-4 text-gray-500" strokeWidth={3} />
        </span>
      ) : isOrange ? (
        <span className={cn(CIRCLE_CLASS, "bg-orange-100")}>
          <ArrowLeftRight className="h-4 w-4 text-orange-700" />
        </span>
      ) : (
        <span className={cn(CIRCLE_CLASS, "bg-green-100")}>
          <Check className="h-4 w-4 text-green-700" strokeWidth={3} />
        </span>
      )}

      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "truncate text-[15px] font-semibold",
              isMissing ? "text-red-700" : "text-gray-900",
            )}
          >
            {row.name}
          </span>
          {isOrange && row.note ? (
            <span className="truncate text-[12px] font-semibold text-orange-700">
              {row.note}
            </span>
          ) : null}
          {isRed ? (
            <span className="truncate text-[12px] font-semibold text-red-500">
              {t("basic.recipeDialog.missingHint")}
            </span>
          ) : null}
          {isAdded ? (
            <span className="truncate text-[12px] font-semibold text-red-500">
              {t("basic.recipeDialog.addedHint")}
            </span>
          ) : null}
        </div>
        {row.amount ? (
          <span className={cn("shrink-0", amountClass)}>{row.amount}</span>
        ) : null}
      </div>
    </div>
  );
}
