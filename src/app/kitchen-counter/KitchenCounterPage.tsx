"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Check,
  X,
  Flame,
  Clock,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import AppShellViewport from "@/app/home/components/AppShellViewport";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

const PANTRY_CHANGED_EVENT = "pantry:changed";

interface KitchenCounterPageProps {
  recipe?: BasicHomeRecipePreview | null;
  onBack: () => void;
}

type KitchenCounterIngredient = {
  name: string;
  amount: string;
  isAvailable: boolean;
};

type KitchenCounterStep = {
  id: number;
  title: string;
  text: string;
};

function buildKitchenCounterIngredients(
  recipe: BasicHomeRecipePreview,
  t: ReturnType<typeof useTranslations>,
): KitchenCounterIngredient[] {
  if (recipe.ingredientItems && recipe.ingredientItems.length > 0) {
    return recipe.ingredientItems.map((ingredient) => {
      const comparison = ingredient.pantryComparison;
      const isFallback = (recipe.matchedIngredients ?? []).some(
        (matchedIngredient) =>
          matchedIngredient.recipeIngredientName.trim().toLowerCase() ===
            ingredient.name.trim().toLowerCase() &&
          matchedIngredient.matchType === "fallback",
      );

      const tone =
        comparison?.status === "unavailable"
          ? "red"
          : isFallback ||
              comparison?.status === "insufficient" ||
              comparison?.status === "unit-mismatch" ||
              comparison?.status === "missing-pantry-quantity"
            ? "orange"
            : "green";

      const amount =
        comparison?.status === "insufficient" &&
        comparison.requiredLabel &&
        comparison.availableLabel
          ? `${comparison.requiredLabel} (${t(
              "basic.kitchenCounter.haveAmountInline",
              {
                amount: comparison.availableLabel,
              },
            )})`
          : (comparison?.requiredLabel ??
            ingredient.amount ??
            (tone === "green"
              ? t("basic.kitchenCounter.readyAmount")
              : t("basic.kitchenCounter.missingAmount")));

      return {
        name: ingredient.name,
        amount,
        isAvailable: tone === "green",
      };
    });
  }

  const availableIngredients = (recipe.ingredientPreview || []).map((name) => ({
    name,
    amount: t("basic.kitchenCounter.readyAmount"),
    isAvailable: true,
  }));

  const missingIngredients = (recipe.missingIngredients ?? []).map((name) => ({
    name,
    amount: t("basic.kitchenCounter.missingAmount"),
    isAvailable: false,
  }));

  const allIngredients = [...availableIngredients, ...missingIngredients];
  const seenNames = new Set<string>();

  return allIngredients.filter((ingredient) => {
    const normalizedName = ingredient.name.trim().toLowerCase();
    if (seenNames.has(normalizedName)) {
      return false;
    }

    seenNames.add(normalizedName);
    return true;
  });
}

function buildKitchenCounterSteps(
  recipe: BasicHomeRecipePreview,
): KitchenCounterStep[] {
  return (recipe.instructions || []).map((instruction, index) => ({
    id: index + 1,
    title: instruction.title,
    text: instruction.text,
  }));
}


export default function KitchenCounterPage({
  recipe,
  onBack,
}: KitchenCounterPageProps) {
  const t = useTranslations("home");
  const activeRecipe = recipe ?? null;
  const ingredients = useMemo(
    () => (activeRecipe ? buildKitchenCounterIngredients(activeRecipe, t) : []),
    [activeRecipe, t],
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps = useMemo(
    () => (activeRecipe ? buildKitchenCounterSteps(activeRecipe) : []),
    [activeRecipe],
  );
  const checkedIngredientsCount = ingredients.filter(
    (ingredient) => ingredient.isAvailable,
  ).length;
  const missingIngredients = useMemo(
    () => ingredients.filter((ingredient) => !ingredient.isAvailable),
    [ingredients],
  );
  const activeStep = steps[currentStepIndex] ?? null;
  const canGoToPreviousStep = currentStepIndex > 0;
  const canGoToNextStep = currentStepIndex < steps.length - 1;
  const [isFinishingRecipe, setIsFinishingRecipe] = useState(false);
  const [isMissingIngredientsDialogOpen, setIsMissingIngredientsDialogOpen] =
    useState(false);

  useEffect(() => {
    setCurrentStepIndex(0);
    setIsMissingIngredientsDialogOpen(false);
  }, [activeRecipe?.id]);

  useEffect(() => {
    if (!activeRecipe) {
      return;
    }

    if (!("wakeLock" in navigator)) {
      return;
    }

    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch {
        wakeLock = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !wakeLock) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        void wakeLock.release();
      }
      wakeLock = null;
    };
  }, [activeRecipe]);

  const handleNextStep = () => {
    if (canGoToNextStep) {
      setCurrentStepIndex((previous) => previous + 1);
      return;
    }

    void handleFinishAttempt();
  };

  const handlePreviousStep = () => {
    if (!canGoToPreviousStep) {
      return;
    }

    setCurrentStepIndex((previous) => previous - 1);
  };

  const handleFinishAttempt = async () => {
    if (!activeRecipe || isFinishingRecipe) {
      return;
    }

    if (missingIngredients.length > 0) {
      setIsMissingIngredientsDialogOpen(true);
      return;
    }

    await executeFinishRecipe();
  };

  const executeFinishRecipe = async () => {
    if (!activeRecipe || isFinishingRecipe) {
      return;
    }

    logger.debug("[kitchen-counter.finish] starting recipe completion", {
      metadata: {
        recipeId: activeRecipe.id,
        recipeTitle: activeRecipe.title,
        ingredientCount: activeRecipe.ingredientItems?.length ?? 0,
        matchedIngredientCount: activeRecipe.matchedIngredients?.length ?? 0,
      },
    });

    setIsFinishingRecipe(true);

    try {
      const response = await fetch("/api/pantry/consume-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeId: activeRecipe.id,
          recipeTitle: activeRecipe.title,
          ingredientItems: activeRecipe.ingredientItems ?? [],
          matchedIngredients: activeRecipe.matchedIngredients ?? [],
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        summary?: { updatedItems?: number; deletedItems?: number };
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? t("basic.kitchenCounter.finishError"));
      }

      logger.info("[kitchen-counter.finish] recipe completion succeeded", {
        metadata: {
          recipeId: activeRecipe.id,
          recipeTitle: activeRecipe.title,
          updatedItems: payload?.summary?.updatedItems ?? 0,
          deletedItems: payload?.summary?.deletedItems ?? 0,
        },
      });

      const changedPantryItems =
        (payload?.summary?.updatedItems ?? 0) +
        (payload?.summary?.deletedItems ?? 0);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PANTRY_CHANGED_EVENT));
      }

      if (changedPantryItems > 0) {
        toast.success(
          t("basic.kitchenCounter.pantryUpdated", {
            count: changedPantryItems,
          }),
        );
      } else {
        toast.success(t("basic.kitchenCounter.recipeFinished"));
      }

      onBack();
    } catch (error) {
      logger.error("[kitchen-counter.finish] recipe completion failed", error, {
        metadata: {
          recipeId: activeRecipe.id,
          recipeTitle: activeRecipe.title,
        },
      });
      toast.error(
        error instanceof Error ? error.message : t("basic.kitchenCounter.finishError"),
      );
    } finally {
      setIsFinishingRecipe(false);
    }
  };

  const handleConfirmFinishWithMissingIngredients = () => {
    setIsMissingIngredientsDialogOpen(false);
    void executeFinishRecipe();
  };

  if (!activeRecipe) {
    return (
      <div className="flex flex-col min-h-[70vh] bg-[#FAFAFA] overflow-hidden rounded-[1.5rem]">
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-sm border border-orange-100">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-none">
                {t("nav.kitchenCounter")}
              </h1>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-500 hover:text-red-500 hover:bg-red-50 font-bold transition-colors rounded-full px-4"
          >
            <X className="w-4 h-4 mr-2" />
            <span>{t("basic.kitchenCounter.backToHome")}</span>
          </Button>
        </header>

        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-xl rounded-[2rem] bg-white border border-gray-100 shadow-sm p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-eatrivo-purple/10 text-eatrivo-purple">
              <ChefHat className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-black tracking-tight text-gray-900">
              {t("basic.kitchenCounter.emptyTitle")}
            </h2>
            <p className="mt-3 text-base font-medium leading-relaxed text-gray-500">
              {t("basic.kitchenCounter.emptyDescription")}
            </p>
            <Button className="mt-8" onClick={onBack}>
              {t("basic.kitchenCounter.backToHome")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShellViewport className="min-h-[100dvh] bg-eatrivo-white-primary overflow-hidden relative">
      <Dialog
        open={isMissingIngredientsDialogOpen}
        onOpenChange={setIsMissingIngredientsDialogOpen}
      >
        <DialogContent
          className="max-w-[calc(100%-1.5rem)] rounded-2xl border border-eatrivo-black-primary/20 bg-eatrivo-white-primary p-2 sm:max-w-md"
          showCloseButton={false}
        >
          <div className="border-b border-red-100/80 bg-gradient-to-br from-red-50 via-white to-orange-50 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-eatrivo-red bg-eatrivo-white-primary text-red-500 shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-black tracking-tight text-eatrivo-black-primary">
                  {t("basic.kitchenCounter.missingIngredientsTitle")}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium leading-6 text-eatrivo-black-secondary">
                  {t("basic.kitchenCounter.missingIngredientsDescription")}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-eatrivo-red">
              {t("basic.kitchenCounter.missingIngredientsListTitle")}
            </p>
            <ul className="mt-3 space-y-2.5">
              {missingIngredients.map((ingredient) => (
                <li
                  key={ingredient.name}
                  className="flex items-start gap-3 rounded-2xl border border-eatrivo-red/20 bg-eatrivo-red/10 px-3 py-3"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-eatrivo-red/20 bg-eatrivo-white-primary text-eatrivo-red">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-eatrivo-black-primary">
                      {ingredient.name}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-eatrivo-black-secondary">
                      {ingredient.amount}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="border-t border-gray-100 px-6 py-5 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-full border border-gray-200 px-5 text-sm font-semibold text-eatrivo-black-secondary hover:bg-eatrivo-black-secondary/10 transition-all active:scale-95 "
              onClick={() => setIsMissingIngredientsDialogOpen(false)}
            >
              {t("basic.kitchenCounter.missingIngredientsCancel")}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full bg-eatrivo-green px-5 text-sm font-bold text-eatrivo-white-primary border-eatrivo-green/60 border-2 hover:bg-eatrivo-green-dark transition-all active:scale-95"
              onClick={handleConfirmFinishWithMissingIngredients}
            >
              {t("basic.kitchenCounter.missingIngredientsContinue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ─── Top Header ────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-eatrivo-purple font-semibold">
            <div className="p-1.5 bg-eatrivo-purple/10 rounded-lg">
              <ChefHat className="w-5 h-5" />
            </div>
            <span className="text-[15px] tracking-wide font-bold">
              {t("nav.kitchenCounter")}
            </span>
          </div>

          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isFinishingRecipe}
            className="hidden md:flex text-eatrivo-purple hover:bg-eatrivo-purple/10 rounded-full w-10 h-10 p-0 items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </header>

        {/* ─── Title & Meta ──────────────────────────────────────── */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a1625] leading-snug mb-3 sm:mb-4 drop-shadow-sm">
          {activeRecipe.title}
        </h1>

        <div className="grid grid-cols-2 gap-2 mb-6 md:flex md:flex-wrap md:items-center md:gap-3 md:mb-8">
          <div className="flex items-center justify-center gap-1.5 bg-white border border-eatrivo-purple/10 shadow-sm text-gray-700 h-10 px-2 md:px-3.5 md:py-1.5 rounded-full text-xs sm:text-sm font-semibold">
            <Clock className="w-4 h-4 text-eatrivo-purple" />
            {activeRecipe.totalTimeMin} {t("time.minutesShort")}
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-white border border-eatrivo-purple/10 shadow-sm text-gray-700 h-10 px-2 md:px-3.5 md:py-1.5 rounded-full text-xs sm:text-sm font-semibold">
            <Flame className="w-4 h-4 text-eatrivo-purple" />
            {activeRecipe.calories} kcal
          </div>
        </div>

        {/* ─── Ingredients ───────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.015)] border border-eatrivo-purple/10 mb-8">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-[1.1rem] font-bold text-[#1a1625] font-sans">
              {t("basic.kitchenCounter.ingredientsTitle")}
            </h2>
            <span className="hidden md:inline-flex text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
              {checkedIngredientsCount}/{ingredients.length}
            </span>
          </div>
          <ul className="space-y-3.5">
            {ingredients.map((item) => (
              <li
                key={item.name}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    item.isAvailable
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                      : "border-red-300 bg-red-50 text-red-500"
                  }`}
                >
                  {item.isAvailable ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-6 text-gray-800">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-gray-500">
                    {item.amount}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ─── Instructions ──────────────────────────────────────── */}
        <section className="bg-[#F6EFFF] rounded-2xl p-6 sm:p-8 border border-white">
          <h2 className="text-[1.1rem] font-bold text-[#1a1625] mb-5 font-sans">
            {t("basic.kitchenCounter.stepsTitle")}
          </h2>
          <div className="md:hidden mb-4">
            {activeStep ? (
              <div className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold bg-eatrivo-purple/10 text-eatrivo-purple">
                {t("basic.kitchenCounter.stepProgress", {
                  current: currentStepIndex + 1,
                  total: steps.length,
                })}
              </div>
            ) : null}
          </div>

          <div className="hidden md:space-y-4 md:block">
            {steps.map((step) => (
              <div
                key={step.id}
                className="bg-white rounded-2xl p-4 sm:p-5 flex gap-4 sm:gap-5 shadow-sm items-center transition-colors"
              >
                <div className="w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] rounded-[14px] bg-[#D4BBFF] text-[#5527A1] text-lg sm:text-xl font-bold flex items-center justify-center shrink-0">
                  {step.id}
                </div>
                <div className="flex-1">
                  {step.title && (
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">
                      {step.title}
                    </h3>
                  )}
                  <p className="text-base sm:text-lg text-gray-700 font-medium leading-7">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="md:hidden">
            {activeStep ? (
              <div className="bg-white rounded-2xl p-5 flex gap-4 shadow-sm items-center border-2 border-eatrivo-purple/20">
                <div className="w-[44px] h-[44px] rounded-[14px] bg-[#D4BBFF] text-[#5527A1] text-lg font-bold flex items-center justify-center shrink-0">
                  {activeStep.id}
                </div>
                <div className="flex-1">
                  {activeStep.title && (
                    <h3 className="text-base font-semibold text-gray-800 mb-1">
                      {activeStep.title}
                    </h3>
                  )}
                  <p className="text-base text-gray-700 font-medium leading-7">
                    {activeStep.text}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t("basic.kitchenCounter.stepsTitle")}</p>
            )}
          </div>
        </section>
      </div>

      {/* ─── Bottom Floating Action ────────────────────────────── */}
      <div className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 p-3 md:p-6 bg-gradient-to-t from-[#FDFCFE] via-[#FDFCFE]/95 to-transparent flex justify-center pb-4 pt-8 md:pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none z-40">
        <div className="max-w-4xl w-full pointer-events-auto grid grid-cols-2 gap-3 md:flex md:justify-end md:items-center">
          <Button
            onClick={canGoToPreviousStep ? handlePreviousStep : onBack}
            disabled={isFinishingRecipe}
            className="h-12 bg-eatrivo-white-primary transform transition-all active:scale-95 rounded-xl text-sm font-semibold border-eatrivo-black-secondary/30 border-1 text-eatrivo-purple md:hidden"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {canGoToPreviousStep
              ? t("basic.kitchenCounter.previousStep")
              : t("basic.kitchenCounter.backToHome")}
          </Button>
          <Button
            onClick={steps.length > 0 ? handleNextStep : () => void handleFinishAttempt()}
            disabled={isFinishingRecipe}
            className={`${canGoToNextStep ? "bg-eatrivo-black-primary" : " bg-eatrivo-green"} text-white h-12 md:h-auto w-full transform active:scale-95 md:w-auto text-base md:text-lg font-bold py-3 md:py-6 px-5 md:px-8 rounded-2xl md:rounded-full hover:shadow-[0_12px_25px_rgba(0,0,0,0.25)] transition-all flex items-center justify-center gap-2 col-span-1 md:col-auto`}
          >
            {isFinishingRecipe
              ? t("basic.kitchenCounter.finishPending")
              : canGoToNextStep
                ? t("basic.kitchenCounter.nextStep")
                : t("basic.kitchenCounter.finishRecipe")}
            {isFinishingRecipe ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : canGoToNextStep ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <Check className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </AppShellViewport>
  );
}
