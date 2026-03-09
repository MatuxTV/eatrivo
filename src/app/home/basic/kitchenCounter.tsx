"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Check,
  X,
  Flame,
  Clock,
  ChefHat,
  Droplets,
  Beef,
  Wheat,
  CheckCircle2,
  Circle,
  ArrowRight,
  HeartPulse,
  Layers3,
  ListChecks,
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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } },
};

export default function KitchenCounterPage({
  recipe,
  onBack,
}: KitchenCounterPageProps) {
  const t = useTranslations("home");
  const activeRecipe = useMemo(() => recipe ?? null, [recipe]);
  const [activeMobileTab, setActiveMobileTab] = useState<
    "ingredients" | "steps"
  >("ingredients");
  const [ingredients, setIngredients] = useState<KitchenCounterIngredient[]>(
    [],
  );
  const steps = useMemo(
    () => (activeRecipe ? buildKitchenCounterSteps(activeRecipe) : []),
    [activeRecipe],
  );
  const checkedIngredientsCount = ingredients.filter(
    (ingredient) => ingredient.checked,
  ).length;

  useEffect(() => {
    setIngredients(
      activeRecipe ? buildKitchenCounterIngredients(activeRecipe, t) : [],
    );
  }, [activeRecipe, t]);

  const toggleIngredient = (index: number) => {
    const newIngredients = [...ingredients];
    newIngredients[index].checked = !newIngredients[index].checked;
    setIngredients(newIngredients);
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
    <div className="min-h-[100dvh] bg-[#FDFCFE] relative pb-32">
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
            className="text-eatrivo-purple hover:bg-eatrivo-purple/10 rounded-full w-10 h-10 p-0 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </header>

        {/* ─── Title & Meta ──────────────────────────────────────── */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a1625] leading-tight mb-5 drop-shadow-sm">
          {activeRecipe.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 bg-white border border-eatrivo-purple/10 shadow-sm text-gray-700 px-3.5 py-1.5 rounded-full text-sm font-semibold">
            <Clock className="w-4 h-4 text-eatrivo-purple" />
            {activeRecipe.totalTimeMin} {t("time.minutesShort")}
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-eatrivo-purple/10 shadow-sm text-gray-700 px-3.5 py-1.5 rounded-full text-sm font-semibold">
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
            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
              {checkedIngredientsCount}/{ingredients.length}
            </span>
          </div>
          <ul className="space-y-3.5">
            {ingredients.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => toggleIngredient(idx)}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                    item.checked
                      ? "bg-emerald-400"
                      : "bg-[#C4A9FF] group-hover:bg-[#A984FF]"
                  }`}
                />
                <span
                  className={`text-[15px] font-medium leading-relaxed transition-all ${
                    item.checked
                      ? "text-gray-400 line-through"
                      : "text-gray-500"
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
          <div className="space-y-4">
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
                    <h3 className="font-bold text-gray-800 mb-1">
                      {step.title}
                    </h3>
                  )}
                  <p className="text-[15px] sm:text-base text-gray-500 font-medium leading-relaxed">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ─── Bottom Floating Action ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[#FDFCFE] via-[#FDFCFE]/90 to-transparent flex justify-center pb-8 pt-12 pointer-events-none z-50">
        <div className="max-w-4xl w-full flex justify-end">
          <Button
            onClick={onBack}
            className="pointer-events-auto bg-[#1a1a2e] hover:bg-[#2a2a4a] text-white text-lg font-bold py-6 px-8 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.25)] transition-all flex items-center gap-2"
          >
            {t("basic.kitchenCounter.finishRecipe")}{" "}
            <Check className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
