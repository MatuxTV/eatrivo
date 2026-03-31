"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ShoppingBag, Sparkles, Plus, Lock } from "lucide-react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import ShoppingListCard from "./ShoppingListCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShoppingList {
  id: string;
  title: string;
  description?: string;
  weekStartDate: string;
  weekEndDate: string;
  status:
    | "draft"
    | "active"
    | "approved"
    | "purchased"
    | "completed"
    | "cancelled";
  markdownContent?: string;
  createdAt: string;
}

interface ShoppingListsOverviewProps {
  lists: ShoppingList[];
  isLoading: boolean;
  membership?: string;
  onGenerateNew?: () => void;
  isGenerating?: boolean;
  onLockedCreate?: () => void;
  onStatusChange?: () => void;
}

// ─── Narrative loader phrases ─────────────────────────────────────────────────
// Per emotional-ux skill: "Never show a static loader. Use a Narrative Loader."

const LOADER_KEYS = [
  "loader.scanning",
  "loader.optimizing",
  "loader.finishing",
] as const;

// ─── CreateListCTA ────────────────────────────────────────────────────────────
// A full grid-card CTA with Rivo personality, glassmorphism, and spring physics.

export function CreateListCTA({
  isPremium,
  isGenerating,
  hasActiveList,
  onGenerate,
  onLockedCreate,
  className,
}: {
  isPremium: boolean;
  isGenerating: boolean;
  hasActiveList?: boolean;
  onGenerate?: () => void;
  onLockedCreate?: () => void;
  className?: string;
}) {
  const t = useTranslations("home");
  const shouldReduceMotion = useReducedMotion();
  const [loaderIndex, setLoaderIndex] = useState(0);

  // Cycle narrative loader text
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoaderIndex((prev) => (prev + 1) % LOADER_KEYS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Basic users are never blocked by hasActiveList — they just open the upgrade popup
  const isBlockedByActiveList = isPremium && hasActiveList;

  const handleClick = () => {
    if (isGenerating) return;
    if (!isPremium) {
      onLockedCreate?.();
      return;
    }
    if (isBlockedByActiveList) {
      toast.error(
        t("shoppingLists.createNew.completeActiveError", {
          defaultValue: "Please complete your active shopping list first! 🛒",
        }),
      );
      return;
    }
    onGenerate?.();
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
      }
      whileHover={
        shouldReduceMotion || isGenerating || isBlockedByActiveList
          ? {}
          : { scale: 1.02, y: -4 }
      }
      whileTap={
        shouldReduceMotion || isGenerating || isBlockedByActiveList
          ? {}
          : { scale: 0.97 }
      }
      onClick={handleClick}
      className={`relative group select-none flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 rounded-2xl h-full ${
        isBlockedByActiveList
          ? "cursor-not-allowed opacity-80"
          : "cursor-pointer"
      } ${className || ""}`}
      role="button"
      tabIndex={0}
      aria-label={
        isPremium
          ? t("shoppingLists.createNew.title", {
              defaultValue: "Generate new shopping list",
            })
          : t("shoppingLists.createNew.locked", {
              defaultValue: "Upgrade to Premium",
            })
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Animated glow ring */}
      {!isGenerating && (
        <motion.div
          className={`absolute -inset-[2px] rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
            isPremium ? "bg-eatrivo-purple/20" : "bg-amber-400/25"
          }`}
          animate={shouldReduceMotion ? {} : { opacity: [0, 0.3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
      )}

      {/* Card body */}
      <div
        className={`relative overflow-hidden flex-1 rounded-2xl border-2 transition-all duration-500 h-full ${
          isGenerating
            ? "bg-white border-eatrivo-purple/50 shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] ring-4 ring-eatrivo-purple/10 scale-[1.01]"
            : isPremium
              ? "bg-white border-eatrivo-purple/30 hover:border-eatrivo-purple/60 shadow-sm"
              : "bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-400/40 hover:border-amber-400/70 shadow-sm shadow-amber-100"
        }`}
      >
        {/* Animated Background when generating */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white overflow-hidden pointer-events-none z-0"
            >
              {/* Blurred animated dots */}
              <motion.div
                className="absolute w-24 h-24 bg-eatrivo-purple/40 rounded-full blur-2xl top-0 left-0"
                animate={{
                  x: [0, 60, -20, 0],
                  y: [0, 40, -40, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute w-32 h-32 bg-eatrivo-pink/30 rounded-full blur-3xl bottom-[-20%] right-[-10%]"
                animate={{
                  x: [0, -50, 20, 0],
                  y: [0, -50, 10, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute w-20 h-20 bg-eatrivo-blue/30 rounded-full blur-2xl top-[40%] left-[60%]"
                animate={{
                  x: [0, 30, -30, 0],
                  y: [0, -30, 30, 0],
                }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative px-6 py-12 md:p-5 h-full flex flex-col justify-center md:justify-between overflow-hidden z-10">
          {/* Decorative circles */}
          {!isGenerating && (
            <>
              <div
                className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-md ${
                  isPremium ? "bg-eatrivo-purple/5" : "bg-amber-400/10"
                }`}
                aria-hidden="true"
              />
              <div
                className={`absolute -bottom-4 -left-4 w-16 h-16 rounded-full blur-md ${
                  isPremium ? "bg-eatrivo-purple/5" : "bg-orange-400/10"
                }`}
                aria-hidden="true"
              />
            </>
          )}

          {/* Content */}
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center text-center h-full w-full relative z-30 px-2 py-4">
              <motion.div
                className="w-12 h-12 mb-4 rounded-full border-4 border-eatrivo-purple/20 border-t-eatrivo-purple drop-shadow-sm"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />

              <div className="h-7 overflow-hidden relative w-full mb-1">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loaderIndex}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 0, y: 15 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -15 }
                    }
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="text-base font-bold text-gray-900 absolute inset-0 flex items-center justify-center"
                  >
                    {t(`shoppingLists.createNew.${LOADER_KEYS[loaderIndex]}`, {
                      defaultValue:
                        loaderIndex === 0
                          ? "Scanning your pantry 🔍"
                          : loaderIndex === 1
                            ? "Optimizing macros 🧮"
                            : "Almost ready... ✨",
                    })}
                  </motion.p>
                </AnimatePresence>
              </div>

              <p className="text-[11px] md:text-xs text-gray-500/90 max-w-[220px] mb-5 leading-relaxed font-medium">
                {t("shoppingLists.createNew.sitTight", {
                  defaultValue:
                    "Crafting the perfect meal plan tailored for your body and goals.",
                })}
              </p>

              {/* Magical Progress pill */}
              <div className="w-32 h-1.5 bg-gray-100/80 rounded-full overflow-hidden relative shadow-inner">
                <motion.div
                  className="absolute inset-0 h-full bg-gradient-to-r from-eatrivo-purple via-eatrivo-pink to-eatrivo-purple rounded-full w-[200%]"
                  animate={
                    shouldReduceMotion
                      ? {}
                      : {
                          x: ["-50%", "0%"],
                        }
                  }
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="relative z-10 pr-24 md:pr-32">
                {/* Icon row */}
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className={`w-12 h-12 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${
                      isPremium ? "bg-eatrivo-purple/10" : "bg-amber-400/15"
                    }`}
                    animate={
                      shouldReduceMotion ? {} : { rotate: [0, 8, -5, 0] }
                    }
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 5,
                      ease: "easeInOut",
                    }}
                  >
                    {isPremium ? (
                      hasActiveList ? (
                        <Lock className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Plus
                          className="w-5 h-5 text-eatrivo-purple"
                          strokeWidth={2.5}
                        />
                      )
                    ) : (
                      <Lock className="w-4 h-4 text-amber-600" />
                    )}
                  </motion.div>

                  <motion.div
                    animate={
                      shouldReduceMotion ? {} : { rotate: [0, 15, -10, 15, 0] }
                    }
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      repeatDelay: 4,
                    }}
                  >
                    <Sparkles
                      className={`w-5 h-5 ${isPremium ? "text-eatrivo-purple/60" : "text-amber-500/80"}`}
                      aria-hidden="true"
                    />
                  </motion.div>

                  {/* PRO badge — only for locked state */}
                  {!isPremium && (
                    <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 ring-1 ring-amber-400/30">
                      PRO
                    </span>
                  )}
                </div>

                {/* Text */}
                <div>
                  <p
                    className={`text-lg md:text-base font-bold mb-2 md:mb-1 leading-snug ${
                      isPremium ? "text-gray-900" : "text-amber-800"
                    }`}
                  >
                    {isPremium
                      ? hasActiveList
                        ? t("shoppingLists.createNew.activeListExists", {
                            defaultValue: "Complete active list first! 🛒",
                          })
                        : t("shoppingLists.createNew.title", {
                            defaultValue: "Let me cook! 🍳",
                          })
                      : t("shoppingLists.createNew.locked", {
                          defaultValue: "Unlock with Premium 🔒",
                        })}
                  </p>
                  <p
                    className={`text-base md:text-sm leading-relaxed ${
                      isPremium ? "text-gray-500" : "text-amber-700/70"
                    }`}
                  >
                    {isPremium
                      ? hasActiveList
                        ? t(
                            "shoppingLists.createNew.activeListExistsSubtitle",
                            {
                              defaultValue:
                                "You can only have one active list at a time",
                            },
                          )
                        : t("shoppingLists.createNew.subtitle", {
                            defaultValue:
                              "I'll create a personalized shopping list just for you",
                          })
                      : t("shoppingLists.createNew.lockedSubtitle", {
                          defaultValue: "Generate unlimited AI shopping lists",
                        })}
                  </p>
                </div>
              </div>

              {/* Rivo mascot peeking from bottom-right */}
              <motion.div
                className="absolute -bottom-2 -right-2 w-28 h-28 md:w-32 md:h-32 z-10 pointer-events-none"
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
                  width={128}
                  height={128}
                  className="object-contain drop-shadow-lg opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  aria-hidden="true"
                />
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── ShoppingListsOverview ────────────────────────────────────────────────────

export default function ShoppingListsOverview({
  lists,
  isLoading,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isGenerating = false,
  membership = "basic",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onGenerateNew,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onLockedCreate,
  onStatusChange,
}: ShoppingListsOverviewProps) {
  const t = useTranslations("home");
  const [showAll, setShowAll] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isPremiumUser = ["premium", "pro", "trainer"].includes(
    membership.toLowerCase(),
  );

  // Filter lists - show only active by default
  const displayedLists = useMemo(() => {
    if (showAll) return lists;
    return lists.filter((list) =>
      ["draft", "active", "approved", "purchased"].includes(list.status),
    );
  }, [lists, showAll]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasActiveList = useMemo(() => {
    return lists.some((list) =>
      ["active", "approved", "purchased"].includes(list.status),
    );
  }, [lists]);

  const hasInactiveLists = lists.some(
    (list) =>
      !["draft", "active", "approved", "purchased"].includes(list.status),
  );

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-eatrivo-purple/10 rounded-xl text-eatrivo-purple">
            <ShoppingBag className="w-5 h-5" />
          </div>
          {t("shoppingLists.title")}
        </h2>
        <div className="flex items-center gap-3">
          {!isLoading && displayedLists.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full shadow-sm">
              {displayedLists.length}{" "}
              {displayedLists.length === 1
                ? t("shoppingLists.count.one")
                : displayedLists.length >= 2 && displayedLists.length <= 4
                  ? t("shoppingLists.count.few")
                  : t("shoppingLists.count.many")}
            </span>
          )}
          {!isLoading && hasInactiveLists && (
            <Button
              asChild
              onClick={() => setShowAll(!showAll)}
              size="sm"
              className="text-xs font-medium bg-eatrivo-purple "
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {showAll
                  ? t("shoppingLists.showActiveOnly")
                  : t("shoppingLists.showAll")}
              </motion.button>
            </Button>
          )}
          {/* Locked "Create List" button — visible for basic users — temporarily disabled */}
          {/* {!isLoading && !isPremiumUser && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onLockedCreate}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-amber-400/70 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-100"
            >
              <Lock className="h-3 w-3 shrink-0" />
              {t("shoppingLists.createNew.title", {
                defaultValue: "Create List",
              })}
              <span className="rounded-full bg-amber-400/25 px-1.5 py-px text-[10px] font-bold tracking-wide text-amber-600">
                PRO
              </span>
            </motion.button>
          )} */}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" as const }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-1/2 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <div className="pt-4 flex gap-3">
                  <Skeleton className="h-9 flex-1 rounded-lg" />
                  <Skeleton className="h-9 flex-1 rounded-lg" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : displayedLists.length > 0 ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" as const }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {displayedLists.map((list) => (
              <ShoppingListCard
                key={list.id}
                {...list}
                onStatusChange={onStatusChange}
              />
            ))}
          </motion.div>
        ) : lists.length > 0 ? (
          <motion.div
            key="noactive"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" as const }}
            className="space-y-6"
          >
            <Card className="bg-white border-dashed border-2 border-gray-200 shadow-none rounded-3xl overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <ShoppingBag className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t("shoppingLists.noActive.title")}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto leading-relaxed mb-4">
                  {t("shoppingLists.noActive.description")}
                </p>
                <Button
                  asChild
                  onClick={() => setShowAll(true)}
                  size="sm"
                  className="text-xs font-medium bg-eatrivo-purple "
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {t("shoppingLists.showAll")}
                  </motion.button>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" as const }}
            className="space-y-6"
          >
            <Card className="bg-white border-dashed border-2 border-gray-200 shadow-none rounded-3xl overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <ShoppingBag className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t("shoppingLists.empty.title")}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto leading-relaxed mb-4">
                  {t("shoppingLists.empty.description")}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
