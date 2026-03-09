"use client";

import { useState, useEffect } from "react";
import { ChefHat, ShoppingCart, Sparkles } from "lucide-react";
import ReceiptCard from "@/app/home/components/ReceiptCard";
import ShoppingListCard from "@/app/home/components/ShoppingListCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Ingredient } from "@/types/meal-plan";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

interface Meal {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  cookTime: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  type: string;
  ingredients?: (string | Ingredient)[];
}

interface DailyMealPlanProps {
  meals: Meal[];
  isLoading: boolean;
  /** Whether the user has an active shopping list */
  hasActiveShoppingList?: boolean;
  /** The pending shopping list object (draft or approved) if it exists */
  pendingShoppingList?: any; // Replace with proper type or any if imported from elsewhere
  /** Callback when shopping list status changes */
  onStatusChange?: () => void;
  /** Whether a shopping list is currently being generated */
  isGeneratingList?: boolean;
  /** Callback to generate a new shopping list */
  onGenerateList?: () => void;
  /** SSE generation progress (0-100) */
  generationProgress?: number;
  /** SSE i18n label key, e.g. "loader.generatingList" */
  generationLabel?: string;
  /** SSE retry count */
  retryCount?: number;
}

export default function DailyMealPlan({
  meals,
  isLoading,
  hasActiveShoppingList = true,
  pendingShoppingList = null,
  isGeneratingList = false,
  onGenerateList,
  generationProgress = 0,
  generationLabel,
  retryCount = 0,
  onStatusChange,
}: DailyMealPlanProps) {
  const t = useTranslations("home");
  const shouldReduceMotion = useReducedMotion();
  const [displayProgress, setDisplayProgress] = useState(0);

  // Snap displayProgress up whenever real progress jumps ahead
  useEffect(() => {
    if (generationProgress >= 100) {
      setDisplayProgress(100);
    } else {
      setDisplayProgress((prev) => Math.max(prev, generationProgress));
    }
  }, [generationProgress]);

  // Every 1.5 s add 1–2 % so the bar is always visibly moving, stop at 99 %
  useEffect(() => {
    if (!isGeneratingList) {
      setDisplayProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= 99) return prev; // hold at 99 until real "done" fires
        const increment = Math.random() < 0.5 ? 1 : 2;
        return Math.min(prev + increment, 99);
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isGeneratingList]);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          {...fadeIn}
          className="flex items-center justify-center py-16"
        >
          <motion.div
            className="w-10 h-10 rounded-full border-4 border-eatrivo-purple/20 border-t-eatrivo-purple"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      ) : pendingShoppingList && !isGeneratingList ? (
        /* Render the actual draft/approved ShoppingListCard directly */
        <motion.div
          key="pending-shopping-list"
          {...fadeIn}
          className="relative group w-full max-w-[400px]"
        >
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {pendingShoppingList.status === "approved"
                ? t("dailyPlan.readyForPurchase", {
                    defaultValue: "Pripravené na nákup",
                  })
                : t("dailyPlan.waitingForApproval", {
                    defaultValue: "Plán čaká na schválenie",
                  })}
            </h3>
            <p className="text-sm text-gray-500">
              {pendingShoppingList.status === "approved"
                ? t("dailyPlan.readyForPurchaseDesc", {
                    defaultValue:
                      "Jedálniček je aktívny, zostáva už len nakúpiť prísady.",
                  })
                : t("dailyPlan.waitingForApprovalDesc", {
                    defaultValue: "Prezri si jedálniček a schváľ ho.",
                  })}
            </p>
          </div>
          <ShoppingListCard
            {...pendingShoppingList}
            onStatusChange={onStatusChange}
            onRegenerate={onGenerateList}
          />
        </motion.div>
      ) : !hasActiveShoppingList && !isGeneratingList ? (
        /* No active shopping list — show CTA to create one */
        <motion.div
          key="no-shopping-list"
          {...fadeIn}
          className="relative group"
        >
          <motion.div
            whileHover={
              shouldReduceMotion || isGeneratingList
                ? {}
                : { scale: 1.01, y: -2 }
            }
            whileTap={
              shouldReduceMotion || isGeneratingList ? {} : { scale: 0.99 }
            }
            onClick={() => !isGeneratingList && onGenerateList?.()}
            className="relative overflow-hidden cursor-pointer rounded-2xl border-2 border-dashed border-eatrivo-purple/30 hover:border-eatrivo-purple/60 bg-gradient-to-br from-white via-purple-50/40 to-pink-50/30 transition-all duration-500 shadow-sm hover:shadow-md"
            role="button"
            tabIndex={0}
            aria-label={t("shoppingLists.createNew.title", {
              defaultValue: "Generate new shopping list",
            })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isGeneratingList) onGenerateList?.();
              }
            }}
          >
            {/* Decorative circles */}
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-xl bg-eatrivo-purple/5"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-xl bg-eatrivo-pink/5"
              aria-hidden="true"
            />

            <div className="relative flex flex-col sm:flex-row items-center gap-6 px-6 py-10 sm:py-8 z-10">
              {/* Left: Icon + Text */}
              <div className="flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-eatrivo-purple/10 flex items-center justify-center shrink-0"
                  animate={shouldReduceMotion ? {} : { rotate: [0, 6, -4, 0] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 4,
                    ease: "easeInOut",
                  }}
                >
                  <ShoppingCart className="w-7 h-7 text-eatrivo-purple" />
                </motion.div>

                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                    <p className="text-lg font-bold text-gray-900">
                      {t("shoppingLists.createNew.title", {
                        defaultValue: "Let me cook! 🍳",
                      })}
                    </p>
                    <motion.div
                      animate={
                        shouldReduceMotion
                          ? {}
                          : { rotate: [0, 15, -10, 15, 0] }
                      }
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        repeatDelay: 4,
                      }}
                    >
                      <Sparkles
                        className="w-5 h-5 text-eatrivo-purple/60"
                        aria-hidden="true"
                      />
                    </motion.div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-md">
                    {t("shoppingLists.createNew.subtitle", {
                      defaultValue:
                        "I'll create a personalized shopping list just for you",
                    })}
                  </p>
                </div>
              </div>

              {/* Right: Rivo mascot */}
              <motion.div
                className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 pointer-events-none"
                animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Image
                  src="/rivo/RIVO5-remove.png"
                  alt=""
                  width={112}
                  height={112}
                  className="object-contain drop-shadow-lg opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  aria-hidden="true"
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : isGeneratingList ? (
        /* Shopping list is being generated — clean light loader */
        <motion.div
          key="generating-list"
          {...fadeIn}
          className="relative overflow-hidden rounded-2xl border border-eatrivo-purple/15 bg-gradient-to-br from-white via-purple-50/50 to-eatrivo-pink/5 shadow-sm"
        >
          {/* Soft decorative blobs */}
          <div
            className="absolute w-32 h-32 bg-eatrivo-purple/5 rounded-full blur-2xl -top-10 -right-10"
            aria-hidden="true"
          />
          <div
            className="absolute w-24 h-24 bg-eatrivo-pink/5 rounded-full blur-2xl -bottom-8 -left-8"
            aria-hidden="true"
          />

          <div className="relative flex flex-col items-center justify-center text-center px-6 py-10 z-10">
            {/* Spinner */}
            <motion.div
              className="w-10 h-10 mb-5 rounded-full border-[3px] border-eatrivo-purple/15 border-t-eatrivo-purple"
              animate={shouldReduceMotion ? {} : { rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />

            {/* Progress bar */}
            <div className="w-full max-w-xs mx-auto mb-2">
              <div className="w-full bg-eatrivo-purple/10 rounded-full h-2 overflow-hidden relative">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink rounded-full"
                  animate={{ width: `${displayProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Percentage */}
            <p className="font-sans text-xs text-eatrivo-purple/50 tabular-nums mb-4">
              {Math.round(displayProgress)}%
            </p>

            {/* Label */}
            <AnimatePresence mode="wait">
              <motion.p
                key={generationLabel ?? "loading"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="font-heading text-sm font-semibold text-eatrivo-black-primary"
              >
                {generationLabel
                  ? t(`shoppingLists.createNew.${generationLabel}`)
                  : t("shoppingLists.createNew.loader.buildingPrompt")}
              </motion.p>
            </AnimatePresence>

            {/* Retry badge */}
            {retryCount > 0 && (
              <span className="mt-2 text-xs font-medium text-eatrivo-orange bg-eatrivo-orange/10 px-2.5 py-0.5 rounded-full">
                {t("shoppingLists.createNew.loader.retrying", {
                  count: retryCount,
                })}
              </span>
            )}
          </div>
        </motion.div>
      ) : meals.length === 0 ? (
        <motion.div
          key="empty"
          {...fadeIn}
          className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-gray-200"
        >
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <ChefHat className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t("mealPlan.empty.title")}
          </h3>
          <p className="text-sm text-gray-500 max-w-xs text-center mt-1">
            {t("mealPlan.empty.description")}
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          {...fadeIn}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        >
          {meals.map((meal) => (
            <ReceiptCard
              key={meal.id}
              icon={<ChefHat className="w-6 h-6 text-white" />}
              title={meal.title}
              description={meal.description}
              difficulty={meal.difficulty}
              cookTime={meal.cookTime}
              calories={meal.calories}
              protein={meal.protein}
              carbs={meal.carbs}
              fat={meal.fat}
              meal_type={meal.type}
              ingredients={meal.ingredients}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
