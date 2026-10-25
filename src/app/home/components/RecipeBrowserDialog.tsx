"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import {
  IngredientList,
  NutritionTiles,
  RecipeDetailFooter,
  RecipeDetailHero,
  RecipeStatsCard,
  RecipeTagList,
  buildIngredientRows,
  type IngredientRow,
} from "@/app/home/components/recipe-detail";

const RESTRICTION_FLAG_TRANSLATION_KEYS: Record<string, string> = {
  "contains-dairy": "basic.restrictionFlags.contains-dairy",
  "contains-eggs": "basic.restrictionFlags.contains-eggs",
  "contains-fish": "basic.restrictionFlags.contains-fish",
  "contains-gluten": "basic.restrictionFlags.contains-gluten",
  "contains-nuts": "basic.restrictionFlags.contains-nuts",
  "contains-peanuts": "basic.restrictionFlags.contains-peanuts",
  "contains-shellfish": "basic.restrictionFlags.contains-shellfish",
  "contains-soy": "basic.restrictionFlags.contains-soy",
};

/* ────────────────────────────────────────────── */
/*  Props                                         */
/* ────────────────────────────────────────────── */

interface RecipeBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: BasicHomeRecipePreview[];
  initialIndex?: number;
  bookmarkRecipeId?: string | null;
  /** Initial bookmark state supplied by the page; unknown → false. */
  isRecipeBookmarked?: (recipeId: string) => boolean;
  /** Called after a successful toggle so the page can update its own state. */
  onBookmarkChange?: (recipeId: string, bookmarked: boolean) => void;
  /** Persisted id for a recipe; null = not persisted yet (onEnsureBookmarkRecipeId will create it). Default: recipe.id */
  getBookmarkRecipeId?: (recipe: BasicHomeRecipePreview) => string | null;
  /** Now receives the recipe being bookmarked. */
  onEnsureBookmarkRecipeId?: (recipe: BasicHomeRecipePreview) => Promise<string>;
  onAddToShoppingList?: (
    ingredientName: string,
    quantity: string | null,
    category: string | null,
  ) => Promise<void>;
  onCookRecipe?: (recipe: BasicHomeRecipePreview) => void;
}

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

export default function RecipeBrowserDialog({
  open,
  onOpenChange,
  recipes,
  initialIndex = 0,
  bookmarkRecipeId,
  isRecipeBookmarked,
  onBookmarkChange,
  getBookmarkRecipeId,
  onEnsureBookmarkRecipeId,
  onAddToShoppingList,
  onCookRecipe,
}: RecipeBrowserDialogProps) {
  const t = useTranslations("home");
  const shouldReduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0); // -1 left, 1 right
  const [selectedMissingIngredients, setSelectedMissingIngredients] = useState<Set<string>>(
    new Set(),
  );
  const [bookmarkOverrides, setBookmarkOverrides] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  const [isBookmarkPending, setIsBookmarkPending] = useState(false);
  const [isAddingMissing, setIsAddingMissing] = useState(false);

  // Sync when dialog opens with a different initialIndex
  useEffect(() => {
    if (open) setCurrentIndex(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) {
      setSelectedMissingIngredients(new Set());
      setBookmarkOverrides(new Map());
      setIsBookmarkPending(false);
      setIsAddingMissing(false);
    }
  }, [open]);

  const recipe = recipes[currentIndex] ?? null;
  const bookmarkId =
    bookmarkRecipeId !== undefined
      ? bookmarkRecipeId
      : getBookmarkRecipeId && recipe
        ? getBookmarkRecipeId(recipe)
        : recipe?.id ?? null;
  const bookmarkKey = bookmarkId ?? recipe?.id ?? null;
  const isBookmarked =
    (bookmarkKey !== null ? bookmarkOverrides.get(bookmarkKey) : undefined) ??
    (bookmarkId ? isRecipeBookmarked?.(bookmarkId) : undefined) ??
    false;
  const hasNext = currentIndex < recipes.length - 1;
  const hasPrev = currentIndex > 0;

  const rows = useMemo(() => {
    if (!recipe) {
      return [];
    }

    return buildIngredientRows(recipe, {
      stapleAvailable: t("basic.recipeDialog.stapleAvailable"),
      haveAmountInline: (amount) =>
        t("basic.recipeDialog.haveAmountInline", { amount }),
      fallbackUsing: (ingredient) =>
        t("basic.recipeDialog.fallbackUsing", { ingredient }),
    });
  }, [recipe, t]);

  const missingToAdd = useMemo(
    () =>
      rows.filter(
        (row) => !row.available && !selectedMissingIngredients.has(row.name),
      ).length,
    [rows, selectedMissingIngredients],
  );

  const goNext = useCallback(() => {
    if (!hasNext) return;
    setDirection(1);
    setCurrentIndex((i) => i + 1);
  }, [hasNext]);

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    setDirection(-1);
    setCurrentIndex((i) => i - 1);
  }, [hasPrev]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goNext, goPrev, onOpenChange]);

  const handleSelectMissingIngredient = useCallback(
    async (name: string, quantity: string | null, category: string | null) => {
      if (!onAddToShoppingList) {
        return;
      }

      setSelectedMissingIngredients((prev) => new Set(prev).add(name));

      try {
        await onAddToShoppingList(name, quantity, category);
      } catch {
        setSelectedMissingIngredients((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      }
    },
    [onAddToShoppingList],
  );

  const handleCookRecipe = useCallback(() => {
    if (!recipe || !onCookRecipe) {
      return;
    }

    onCookRecipe(recipe);
  }, [onCookRecipe, recipe]);

  const handleAddIngredient = useCallback(
    (row: IngredientRow) => {
      void handleSelectMissingIngredient(row.name, row.amount, row.category);
    },
    [handleSelectMissingIngredient],
  );

  const handleAddAllMissing = useCallback(async () => {
    if (!onAddToShoppingList) {
      return;
    }

    const pending = rows.filter(
      (row) => !row.available && !selectedMissingIngredients.has(row.name),
    );

    if (pending.length === 0) {
      return;
    }

    setIsAddingMissing(true);

    try {
      for (const row of pending) {
        await handleSelectMissingIngredient(row.name, row.amount, row.category);
      }
    } finally {
      setIsAddingMissing(false);
    }
  }, [onAddToShoppingList, rows, selectedMissingIngredients, handleSelectMissingIngredient]);

  const handleToggleBookmark = useCallback(async () => {
    if (isBookmarkPending || !recipe) {
      return;
    }

    const previousBookmarked = isBookmarked;
    setIsBookmarkPending(true);

    try {
      let resolvedRecipeId: string | null;
      if (bookmarkRecipeId !== undefined) {
        resolvedRecipeId = bookmarkRecipeId;
      } else if (getBookmarkRecipeId) {
        resolvedRecipeId = getBookmarkRecipeId(recipe);
      } else {
        resolvedRecipeId = recipe.id;
      }

      if (!resolvedRecipeId && onEnsureBookmarkRecipeId) {
        resolvedRecipeId = await onEnsureBookmarkRecipeId(recipe);
      }

      if (!resolvedRecipeId) {
        throw new Error("Bookmark recipe id missing.");
      }

      const nextBookmarked = !previousBookmarked;

      const response = await fetch(`/api/recipes/${resolvedRecipeId}/bookmark`, {
        method: previousBookmarked ? "DELETE" : "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Bookmark request failed.");
      }

      setBookmarkOverrides((current) => {
        const next = new Map(current);
        next.set(resolvedRecipeId, nextBookmarked);
        next.set(recipe.id, nextBookmarked);
        return next;
      });

      toast.success(
        t(
          previousBookmarked
            ? "basic.recipeDialog.bookmarkRemoved"
            : "basic.recipeDialog.bookmarkSaved",
        ),
      );

      onBookmarkChange?.(resolvedRecipeId, nextBookmarked);
    } catch (error) {
      toast.error(t("basic.recipeDialog.bookmarkError"));
      console.error("[RecipeBrowserDialog] bookmark toggle failed", error);
    } finally {
      setIsBookmarkPending(false);
    }
  }, [
    bookmarkRecipeId,
    getBookmarkRecipeId,
    isBookmarked,
    isBookmarkPending,
    onBookmarkChange,
    onEnsureBookmarkRecipeId,
    recipe,
    t,
  ]);

  if (!recipe) return null;

  const restrictionFlagLabels = recipe.restrictionFlags.map((flag) => ({
    key: flag,
    label:
      flag in RESTRICTION_FLAG_TRANSLATION_KEYS
        ? t(RESTRICTION_FLAG_TRANSLATION_KEYS[flag]!)
        : flag.replace(/-/g, " "),
  }));

  const slideVariants = {
    enter: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="font-brand top-auto bottom-0 left-0 max-h-[92dvh] max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto overscroll-contain rounded-b-none rounded-t-[28px] border-0 bg-white p-0 shadow-[0_-8px_40px_rgba(17,24,39,0.18)] data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[28px] sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95"
      >
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-gray-200" />
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={recipe.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <RecipeDetailHero
              categoryKey={recipe.categoryKey}
              imageUrl={recipe.imageUrl}
              imageLoading={recipe.imagePending}
              imageAlt={recipe.title}
              counterLabel={`${currentIndex + 1} / ${recipes.length}`}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrev={goPrev}
              onNext={goNext}
              onClose={() => onOpenChange(false)}
              bookmarked={isBookmarked}
              bookmarkPending={isBookmarkPending}
              onToggleBookmark={() => {
                void handleToggleBookmark();
              }}
            />

            <div className="flex flex-col gap-5 px-5 pt-4 pb-6">
              <RecipeTagList
                category={recipe.category}
                mealPrep={recipe.mealPrepFriendly}
                restrictions={restrictionFlagLabels}
              />

              <DialogTitle className="text-[24px] font-bold leading-[30px] tracking-[-0.02em] text-gray-900">
                {recipe.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("basic.recipeDialog.detail")}
              </DialogDescription>

              <RecipeStatsCard
                minutes={recipe.totalTimeMin}
                servings={recipe.servings}
                ingredientCount={rows.length}
              />

              <NutritionTiles
                calories={recipe.calories}
                proteinG={recipe.proteinG}
                carbsG={recipe.carbsG}
                fatG={recipe.fatG}
              />

              <IngredientList
                rows={rows}
                addedNames={selectedMissingIngredients}
                onAdd={onAddToShoppingList ? handleAddIngredient : undefined}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        <RecipeDetailFooter
          missingToAdd={missingToAdd}
          onAddMissing={onAddToShoppingList ? handleAddAllMissing : undefined}
          addingMissing={isAddingMissing}
          onCook={handleCookRecipe}
          cookDisabled={!onCookRecipe}
        />
      </DialogContent>
    </Dialog>
  );
}
