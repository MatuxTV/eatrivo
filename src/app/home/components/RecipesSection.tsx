"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  CookingPot,
  ChefHat,
  Clock,
  Flame,
  Archive,
  Leaf,
  Beef,
  Salad,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Droplets,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type {
  CustomRecipeHeroSnapshot,
  RivoCustomRecipeExperienceHandle,
} from "./RivoCustomRecipeExperience";
import type { BasicHomeRecipePreview } from "@/app/[locale]/home/page";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

const RivoCustomRecipeExperience = dynamic(
  () => import("./RivoCustomRecipeExperience"),
  {
    ssr: false,
  },
);
const RecipeBrowserDialog = dynamic(() => import("./RecipeBrowserDialog"), {
  ssr: false,
});

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const RECIPE_TAG_TRANSLATION_KEYS: Record<string, string> = {
  all: "basic.recipeTags.all",
  "high-protein": "basic.recipeTags.high-protein",
  vegetarian: "basic.recipeTags.vegetarian",
  vegan: "basic.recipeTags.vegan",
  pescatarian: "basic.recipeTags.pescatarian",
  paleo: "basic.recipeTags.paleo",
  "gluten-free": "basic.recipeTags.gluten-free",
  "dairy-free": "basic.recipeTags.dairy-free",
  ketogenic: "basic.recipeTags.ketogenic",
  quick: "basic.recipeTags.quick",
} as const;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RecipesSectionProps {
  featuredRecipes: BasicHomeRecipePreview[];
  livePantryNames: string[];
  livePantrySummary: { itemCount: number; cookableCount: number };
  liveCookableRecipes: BasicHomeRecipePreview[];
  liveAlmostCookableRecipes: BasicHomeRecipePreview[];
  customRecipeState: CustomRecipeHeroSnapshot;
  onCustomRecipeStateChange: (next: CustomRecipeHeroSnapshot) => void;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  onOpenPantrySection: () => void;
  onAddToShoppingList: (name: string, qty: string | null, cat: string | null) => Promise<void>;
  onCookRecipe: (recipe: BasicHomeRecipePreview) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RecipesSection({
  featuredRecipes,
  livePantryNames,
  livePantrySummary,
  liveCookableRecipes,
  liveAlmostCookableRecipes,
  customRecipeState,
  onCustomRecipeStateChange,
  selectedFilter,
  onFilterChange,
  onOpenPantrySection,
  onAddToShoppingList,
  onCookRecipe,
}: RecipesSectionProps) {
  const t = useTranslations("home");
  const triggerHaptic = useHapticFeedback();
  const almostCookableScrollRef = useRef<HTMLDivElement | null>(null);
  const rivoCustomRecipeRef = useRef<RivoCustomRecipeExperienceHandle | null>(null);

  /* ---- internal browser state ---- */

  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserSource, setBrowserSource] = useState<"featured" | "cookable" | "almost" | "filtered" | null>(null);
  const [browserIndex, setBrowserIndex] = useState(0);

  const openRecipeBrowser = useCallback(
    (source: "featured" | "cookable" | "almost" | "filtered", index: number) => {
      setBrowserSource(source);
      setBrowserIndex(index);
      setBrowserOpen(true);
    },
    [],
  );

  /* ---- recipe enrichment ---- */

  const pantryNameSet = useMemo(
    () => new Set(livePantryNames.map((n) => n.toLowerCase().trim())),
    [livePantryNames],
  );

  const enrichRecipes = useCallback(
    (recipes: BasicHomeRecipePreview[]): BasicHomeRecipePreview[] =>
      recipes.map((recipe) => {
        if (recipe.matchedIngredients !== undefined || recipe.missingIngredients !== undefined) {
          return recipe;
        }
        const allIngredients = [...recipe.ingredientPreview, ...(recipe.missingIngredients ?? [])];
        const matched: string[] = [];
        const missing: string[] = [];
        for (const ing of allIngredients) {
          if (pantryNameSet.has(ing.toLowerCase().trim())) matched.push(ing);
          else missing.push(ing);
        }
        return { ...recipe, ingredientPreview: matched, missingIngredients: missing };
      }),
    [pantryNameSet],
  );

  const enrichedFeaturedRecipes = useMemo(() => enrichRecipes(featuredRecipes), [enrichRecipes, featuredRecipes]);
  const enrichedCookableRecipes = useMemo(() => liveCookableRecipes, [liveCookableRecipes]);
  const enrichedAlmostCookableRecipes = useMemo(() => liveAlmostCookableRecipes, [liveAlmostCookableRecipes]);

  const filteredRecipes = useMemo(() => {
    if (selectedFilter === "all") return enrichedFeaturedRecipes;
    if (selectedFilter === "quick") return enrichedFeaturedRecipes.filter((r) => r.totalTimeMin <= 20);
    return enrichedFeaturedRecipes.filter((r) => r.dietTags.includes(selectedFilter));
  }, [enrichedFeaturedRecipes, selectedFilter]);

  const availableFilters = useMemo(() => {
    const tagSet = new Set<string>(["all"]);
    for (const recipe of enrichedFeaturedRecipes) {
      if (recipe.totalTimeMin <= 20) tagSet.add("quick");
      for (const tag of recipe.dietTags) tagSet.add(tag);
    }
    return [...tagSet].slice(0, 6);
  }, [enrichedFeaturedRecipes]);

  const getRecipeTagLabel = useCallback(
    (tag: string): string => {
      const key = RECIPE_TAG_TRANSLATION_KEYS[tag as keyof typeof RECIPE_TAG_TRANSLATION_KEYS];
      return key ? t(key) : tag.replace(/-/g, " ");
    },
    [t],
  );

  /* ---- browser recipes ---- */

  const browserRecipes = useMemo(() => {
    switch (browserSource) {
      case "featured": return enrichedFeaturedRecipes;
      case "cookable": return enrichedCookableRecipes;
      case "almost": return enrichedAlmostCookableRecipes;
      case "filtered": return filteredRecipes;
      default: return [];
    }
  }, [browserSource, enrichedFeaturedRecipes, enrichedCookableRecipes, enrichedAlmostCookableRecipes, filteredRecipes]);

  const handleCookRecipeInternal = useCallback(
    (recipe: BasicHomeRecipePreview) => {
      setBrowserOpen(false);
      onCookRecipe(recipe);
    },
    [onCookRecipe],
  );

  /* ---- active recipe ---- */

  const activeRecipe = filteredRecipes[0] ?? enrichedFeaturedRecipes[0] ?? null;
  const activeRecipeBrowserSource: "filtered" | "featured" = filteredRecipes.length > 0 ? "filtered" : "featured";

  const activeRecipeBrowserIndex = useMemo(() => {
    if (!activeRecipe) return -1;
    const sourceRecipes = activeRecipeBrowserSource === "filtered" ? filteredRecipes : enrichedFeaturedRecipes;
    return sourceRecipes.findIndex((r) => r.id === activeRecipe.id);
  }, [activeRecipe, activeRecipeBrowserSource, enrichedFeaturedRecipes, filteredRecipes]);

  /* ---- custom recipe hero derivations ---- */

  const isCustomRecipeHeroActive = customRecipeState.status !== "idle";
  const shouldShowCustomRecipePantryCta =
    customRecipeState.status === "fallback-empty" || customRecipeState.status === "error";

  const customRecipeHeroBadge =
    customRecipeState.status === "generating" ? t("basic.customRecipe.loading.badge")
    : customRecipeState.status === "success" ? t("basic.customRecipe.result.badge")
    : customRecipeState.status === "fallback-empty" ? t("basic.customRecipe.fallback.badge")
    : customRecipeState.status === "error" ? t("basic.customRecipe.error.badge")
    : t("basic.customRecipe.badge");

  const customRecipeHeroTitle =
    customRecipeState.status === "generating" ? t("basic.customRecipe.loading.title")
    : customRecipeState.status === "success" ? t("basic.customRecipe.result.title")
    : customRecipeState.status === "fallback-empty" ? t("basic.customRecipe.fallback.title")
    : customRecipeState.status === "error" ? t("basic.customRecipe.error.title")
    : t("basic.customRecipe.title");

  const customRecipeHeroDescription =
    customRecipeState.status === "generating" ? t("basic.customRecipe.loading.description")
    : customRecipeState.status === "success" && customRecipeState.result
      ? t("basic.customRecipe.result.description", { count: customRecipeState.result.recipes.length })
    : customRecipeState.status === "fallback-empty" ? t("basic.customRecipe.fallback.description")
    : customRecipeState.status === "error" ? t("basic.customRecipe.error.description")
    : t("basic.customRecipe.description");

  const CustomRecipeHeroIcon =
    customRecipeState.status === "error" ? AlertCircle
    : customRecipeState.status === "success" ? ChefHat
    : Sparkles;

  const customRecipeHeroIconClasses =
    customRecipeState.status === "generating" ? "bg-eatrivo-purple/10 text-eatrivo-purple"
    : customRecipeState.status === "success" ? "bg-eatrivo-green/10 text-eatrivo-green"
    : customRecipeState.status === "fallback-empty" ? "bg-eatrivo-orange/10 text-eatrivo-orange"
    : customRecipeState.status === "error" ? "bg-eatrivo-red/10 text-eatrivo-red"
    : "bg-eatrivo-blue/10 text-eatrivo-blue";

  const customRecipeHeroBadgeClasses =
    customRecipeState.status === "generating" ? "border border-eatrivo-purple/15 bg-eatrivo-purple/5 text-eatrivo-purple"
    : customRecipeState.status === "success" ? "border border-eatrivo-green/15 bg-eatrivo-green/5 text-eatrivo-green"
    : customRecipeState.status === "fallback-empty" ? "border border-eatrivo-orange/15 bg-eatrivo-orange/5 text-eatrivo-orange"
    : customRecipeState.status === "error" ? "border border-eatrivo-red/15 bg-eatrivo-red/5 text-eatrivo-red"
    : "border border-eatrivo-blue/15 bg-eatrivo-blue/5 text-eatrivo-blue";

  const customRecipeHeroCtaLabel =
    customRecipeState.status === "generating" ? t("basic.customRecipe.ctaGenerating")
    : customRecipeState.status === "fallback-empty" ? t("basic.customRecipe.fallback.retry")
    : customRecipeState.status === "error" ? t("basic.customRecipe.error.retry")
    : customRecipeState.status === "success" ? t("basic.customRecipe.result.regenerate")
    : t("basic.customRecipe.cta");

  const customRecipeFeaturedRecipe =
    customRecipeState.status === "success" ? customRecipeState.result?.recipes[0] ?? null : null;

  const customRecipeFeaturedRecipeStatusLabel = customRecipeFeaturedRecipe?.missingIngredients?.length
    ? t("basic.customRecipe.result.almostCookable")
    : t("basic.customRecipe.result.readyNow");

  const customRecipeFallbackCards =
    customRecipeState.status === "fallback-empty" ? customRecipeState.fallbackRecommendations.slice(0, 2) : [];

  /* ---- hero callbacks ---- */

  const handleHeroCustomRecipeClick = useCallback(() => {
    rivoCustomRecipeRef.current?.generate();
  }, []);

  const handleHeroOpenCustomRecipeResult = useCallback((index: number) => {
    rivoCustomRecipeRef.current?.openResultRecipe(index);
  }, []);

  const handleHeroOpenFallbackRecipe = useCallback((recommendationId: string) => {
    rivoCustomRecipeRef.current?.openFallbackRecipe(recommendationId);
  }, []);

  const handleHeroOpenCustomRecipePantry = useCallback(() => {
    if (rivoCustomRecipeRef.current) {
      rivoCustomRecipeRef.current.openPantry();
      return;
    }
    onOpenPantrySection();
  }, [onOpenPantrySection]);

  const scrollAlmostCookableRecipes = useCallback((direction: 1 | -1) => {
    almostCookableScrollRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }, []);

  /* ---- render ---- */

  return (
    <motion.div
      key="home-recipes"
      initial={{ opacity: 0, y: 16, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.992 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ---- Hero Card ---- */}
      <div className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-md sm:mb-8 xl:min-h-[380px]">
        {isCustomRecipeHeroActive ? (
          <div className="relative flex h-full min-h-[300px] w-full flex-col bg-white text-gray-900 sm:min-h-[360px]">
            <div className="flex h-full flex-col gap-5 px-4 pb-4 pt-5 sm:gap-6 sm:px-7 sm:pb-7 sm:pt-7">
              {customRecipeState.status !== "success" && customRecipeState.status !== "fallback-empty" ? (
                <div className="flex items-start gap-3">
                  <div className={`rounded-[1.1rem] p-2 shadow-sm ${customRecipeHeroIconClasses}`}>
                    <CustomRecipeHeroIcon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${customRecipeHeroBadgeClasses}`}>
                      {customRecipeHeroBadge}
                    </span>
                    <div className="space-y-1">
                      <h2 className="text-xl font-black tracking-tight text-[#172033] sm:text-3xl lg:text-4xl">
                        {customRecipeHeroTitle}
                      </h2>
                      <p className="max-w-2xl text-sm text-gray-600 sm:text-[15px]">
                        {customRecipeHeroDescription}
                      </p>
                      {customRecipeState.userMessage ? (
                        <p className="max-w-2xl text-sm text-gray-500">{customRecipeState.userMessage}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Generating progress */}
              {customRecipeState.status === "generating" ? (
                <div className="space-y-4" role="status" aria-live="polite">
                  <div className="rounded-[1.5rem] border border-eatrivo-purple/10 bg-eatrivo-white-secondary p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        {t("basic.customRecipe.loading.progressLabel")}
                      </span>
                      <span className="text-sm font-bold text-eatrivo-purple">
                        {Math.round(customRecipeState.progress)}%
                      </span>
                    </div>
                    <div
                      className="mt-3 h-2 rounded-full bg-white"
                      role="progressbar"
                      aria-label={t("basic.customRecipe.loading.progressLabel")}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(customRecipeState.progress)}
                    >
                      <motion.div
                        className="h-full rounded-full bg-eatrivo-purple"
                        animate={{ width: `${Math.max(customRecipeState.progress, 8)}%` }}
                        style={{ width: `${Math.max(customRecipeState.progress, 8)}%` }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      />
                    </div>
                    <div className="mt-4 rounded-[1.2rem] border border-eatrivo-purple/10 bg-eatrivo-purple/5 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        {t("basic.customRecipe.loading.tipsLabel")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 sm:text-[15px]">
                        {customRecipeState.displayTip}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Success featured recipe */}
              {customRecipeState.status === "success" && customRecipeFeaturedRecipe ? (
                <div className="relative flex min-h-[300px] flex-col sm:min-h-[360px]">
                  <button
                    type="button"
                    onClick={() => handleHeroOpenCustomRecipeResult(0)}
                    className="relative flex flex-1 flex-col gap-4 rounded-[1.5rem] text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eatrivo-purple/20 sm:gap-6"
                  >
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${customRecipeHeroBadgeClasses}`}>
                          {customRecipeHeroBadge}
                        </span>
                        <div className="rounded-[1.1rem] border border-gray-200 bg-eatrivo-white-secondary/50 p-1.5 shadow-sm sm:rounded-[1.4rem] sm:p-2">
                          <CookingPot className="h-5 w-5 text-emerald-600 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                        </div>
                      </div>
                      <h2 className="w-full text-2xl font-black tracking-tight text-balance text-[#172033] sm:text-4xl lg:text-5xl">
                        {customRecipeFeaturedRecipe.title}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-gray-600 sm:gap-x-5 sm:text-sm lg:text-[15px]">
                      <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{customRecipeFeaturedRecipe.totalTimeMin} {t("time.minutesShort")}</span>
                      <span className="flex items-center gap-1.5"><Flame className="h-4 w-4" />{customRecipeFeaturedRecipe.calories} kcal</span>
                      <span className="flex items-center gap-1.5"><ChefHat className="h-4 w-4" />{customRecipeFeaturedRecipeStatusLabel}</span>
                    </div>
                    <div className="h-px w-full bg-gray-200" />
                    <div className="flex flex-1 flex-col justify-between gap-4 sm:gap-6">
                      <div className="flex justify-center">
                        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[8px] border-emerald-400 bg-white shadow-sm sm:h-36 sm:w-36 sm:border-[9px] lg:h-44 lg:w-44 lg:border-[10px]">
                          <div className="absolute inset-[8px] rounded-full border border-gray-100 bg-white sm:inset-[10px] lg:inset-[12px]" />
                          <div className="relative z-10 flex flex-col items-center justify-center text-[#172033]">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 sm:text-[11px] sm:tracking-[0.22em]">kcal</span>
                            <span className="text-3xl font-black leading-none tracking-tight sm:text-4xl">{customRecipeFeaturedRecipe.calories}</span>
                          </div>
                        </div>
                      </div>
                      <NutritionGrid
                        proteinG={customRecipeFeaturedRecipe.proteinG}
                        carbsG={customRecipeFeaturedRecipe.carbsG}
                        fatG={customRecipeFeaturedRecipe.fatG}
                      />
                    </div>
                  </button>
                </div>
              ) : null}

              {/* Fallback empty */}
              {customRecipeState.status === "fallback-empty" ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-black tracking-tight text-[#172033] sm:text-3xl lg:text-4xl">
                    {customRecipeHeroTitle}
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {customRecipeFallbackCards.map((recommendation) => (
                      <button
                        type="button"
                        key={"id" in recommendation && recommendation.id ? recommendation.id : recommendation.title}
                        onClick={() => {
                          if ("id" in recommendation && recommendation.id) handleHeroOpenFallbackRecipe(recommendation.id);
                        }}
                        disabled={!("id" in recommendation && recommendation.id)}
                        className="rounded-[1.4rem] border border-eatrivo-orange/10 bg-eatrivo-orange/5 p-4 text-left transition-colors hover:border-eatrivo-orange/30 disabled:cursor-default disabled:hover:border-eatrivo-orange/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">{recommendation.title}</p>
                          {"category" in recommendation && recommendation.category ? (
                            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-eatrivo-orange ring-1 ring-eatrivo-orange/10">
                              {recommendation.category}
                            </span>
                          ) : null}
                        </div>
                        {"availability" in recommendation && recommendation.availability ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-eatrivo-purple/10 px-2.5 py-1 text-xs font-medium text-eatrivo-purple">
                              {recommendation.availability === "pantry"
                                ? t("basic.customRecipe.result.readyNow")
                                : t("basic.customRecipe.fallback.missingCount", { count: recommendation.missingCount ?? 0 })}
                            </span>
                            {recommendation.totalTimeMin ? (
                              <span className="rounded-full bg-eatrivo-orange/10 px-2.5 py-1 text-xs font-medium text-eatrivo-orange">
                                {recommendation.totalTimeMin} {t("time.minutesShort")}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Error */}
              {customRecipeState.status === "error" ? (
                <div className="rounded-[1.4rem] border border-eatrivo-red/10 bg-eatrivo-red/5 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    {t("basic.customRecipe.error.detailLabel")}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">{customRecipeState.error}</p>
                </div>
              ) : null}

              {/* CTA buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={handleHeroCustomRecipeClick}
                  disabled={customRecipeState.status === "generating"}
                  className="h-11 rounded-[1.1rem] bg-eatrivo-purple px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-eatrivo-purple/90 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 sm:h-12 sm:rounded-[1.25rem]"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {customRecipeHeroCtaLabel}
                </Button>
                {shouldShowCustomRecipePantryCta ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleHeroOpenCustomRecipePantry}
                    className="h-11 rounded-[1.1rem] border border-gray-200 text-gray-700 hover:bg-eatrivo-white-secondary focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 sm:h-12 sm:rounded-[1.25rem]"
                  >
                    {t("basic.customRecipe.fallback.openPantry")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : activeRecipe ? (
          <div className="relative flex h-full min-h-[300px] w-full flex-col bg-white text-gray-900 sm:min-h-[360px]">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                openRecipeBrowser(activeRecipeBrowserSource, activeRecipeBrowserIndex !== -1 ? activeRecipeBrowserIndex : 0);
              }}
              className="relative flex flex-1 flex-col gap-4 px-4 pb-3 pt-5 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eatrivo-purple/20 sm:gap-6 sm:px-7 sm:pb-4 sm:pt-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[12rem] space-y-2 sm:max-w-[20rem] sm:space-y-3 lg:max-w-[24rem]">
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-emerald-700 sm:px-3 sm:py-1.5 sm:text-[11px]">
                    {t("basic.hero.badge")}
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-balance text-[#172033] sm:text-4xl lg:text-5xl">
                    {activeRecipe.title}
                  </h2>
                </div>
                <div className="rounded-[1.1rem] border border-gray-200 bg-eatrivo-white-secondary/50 p-1.5 shadow-sm sm:rounded-[1.4rem] sm:p-2">
                  <CookingPot className="h-5 w-5 text-emerald-600 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-gray-600 sm:gap-x-5 sm:text-sm lg:text-[15px]">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{activeRecipe.totalTimeMin} {t("time.minutesShort")}</span>
                <span className="flex items-center gap-1.5"><Flame className="h-4 w-4" />{activeRecipe.calories} kcal</span>
                <span className="flex items-center gap-1.5"><ChefHat className="h-4 w-4" />{activeRecipe.mealPrepFriendly ? t("basic.hero.mealPrep") : activeRecipe.category}</span>
              </div>
              <div className="h-px w-full bg-gray-200" />
              <div className="flex flex-1 flex-col justify-between gap-4 sm:gap-6">
                <div className="flex justify-center">
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[8px] border-emerald-400 bg-white shadow-sm sm:h-36 sm:w-36 sm:border-[9px] lg:h-44 lg:w-44 lg:border-[10px]">
                    <div className="absolute inset-[8px] rounded-full border border-gray-100 bg-white sm:inset-[10px] lg:inset-[12px]" />
                    <div className="relative z-10 flex flex-col items-center justify-center text-[#172033]">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 sm:text-[11px] sm:tracking-[0.22em]">kcal</span>
                      <span className="text-3xl font-black leading-none tracking-tight sm:text-4xl">{activeRecipe.calories}</span>
                    </div>
                  </div>
                </div>
                <NutritionGrid proteinG={activeRecipe.proteinG} carbsG={activeRecipe.carbsG} fatG={activeRecipe.fatG} />
              </div>
            </button>
            <div className="px-4 pb-4 sm:px-7 sm:pb-7">
              <Button
                type="button"
                onClick={handleHeroCustomRecipeClick}
                className="h-11 w-full rounded-[1.1rem] bg-eatrivo-purple px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-eatrivo-purple/90 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 sm:h-12 sm:rounded-[1.25rem]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {customRecipeHeroCtaLabel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col justify-center gap-5 rounded-[1.5rem] border border-gray-100 bg-white p-6 text-center sm:min-h-[360px] sm:p-8">
            <div>
              <Sparkles className="mx-auto mb-4 h-10 w-10 text-eatrivo-purple" />
              <h2 className="mb-2 text-xl font-semibold text-gray-900">{t("mealPlan.empty.title")}</h2>
              <p className="text-gray-500">{t("mealPlan.empty.description")}</p>
            </div>
            <Button
              type="button"
              onClick={handleHeroCustomRecipeClick}
              className="h-11 rounded-[1.1rem] bg-eatrivo-purple px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-eatrivo-purple/90 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 sm:h-12 sm:rounded-[1.25rem]"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {customRecipeHeroCtaLabel}
            </Button>
          </div>
        )}
      </div>

      <RivoCustomRecipeExperience
        onOpenPantry={onOpenPantrySection}
        ref={rivoCustomRecipeRef}
        onAddToShoppingList={onAddToShoppingList}
        onCookRecipe={onCookRecipe}
        onStateChange={onCustomRecipeStateChange}
        showPanel={false}
      />

      {/* ---- Pantry Dashboard ---- */}
      <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 group transition-colors hover:border-gray-200 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-eatrivo-purple mb-4">
              <div className="p-2 bg-eatrivo-purple/10 rounded-lg"><Archive className="w-4 h-4" /></div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{t("basic.pantryDashboard.badge")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-none mb-2">
              {livePantrySummary.itemCount}{" "}
              <span className="text-gray-400 font-medium">{t("basic.pantryDashboard.itemsUnit")}</span>
            </h2>
            <p className="text-sm text-gray-500">
              {t("basic.pantryDashboard.cookablePrefix")}
              <strong className="text-eatrivo-purple font-semibold">{livePantrySummary.cookableCount}</strong>
              {t("basic.pantryDashboard.cookableSuffix")}
            </p>
          </div>
          <div className="hidden md:block shrink-0">
            <button
              type="button"
              onClick={onOpenPantrySection}
              className="px-6 py-2.5 rounded-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white text-sm font-bold shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
            >
              {t("basic.pantryDashboard.openCta")}
              <span className="text-white/50 text-[10px] ml-1">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Cookable Recipes Carousel */}
        <div className="relative z-10 -mx-6 sm:-mx-8 px-6 sm:px-8">
          {enrichedCookableRecipes.length > 0 ? (
            <div className="flex overflow-x-auto gap-4 pb-6 snap-x hide-scrollbar" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
              {enrichedCookableRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="min-w-[140px] max-w-[140px] flex flex-col gap-3 snap-start cursor-pointer group/recipe"
                  onClick={() => {
                    const idx = enrichedCookableRecipes.findIndex((r) => r.id === recipe.id);
                    openRecipeBrowser("cookable", idx !== -1 ? idx : 0);
                  }}
                >
                  <div className="w-full aspect-[4/5] rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex flex-col justify-between group-hover/recipe:scale-[1.03] group-hover/recipe:-translate-y-1 group-hover/recipe:border-gray-200 group-hover/recipe:shadow-md transition-all duration-300 ease-out">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-eatrivo-purple bg-eatrivo-purple/10 px-2 py-1 rounded-md">{recipe.category}</span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md"><Clock className="w-3 h-3 text-gray-400" />{recipe.totalTimeMin}</div>
                    </div>
                    <div className="mt-auto">
                      <h4 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 mb-3 group-hover/recipe:text-eatrivo-purple transition-colors">{recipe.title}</h4>
                      <div className="flex items-baseline gap-1.5"><p className="text-xl font-bold leading-none text-gray-900">{recipe.proteinG}g</p></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6 rounded-2xl bg-white border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4"><Archive className="w-5 h-5 text-gray-400" /></div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{t("basic.cookableEmpty.title")}</p>
              <p className="text-xs text-gray-500 max-w-[250px]">{t("basic.cookableEmpty.description")}</p>
            </div>
          )}
        </div>

        {/* Almost Cookable */}
        {enrichedAlmostCookableRecipes.length > 0 && (
          <div className="relative z-10 mt-2">
            <div className="flex items-center justify-between gap-3 mb-4 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <h3 className="text-sm font-bold text-gray-900">{t("basic.almostCookable.title")}</h3>
                <span className="text-[11px] font-bold text-gray-400 truncate">{t("basic.almostCookable.subtitle")}</span>
              </div>
              {enrichedAlmostCookableRecipes.length > 1 ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => scrollAlmostCookableRecipes(-1)} className="h-7 w-7 rounded-full border border-amber-200 bg-white text-amber-600 shadow-sm transition-all hover:bg-amber-50 active:scale-95 flex items-center justify-center" aria-label={t("basic.almostCookable.scrollLeft")}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => scrollAlmostCookableRecipes(1)} className="h-7 w-7 rounded-full border border-amber-200 bg-white text-amber-600 shadow-sm transition-all hover:bg-amber-50 active:scale-95 flex items-center justify-center" aria-label={t("basic.almostCookable.scrollRight")}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
            <div ref={almostCookableScrollRef} className="flex overflow-x-auto gap-4 pb-4 -mx-6 sm:-mx-8 px-6 sm:px-8 snap-x hide-scrollbar" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
              {enrichedAlmostCookableRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="min-w-[160px] max-w-[160px] flex flex-col gap-3 snap-start cursor-pointer group/almost"
                  onClick={() => {
                    const idx = enrichedAlmostCookableRecipes.findIndex((r) => r.id === recipe.id);
                    openRecipeBrowser("almost", idx !== -1 ? idx : 0);
                  }}
                >
                  <div className="w-full aspect-[4/5] rounded-2xl bg-white border border-amber-100 shadow-sm p-4 flex flex-col justify-between group-hover/almost:scale-[1.03] group-hover/almost:-translate-y-1 group-hover/almost:border-amber-200 transition-all duration-300 ease-out">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-600 bg-amber-50 px-2 py-1 rounded-md">{recipe.category}</span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md"><Clock className="w-3 h-3 text-gray-400" />{recipe.totalTimeMin}</div>
                    </div>
                    <div className="mt-auto">
                      <h4 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 mb-2 group-hover/almost:text-amber-600 transition-colors">{recipe.title}</h4>
                      {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {recipe.missingIngredients.slice(0, 2).map((ing) => (
                            <span key={ing} className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md truncate max-w-[90px]">&minus; {ing}</span>
                          ))}
                          {recipe.missingIngredients.length > 2 && (
                            <span className="text-[9px] font-bold text-amber-500">+{recipe.missingIngredients.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile CTA */}
        <div className="md:hidden mt-2 relative z-10">
          <button
            type="button"
            onClick={onOpenPantrySection}
            className="w-full py-3 rounded-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white text-sm font-bold shadow-sm active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {t("basic.pantryDashboard.openCta")}
          </button>
        </div>
      </div>

      {/* ---- Quick Filters ---- */}
      <div className="pb-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3 px-1">{t("basic.filters.title")}</h3>
        <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar whitespace-nowrap px-1" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {availableFilters.map((filter) => {
            const isSelected = selectedFilter === filter;
            const icon = filter === "quick" ? Clock : filter === "high-protein" ? Beef : filter === "vegetarian" || filter === "vegan" ? Leaf : filter === "all" ? Salad : Flame;
            const Icon = icon;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => onFilterChange(filter)}
                className={`px-5 py-2.5 rounded-full text-[13px] font-bold flex items-center gap-2 transition-all duration-300 ease-out active:scale-95 border ${
                  isSelected
                    ? "bg-eatrivo-purple text-white border-eatrivo-purple shadow-lg shadow-eatrivo-purple/20"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {getRecipeTagLabel(filter)}
                <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-400"}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Filtered Recipes Grid ---- */}
      <div className="pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex flex-col gap-2 cursor-pointer"
              onClick={() => {
                const idx = filteredRecipes.findIndex((r) => r.id === recipe.id);
                openRecipeBrowser("filtered", idx !== -1 ? idx : 0);
              }}
            >
              <div className="w-full aspect-[4/5] rounded-[1.5rem] overflow-hidden shadow-lg shadow-eatrivo-purple/5 bg-white p-5 flex flex-col justify-between group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-500 ease-out group-hover:shadow-eatrivo-purple/15 ring-1 ring-gray-100">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-eatrivo-purple bg-eatrivo-purple/10 px-2.5 py-1.5 rounded-md">{recipe.category}</span>
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md"><Clock className="w-3.5 h-3.5 text-gray-400" />{recipe.totalTimeMin} {t("time.minutesShort")}</div>
                </div>
                <div className="mt-auto">
                  <h4 className="text-base font-bold text-gray-900 leading-tight line-clamp-2 mb-4 group-hover:text-eatrivo-purple transition-colors">{recipe.title}</h4>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-bold text-gray-900 leading-none">{recipe.proteinG}g</p>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{t("nutrition.protein")}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredRecipes.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 text-sm">{t("basic.filters.empty")}</div>
          )}
        </div>
      </div>

      {/* ---- Recipe Browser Dialog ---- */}
      <RecipeBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        recipes={browserRecipes}
        initialIndex={browserIndex}
        onAddToShoppingList={onAddToShoppingList}
        onCookRecipe={handleCookRecipeInternal}
      />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared sub-component                                               */
/* ------------------------------------------------------------------ */

function NutritionGrid({ proteinG, carbsG, fatG }: { proteinG: number; carbsG: number; fatG: number }) {
  const t = useTranslations("home");

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="rounded-[1.1rem] border border-gray-200 bg-white px-2.5 py-3 text-center text-[#172033] shadow-sm sm:rounded-[1.35rem] sm:px-4 sm:py-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-500 sm:text-[11px] sm:tracking-[0.14em]">{t("nutrition.protein")}</p>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-xl font-black tracking-tight sm:mt-2 sm:text-2xl lg:text-3xl">
          <Beef className="h-4 w-4 text-emerald-500 sm:h-5 sm:w-5" />{proteinG}g
        </p>
        <p className="mt-1 hidden text-xs font-medium text-gray-600 sm:block sm:text-sm">{t("nutrition.protein").toLowerCase()}</p>
      </div>
      <div className="rounded-[1.1rem] border border-gray-200 bg-white px-2.5 py-3 text-center text-[#172033] shadow-sm sm:rounded-[1.35rem] sm:px-4 sm:py-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-500 sm:text-[11px] sm:tracking-[0.14em]">{t("nutrition.carbs")}</p>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-xl font-black tracking-tight sm:mt-2 sm:text-2xl lg:text-3xl">
          <Flame className="h-4 w-4 text-orange-500 sm:h-5 sm:w-5" />{carbsG}g
        </p>
        <p className="mt-1 hidden text-xs font-medium text-gray-600 sm:block sm:text-sm">{t("nutrition.carbs").toLowerCase()}</p>
      </div>
      <div className="rounded-[1.1rem] border border-gray-200 bg-white px-2.5 py-3 text-center text-[#172033] shadow-sm sm:rounded-[1.35rem] sm:px-4 sm:py-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-500 sm:text-[11px] sm:tracking-[0.14em]">{t("nutrition.fats")}</p>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-xl font-black tracking-tight sm:mt-2 sm:text-2xl lg:text-3xl">
          <Droplets className="h-4 w-4 text-lime-500 sm:h-5 sm:w-5" />{fatG}g
        </p>
        <p className="mt-1 hidden text-xs font-medium text-gray-600 sm:block sm:text-sm">{t("nutrition.fats").toLowerCase()}</p>
      </div>
    </div>
  );
}
