"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  X,
  Flame,
  Clock,
  ChefHat,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BasicHomeRecipePreview } from "@/app/[locale]/home/page";

interface KitchenCounterPageProps {
  recipe?: BasicHomeRecipePreview | null;
  onBack: () => void;
}

type KitchenCounterIngredient = {
  name: string;
  amount: string;
  checked: boolean;
  tone: "green" | "orange" | "red";
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
        checked: tone === "green",
        tone,
      };
    });
  }

  const availableIngredients = (recipe.ingredientPreview || []).map((name) => ({
    name,
    amount: t("basic.kitchenCounter.readyAmount"),
    checked: true,
    tone: "green" as const,
  }));

  const missingIngredients = (recipe.missingIngredients ?? []).map((name) => ({
    name,
    amount: t("basic.kitchenCounter.missingAmount"),
    checked: false,
    tone: "red" as const,
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
  const [ingredients, setIngredients] = useState<KitchenCounterIngredient[]>(
    [],
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps = useMemo(
    () => (activeRecipe ? buildKitchenCounterSteps(activeRecipe) : []),
    [activeRecipe],
  );
  const checkedIngredientsCount = ingredients.filter(
    (ingredient) => ingredient.checked,
  ).length;
  const activeStep = steps[currentStepIndex] ?? null;
  const canGoToPreviousStep = currentStepIndex > 0;
  const canGoToNextStep = currentStepIndex < steps.length - 1;

  useEffect(() => {
    setIngredients(
      activeRecipe ? buildKitchenCounterIngredients(activeRecipe, t) : [],
    );
  }, [activeRecipe, t]);

  useEffect(() => {
    setCurrentStepIndex(0);
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

  const toggleIngredient = (index: number) => {
    setIngredients((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const handleNextStep = () => {
    if (canGoToNextStep) {
      setCurrentStepIndex((previous) => previous + 1);
      return;
    }

    onBack();
  };

  const handlePreviousStep = () => {
    if (!canGoToPreviousStep) {
      return;
    }

    setCurrentStepIndex((previous) => previous - 1);
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
    <div className="min-h-[100dvh] bg-[#FDFCFE] relative pb-[240px] md:pb-28">
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
            {ingredients.map((item, idx) => (
              <li
                key={item.name}
                className="flex items-center gap-3 cursor-pointer group rounded-xl min-h-11 px-2 -mx-2"
                onClick={() => toggleIngredient(idx)}
                role="button"
                tabIndex={0}
                aria-pressed={item.checked}
                aria-label={`${item.name} (${item.amount})`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleIngredient(idx);
                  }
                }}
              >
                <div
                  className={`h-11 w-11 rounded-xl shrink-0 transition-colors border-2 flex items-center justify-center ${
                    item.checked
                      ? "border-emerald-500 bg-emerald-50"
                      : item.tone === "red"
                        ? "border-red-300 bg-red-50"
                        : item.tone === "orange"
                          ? "border-amber-300 bg-amber-50"
                          : "border-[#C4A9FF] bg-[#F5EDFF]"
                  }`}
                >
                  {item.checked ? (
                    <Check className="w-5 h-5 text-emerald-600" />
                  ) : null}
                </div>
                <span
                  className={`text-base md:text-[15px] font-medium leading-relaxed transition-all ${
                    item.checked
                      ? "text-gray-400 line-through"
                      : "text-gray-700"
                  }`}
                >
                  {item.name}{" "}
                  <span className="text-gray-400">({item.amount})</span>
                </span>
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
      <div className="fixed bottom-[calc(96px+72px+env(safe-area-inset-bottom))] md:bottom-[76px] left-0 right-0 z-40 px-4 md:hidden">
        <div className="mx-auto max-w-4xl flex justify-center">
          <span className="h-9 px-3 rounded-full bg-eatrivo-purple/10 text-eatrivo-purple text-sm font-semibold inline-flex items-center shadow-sm backdrop-blur-sm pointer-events-auto">
            {t("basic.kitchenCounter.progress", {
              checked: checkedIngredientsCount,
              total: ingredients.length,
            })}
          </span>
        </div>
      </div>
      <div className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 p-3 md:p-6 bg-gradient-to-t from-[#FDFCFE] via-[#FDFCFE]/95 to-transparent flex justify-center pb-4 pt-8 md:pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none z-40">
        <div className="max-w-4xl w-full pointer-events-auto grid grid-cols-2 gap-3 md:flex md:justify-end md:items-center">
          <Button
            onClick={canGoToPreviousStep ? handlePreviousStep : onBack}
            className="h-12 bg-eatrivo-white-primary rounded-xl text-sm font-semibold border-eatrivo-black-secondary/30 border-1 text-eatrivo-purple md:hidden"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {canGoToPreviousStep
              ? t("basic.kitchenCounter.previousStep")
              : t("basic.kitchenCounter.backToHome")}
          </Button>
          <Button
            onClick={steps.length > 0 ? handleNextStep : onBack}
            className="bg-[#1a1a2e] hover:bg-[#2a2a4a] text-white h-12 md:h-auto w-full md:w-auto text-base md:text-lg font-bold py-3 md:py-6 px-5 md:px-8 rounded-2xl md:rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.25)] transition-all flex items-center justify-center gap-2 col-span-1 md:col-auto"
          >
            {canGoToNextStep
              ? t("basic.kitchenCounter.nextStep")
              : t("basic.kitchenCounter.finishRecipe")}
            {canGoToNextStep ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <Check className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
