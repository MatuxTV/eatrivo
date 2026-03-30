"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Bookmark,
  Clock,
  Flame,
  Beef,
  Droplet,
  Wheat,
  Users,
  ChefHat,
  Sparkles,
  Check,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";
import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import { Button } from "@/components/ui/button";

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
  onAddToShoppingList?: (
    ingredientName: string,
    quantity: string | null,
    category: string | null,
  ) => Promise<void>;
  onCookRecipe?: (recipe: BasicHomeRecipePreview) => void;
}

/* ────────────────────────────────────────────── */
/*  Helpers                                       */
/* ────────────────────────────────────────────── */

function getCategoryGradient(categoryKey: string): string {
  switch (categoryKey) {
    case "breakfast":
      return "from-amber-500 via-orange-500 to-rose-500";
    case "lunch":
    case "lunch-and-dinner":
      return "from-emerald-500 via-teal-500 to-cyan-500";
    case "dinner":
      return "from-indigo-500 via-violet-500 to-fuchsia-500";
    case "smoothies":
      return "from-pink-500 via-rose-500 to-orange-400";
    default:
      return "from-purple-600 via-fuchsia-500 to-pink-500";
  }
}

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

export default function RecipeBrowserDialog({
  open,
  onOpenChange,
  recipes,
  initialIndex = 0,
  onAddToShoppingList,
  onCookRecipe,
}: RecipeBrowserDialogProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0); // -1 left, 1 right
  const [selectedMissingIngredients, setSelectedMissingIngredients] = useState<Set<string>>(
    new Set(),
  );
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkPending, setIsBookmarkPending] = useState(false);

  // Sync when dialog opens with a different initialIndex
  useEffect(() => {
    if (open) setCurrentIndex(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) {
      setSelectedMissingIngredients(new Set());
      setIsBookmarked(false);
      setIsBookmarkPending(false);
    }
  }, [open]);

  const recipe = recipes[currentIndex] ?? null;
  const hasNext = currentIndex < recipes.length - 1;
  const hasPrev = currentIndex > 0;

  useEffect(() => {
    if (!open || !recipe?.id) {
      return;
    }

    let isCancelled = false;
    setIsBookmarkPending(true);

    void fetch(`/api/recipes/${recipe.id}/bookmark`, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { bookmarked?: boolean; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Bookmark status request failed.");
        }

        if (isCancelled) {
          return;
        }

        setIsBookmarked(Boolean(payload?.bookmarked));
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        console.error("[RecipeBrowserDialog] bookmark status failed", error);
        setIsBookmarked(false);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsBookmarkPending(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [open, recipe?.id]);

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

  const handleToggleBookmark = useCallback(async () => {
    if (!recipe?.id || isBookmarkPending) {
      return;
    }

    const previousBookmarked = isBookmarked;
    setIsBookmarkPending(true);

    try {
      const response = await fetch(`/api/recipes/${recipe.id}/bookmark`, {
        method: previousBookmarked ? "DELETE" : "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Bookmark request failed.");
      }

      setIsBookmarked(!previousBookmarked);
      toast.success(
        t(
          previousBookmarked
            ? "basic.recipeDialog.bookmarkRemoved"
            : "basic.recipeDialog.bookmarkSaved",
        ),
      );
    } catch (error) {
      setIsBookmarked(previousBookmarked);
      toast.error(t("basic.recipeDialog.bookmarkError"));
      console.error("[RecipeBrowserDialog] bookmark toggle failed", error);
    } finally {
      setIsBookmarkPending(false);
    }
  }, [isBookmarked, isBookmarkPending, recipe?.id, t]);

  if (!recipe) return null;

  const restrictionFlagLabels = recipe.restrictionFlags.map((flag) => ({
    key: flag,
    label:
      flag in RESTRICTION_FLAG_TRANSLATION_KEYS
        ? t(RESTRICTION_FLAG_TRANSLATION_KEYS[flag]!)
        : flag.replace(/-/g, " "),
  }));

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-eatrivo-white-primary p-0 gap-0 border-none shadow-2xl rounded-[2rem] sm:rounded-[2.5rem]"
      >
        {/* Navigation Arrows + Close */}
        <div className="sticky bg-eatrivo-white-primary/98 top-0 z-30 flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={goPrev}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-gray-600 hover:bg-white active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed ring-1 ring-gray-200/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Counter */}
          <span className="text-[12px] font-bold text-gray-400 tracking-wider">
            {currentIndex + 1} / {recipes.length}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasNext}
              onClick={goNext}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-gray-600 hover:bg-white active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed ring-1 ring-gray-200/50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-gray-600 hover:bg-white active:scale-90 transition-all ring-1 ring-gray-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Animated Content */}
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
            {/* Hero gradient header */}
            <div
              className={`relative mx-4 rounded-[1.5rem] overflow-hidden bg-gradient-to-br ${getCategoryGradient(recipe.categoryKey)} p-6 sm:p-8 text-white`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_45%)]" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                      {recipe.category}
                    </span>
                    {recipe.mealPrepFriendly && (
                      <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {t("basic.recipeDialog.mealPrep")}
                      </span>
                    )}
                    {restrictionFlagLabels.map((flag) => (
                      <span
                        key={flag.key}
                        className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 ring-1 ring-white/20 backdrop-blur-md"
                      >
                        {flag.label}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleBookmark();
                    }}
                    disabled={isBookmarkPending}
                    aria-label={
                      isBookmarked
                        ? t("basic.recipeDialog.removeBookmark")
                        : t("basic.recipeDialog.saveRecipe")
                    }
                    title={
                      isBookmarked
                        ? t("basic.recipeDialog.removeBookmark")
                        : t("basic.recipeDialog.saveRecipe")
                    }
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg ring-1 ring-white/30 backdrop-blur-md transition-all active:scale-95 disabled:cursor-wait disabled:opacity-70 ${
                      isBookmarked
                        ? "bg-white text-eatrivo-purple"
                        : "bg-white/18 text-white hover:bg-white/26"
                    }`}
                  >
                    {isBookmarkPending ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <Bookmark
                        className={`h-4.5 w-4.5 ${isBookmarked ? "fill-current" : ""}`}
                      />
                    )}
                  </button>
                </div>

                {/* Title */}
                <DialogTitle className="text-3xl sm:text-4xl font-black leading-[1.05] tracking-tighter text-balance drop-shadow-sm text-white">
                  {recipe.title}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {t("basic.recipeDialog.detail")}
                </DialogDescription>

                {/* Quick stats row */}
                <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-white/90">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {recipe.totalTimeMin} {t("time.minutesShort")}
                  </span>   
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {recipe.servings == 1 ? (
                      t("basic.recipeDialog.oneServing", { count: recipe.servings })
                    ) : (
                      t("basic.recipeDialog.servings", { count: recipe.servings })
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Body content */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* Macro grid */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-3">
                  {t("recipe.nutritionValues")}
                  <div className="h-px flex-1 bg-gray-100" />
                </h3>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {
                      icon: Flame,
                      value: recipe.calories,
                      unit: "",
                      label: t("nutrition.calories"),
                      color: "text-orange-500 bg-orange-50",
                    },
                    {
                      icon: Beef,
                      value: recipe.proteinG,
                      unit: "g",
                      label: t("nutrition.protein"),
                      color: "text-green-600 bg-green-50",
                    },
                    {
                      icon: Wheat,
                      value: recipe.carbsG,
                      unit: "g",
                      label: t("nutrition.carbs"),
                      color: "text-amber-600 bg-amber-50",
                    },
                    {
                      icon: Droplet,
                      value: recipe.fatG,
                      unit: "g",
                      label: t("nutrition.fats"),
                      color: "text-rose-500 bg-rose-50",
                    },
                  ].map((macro) => (
                    <div
                      key={macro.label}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-50 ring-1 ring-gray-100"
                    >
                      <div
                        className={`w-8 h-8 rounded-full ${macro.color} flex items-center justify-center`}
                      >
                        <macro.icon className="w-4 h-4" />
                      </div>
                      <span className="text-xl font-black text-[#1a1a2e] tracking-tight leading-none">
                        {macro.value}
                        {macro.unit}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {macro.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ingredients — unified list */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-3">
                  {t("recipe.ingredients")}
                  <div className="h-px flex-1 bg-gray-100" />
                </h3>

                {(() => {
                  const ingredientByName = new Map(
                    recipe.ingredientItems.map((ingredient) => [
                      ingredient.name.trim().toLowerCase(),
                      ingredient,
                    ]),
                  );

                  const resolveAmountLabel = (
                    ingredientName: string,
                    fallbackAmount: string | null,
                  ) => {
                    const ingredient = ingredientByName.get(
                      ingredientName.trim().toLowerCase(),
                    );

                    if (
                      ingredient?.pantryComparison?.status === "insufficient" &&
                      ingredient.pantryComparison.requiredLabel &&
                      ingredient.pantryComparison.availableLabel
                    ) {
                      return `${ingredient.pantryComparison.requiredLabel} (${t("basic.recipeDialog.haveAmountInline", {
                        amount: ingredient.pantryComparison.availableLabel,
                      })})`;
                    }

                    return ingredient?.pantryComparison?.requiredLabel ??
                      ingredient?.amount ??
                      fallbackAmount;
                  };

                  const resolveTone = (
                    ingredientName: string,
                    available: boolean,
                    matchType: "exact" | "fallback",
                  ) => {
                    if (!available) {
                      return "red" as const;
                    }

                    if (matchType === "fallback") {
                      return "orange" as const;
                    }

                    const comparison = ingredientByName.get(
                      ingredientName.trim().toLowerCase(),
                    )?.pantryComparison;

                    if (
                      comparison?.status === "insufficient" ||
                      comparison?.status === "unit-mismatch" ||
                      comparison?.status === "missing-pantry-quantity"
                    ) {
                      return "orange" as const;
                    }

                    return "green" as const;
                  };

                  const available = (recipe.matchedIngredients ?? []).map(
                    (ingredient) => ({
                      key: ingredient.recipeIngredientName,
                      name: ingredient.recipeIngredientName,
                      note:
                        ingredient.matchType === "fallback" &&
                        ingredient.pantryIngredientName &&
                        ingredient.pantryIngredientName.trim().toLowerCase() !==
                          ingredient.recipeIngredientName.trim().toLowerCase()
                          ? t("basic.recipeDialog.fallbackUsing", {
                              ingredient: ingredient.pantryIngredientName,
                            })
                          : null,
                      amount: resolveAmountLabel(
                        ingredient.recipeIngredientName,
                        ingredient.amount,
                      ),
                      category: null,
                      available: true,
                      matchType: ingredient.matchType,
                      tone: resolveTone(
                        ingredient.recipeIngredientName,
                        true,
                        ingredient.matchType,
                      ),
                    }),
                  );
                  const fallbackAvailable =
                    recipe.matchedIngredients === undefined
                      ? recipe.ingredientItems.map((ingredient) => ({
                          key: ingredient.name,
                          name: ingredient.name,
                          note: null,
                          amount: resolveAmountLabel(
                            ingredient.name,
                            ingredient.amount,
                          ),
                          category: null,
                          available: true,
                          matchType: "exact" as const,
                          tone: resolveTone(ingredient.name, true, "exact"),
                        }))
                      : [];
                  const missing = (recipe.missingIngredients ?? []).map(
                    (ing) => ({
                      key: ing,
                      name: ing,
                      note: null,
                      amount: resolveAmountLabel(ing, null),
                      category:
                        ingredientByName.get(ing.trim().toLowerCase())?.category ??
                        null,
                      available: false,
                      matchType: "exact" as const,
                      tone: "red" as const,
                    }),
                  );
                  const all = [...available, ...fallbackAvailable, ...missing];

                  if (all.length === 0) {
                    return (
                      <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <ChefHat className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                        <p className="text-[13px] font-bold text-gray-400">
                          {t("recipe.noIngredients")}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {all.map((item) => (
                        <div
                          key={`${item.key}-${item.available ? "available" : "missing"}`}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl ring-1 transition-colors ${
                            item.tone === "green"
                              ? "bg-green-50/60 ring-green-200/50"
                              : item.tone === "orange"
                                ? "bg-amber-50/70 ring-amber-200/60"
                                : "bg-red-50/60 ring-red-200/50"
                          }`}
                        >
                          {item.available ? (
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                item.tone === "orange"
                                  ? "bg-eatrivo-orange"
                                  : "bg-eatrivo-green"
                              }`}
                            >
                              {item.tone === "orange" ? (
                                <Minus className="w-3 h-3 text-white" />
                              ) : (
                                <Check
                                  className="w-3 h-3 text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                void
                                handleSelectMissingIngredient(
                                  item.name,
                                  item.amount,
                                  item.category,
                                );
                              }}
                              disabled={selectedMissingIngredients.has(item.name)}
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                                selectedMissingIngredients.has(item.name)
                                  ? "bg-gray-200"
                                  : "bg-red-500 hover:bg-red-600 shadow-sm shadow-red-200"
                              }`}
                              title={t("basic.recipeDialog.addToShoppingList")}
                            >
                              {selectedMissingIngredients.has(item.name) ? (
                                <Check
                                  className="w-3 h-3 text-gray-500"
                                  strokeWidth={3}
                                />
                              ) : (
                                <Plus
                                  className="w-3 h-3 text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </button>
                          )}
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <span
                                className={`block truncate text-[13px] font-bold ${
                                  item.tone === "green"
                                    ? "text-[#1a1a2e]"
                                    : item.tone === "orange"
                                      ? "text-amber-800"
                                      : "text-red-700"
                                }`}
                              >
                                {item.name}
                              </span>
                              {item.note ? (
                                <span className="mt-1 block truncate text-[11px] font-semibold text-amber-700/80">
                                  {item.note}
                                </span>
                              ) : null}
                            </div>
                            {item.amount ? (
                              <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 ring-1 ring-gray-200/70">
                                {item.amount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      <div className="sm:col-span-2 pt-2">
                        <Button
                          className="w-full"
                          onClick={handleCookRecipe}
                          disabled={!onCookRecipe}
                        >
                          {t("basic.recipeDialog.cookThisRecipe")}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
