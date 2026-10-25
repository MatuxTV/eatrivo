"use client";

import { ChefHat } from "lucide-react";
import { useTranslations } from "next-intl";

import { PantryMatchBar } from "@/app/home/components/recipes";
import { countIngredientRows, type IngredientRow } from "./ingredient-rows";
import { IngredientListItem } from "./IngredientListItem";

interface IngredientListProps {
  rows: IngredientRow[];
  addedNames: Set<string>;
  onAdd?: (row: IngredientRow) => void;
}

export function IngredientList({
  rows,
  addedNames,
  onAdd,
}: IngredientListProps) {
  const t = useTranslations("home");
  const { have, total } = countIngredientRows(rows);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[20px] font-bold text-gray-900">
          {t("recipe.ingredients")}
        </h3>
        <span className="rounded-full bg-[#F6F0FF] px-2.5 py-1 text-[12px] font-bold text-eatrivo-purple">
          {t("basic.recipeDialog.haveCount", { have, total })}
        </span>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center">
          <ChefHat className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-[13px] font-bold text-gray-400">
            {t("recipe.noIngredients")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <PantryMatchBar have={have} total={total} />
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            {rows.map((row, index) => (
              <div
                key={`${row.key}-${row.available ? "available" : "missing"}-${index}`}
                className={index > 0 ? "border-t border-gray-100" : undefined}
              >
                <IngredientListItem
                  row={row}
                  added={addedNames.has(row.name)}
                  onAdd={onAdd ? () => onAdd(row) : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
