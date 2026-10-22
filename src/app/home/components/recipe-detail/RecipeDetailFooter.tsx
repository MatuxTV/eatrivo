"use client";

import { ChefHat, Loader2, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface RecipeDetailFooterProps {
  missingToAdd: number;
  onAddMissing?: () => void;
  addingMissing?: boolean;
  onCook: () => void;
  cookDisabled?: boolean;
}

export function RecipeDetailFooter({
  missingToAdd,
  onAddMissing,
  addingMissing = false,
  onCook,
  cookDisabled = false,
}: RecipeDetailFooterProps) {
  const t = useTranslations("home");
  const showAddMissing = missingToAdd > 0 && Boolean(onAddMissing);

  return (
    <div className="sticky bottom-0 flex gap-2.5 border-t border-gray-100 bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {showAddMissing ? (
        <Button
          type="button"
          variant="brandOutline"
          onClick={onAddMissing}
          disabled={addingMissing}
          className="h-12 flex-1 rounded-2xl"
        >
          {addingMissing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}
          {t("basic.recipeDialog.addMissing", { count: missingToAdd })}
        </Button>
      ) : null}

      <Button
        type="button"
        variant="brand"
        onClick={onCook}
        disabled={cookDisabled}
        className="h-12 flex-1 rounded-2xl"
      >
        <ChefHat className="h-4 w-4" />
        {showAddMissing
          ? t("basic.recipeDialog.cookShort")
          : t("basic.recipeDialog.cookThisRecipe")}
      </Button>
    </div>
  );
}
