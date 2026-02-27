"use client";

import { useState, useEffect } from "react";
import { ChefHat, ShoppingCart, Sparkles } from "lucide-react";
import ReceiptCard from "@/components/dashboard/ReceiptCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Ingredient } from "@/types/meal-plan";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";

const LOADER_KEYS = [
  "shoppingLists.createNew.loader.scanning",
  "shoppingLists.createNew.loader.optimizing",
  "shoppingLists.createNew.loader.finishing",
] as const;

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
  /** Whether a shopping list is currently being generated */
  isGeneratingList?: boolean;
  /** Callback to generate a new shopping list */
  onGenerateList?: () => void;
}

export default function DailyMealPlan({
  meals,
  isLoading,
  hasActiveShoppingList = true,
  isGeneratingList = false,
  onGenerateList,
}: DailyMealPlanProps) {
  const t = useTranslations("dashboard");
  const shouldReduceMotion = useReducedMotion();
  const [loaderIndex, setLoaderIndex] = useState(0);

  useEffect(() => {
    if (!isGeneratingList) { setLoaderIndex(0); return; }
    const interval = setInterval(() => {
      setLoaderIndex((prev) => (prev + 1) % LOADER_KEYS.length);
    }, 2800);
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
      ) : !hasActiveShoppingList && !isGeneratingList ? (
        /* No active shopping list — show CTA to create one */
        <motion.div
          key="no-shopping-list"
          {...fadeIn}
          className="relative group"
        >
          <motion.div
            whileHover={shouldReduceMotion || isGeneratingList ? {} : { scale: 1.01, y: -2 }}
            whileTap={shouldReduceMotion || isGeneratingList ? {} : { scale: 0.99 }}
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
              className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-xl bg-pink-400/5"
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
                      animate={shouldReduceMotion ? {} : { rotate: [0, 15, -10, 15, 0] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        repeatDelay: 4,
                      }}
                    >
                      <Sparkles className="w-5 h-5 text-eatrivo-purple/60" aria-hidden="true" />
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
        /* Shopping list is being generated — show generating state in meals area */
        <motion.div
          key="generating-list"
          {...fadeIn}
          className="relative overflow-hidden rounded-2xl border-2 border-eatrivo-purple/50 bg-white shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] ring-4 ring-eatrivo-purple/10"
        >
          {/* Animated background blobs */}
          <motion.div
            className="absolute w-24 h-24 bg-purple-300/40 rounded-full blur-2xl top-0 left-0"
            animate={{ x: [0, 60, -20, 0], y: [0, 40, -40, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-32 h-32 bg-pink-300/30 rounded-full blur-3xl bottom-[-20%] right-[-10%]"
            animate={{ x: [0, -50, 20, 0], y: [0, -50, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative flex flex-col items-center justify-center text-center px-6 py-12 z-10">
            <motion.div
              className="w-12 h-12 mb-4 rounded-full border-4 border-eatrivo-purple/20 border-t-eatrivo-purple drop-shadow-sm"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <div className="h-7 overflow-hidden relative w-full mb-1">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loaderIndex}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-base font-bold text-gray-900 absolute inset-0 flex items-center justify-center"
                >
                  {t(LOADER_KEYS[loaderIndex])}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="text-xs text-gray-500/90 max-w-[260px] mb-5 leading-relaxed font-medium">
              {t("shoppingLists.createNew.sitTight", {
                defaultValue:
                  "Crafting the perfect meal plan tailored for your body and goals.",
              })}
            </p>
            <div className="w-32 h-1.5 bg-gray-100/80 rounded-full overflow-hidden relative shadow-inner">
              <motion.div
                className="absolute inset-0 h-full bg-gradient-to-r from-eatrivo-purple via-pink-400 to-eatrivo-purple rounded-full w-[200%]"
                animate={shouldReduceMotion ? {} : { x: ["-50%", "0%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </div>
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
