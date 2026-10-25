"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ChefHat,
  Clock,
  Flame,
  Leaf,
  Beef,
  Salad,
  Sparkles,
  SlidersHorizontal,
  X,
  ChevronLeft,
  Droplets,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type {
  CustomRecipeHeroSnapshot,
  RivoCustomRecipeExperienceHandle,
} from "./RivoCustomRecipeExperience";
import type {
  BasicHomeRecipePreview,
  RecipeBrowseAvailableFilters,
} from "@/app/home/types/data";
import { applyGeneratedRecipeImage } from "@/hooks/useGeneratedRecipeImages";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import type { RecipeBookmarks } from "@/hooks/useRecipeBookmarks";
import { shuffleRecipesByTime } from "@/app/home/utils/shuffleRecipes";
import {
  CookNowSection,
  RecipeCard,
  RecipeCardSkeleton,
  RivoCustomRecipeButton,
  RivoCustomRecipeCard,
  TipOfDayCard,
} from "./recipes";

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

const CATEGORY_FILTER_TRANSLATION_KEYS: Record<string, string> = {
  breakfast: "basic.filters.categories.breakfast",
  lunch: "basic.filters.categories.lunch",
  dinner: "basic.filters.categories.dinner",
  snack: "basic.filters.categories.snack",
  smoothies: "basic.filters.categories.smoothies",
  dessert: "basic.filters.categories.dessert",
  treats: "basic.filters.categories.treats",
  "pre-workout-fuel": "basic.filters.categories.pre-workout-fuel",
  "post-workout-fuel": "basic.filters.categories.post-workout-fuel",
  "lunch-and-dinner": "basic.filters.categories.lunch-and-dinner",
} as const;

const CATEGORY_FILTER_ORDER = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "smoothies",
  "dessert",
  "treats",
  "pre-workout-fuel",
  "post-workout-fuel",
  "lunch-and-dinner",
] as const;

const CATEGORY_FILTER_PREFIX = "category:";
const RECIPE_PAGE_SIZE = 8;

const DIET_FILTER_ORDER = [
  "high-protein",
  "vegetarian",
  "vegan",
  "pescatarian",
  "ketogenic",
  "paleo",
  "gluten-free",
  "dairy-free",
] as const;

function normalizeCategoryKey(categoryKey: string | null | undefined): string {
  return categoryKey?.trim().toLowerCase() ?? "";
}

function isValidCategoryKey(categoryKey: string | null | undefined): categoryKey is string {
  const normalized = normalizeCategoryKey(categoryKey);
  return normalized.length > 0 && normalized !== "string";
}

function getCategoryFilterValue(categoryKey: string): string {
  return `${CATEGORY_FILTER_PREFIX}${normalizeCategoryKey(categoryKey)}`;
}

function parseCategoryFilterValue(filter: string): string | null {
  return filter.startsWith(CATEGORY_FILTER_PREFIX)
    ? normalizeCategoryKey(filter.slice(CATEGORY_FILTER_PREFIX.length))
    : null;
}

function formatFilterLabel(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RecipesSectionProps {
  bookmarks: RecipeBookmarks;
  featuredRecipes: BasicHomeRecipePreview[];
  recipeShuffleTime?: number;
  recipeBrowseAvailableFilters: RecipeBrowseAvailableFilters;
  initialRecipeHasMore: boolean;
  initialRecipeTotalCount: number;
  livePantryNames: string[];
  liveCookableRecipes: BasicHomeRecipePreview[];
  customRecipeState: CustomRecipeHeroSnapshot;
  onCustomRecipeStateChange: (next: CustomRecipeHeroSnapshot) => void;
  onOpenPantrySection: () => void;
  onAddToShoppingList: (name: string, qty: string | null, cat: string | null) => Promise<void>;
  onCookRecipe: (recipe: BasicHomeRecipePreview) => void;
  pendingExternalRecipe: BasicHomeRecipePreview | null;
  onPendingExternalRecipeHandled: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RecipesSection({
  bookmarks,
  featuredRecipes,
  recipeShuffleTime = 0,
  recipeBrowseAvailableFilters,
  initialRecipeHasMore,
  initialRecipeTotalCount,
  livePantryNames,
  liveCookableRecipes: liveCookableRecipesFromDb,
  customRecipeState,
  onCustomRecipeStateChange,
  onOpenPantrySection,
  onAddToShoppingList,
  onCookRecipe,
  pendingExternalRecipe,
  onPendingExternalRecipeHandled,
}: RecipesSectionProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const triggerHaptic = useHapticFeedback();
  const rivoCustomRecipeRef = useRef<RivoCustomRecipeExperienceHandle | null>(null);
  const skipInitialBrowseFetchRef = useRef(true);
  const browseRequestSequenceRef = useRef(0);

  /* ---- internal browser state ---- */

  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserSource, setBrowserSource] = useState<"filtered" | "external" | "cookable" | null>(null);
  const [browserIndex, setBrowserIndex] = useState(0);
  const [externalBrowserRecipe, setExternalBrowserRecipe] =
    useState<BasicHomeRecipePreview | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [draftSelectedFilters, setDraftSelectedFilters] = useState<string[]>([]);
  const [browseRecipes, setBrowseRecipes] = useState<BasicHomeRecipePreview[]>(featuredRecipes);
  const [browseHasMore, setBrowseHasMore] = useState(initialRecipeHasMore);
  const [browseTotalCount, setBrowseTotalCount] = useState(initialRecipeTotalCount);
  const [isRefreshingRecipes, setIsRefreshingRecipes] = useState(false);
  const [isLoadingMoreRecipes, setIsLoadingMoreRecipes] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);

  const openRecipeBrowser = useCallback(
    (
      source: "filtered" | "external" | "cookable",
      index: number,
    ) => {
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
      recipes.flatMap((recipe) => {
        if (!recipe) {
          return [];
        }

        if (recipe.matchedIngredients !== undefined || recipe.missingIngredients !== undefined) {
          return [recipe];
        }

        const ingredientPreview = recipe.ingredientPreview ?? [];
        const allIngredients = [...ingredientPreview, ...(recipe.missingIngredients ?? [])];
        const matched: string[] = [];
        const missing: string[] = [];
        for (const ing of allIngredients) {
          if (pantryNameSet.has(ing.toLowerCase().trim())) matched.push(ing);
          else missing.push(ing);
        }

        return [{ ...recipe, ingredientPreview: matched, missingIngredients: missing }];
      }),
    [pantryNameSet],
  );

  // A Rivo recipe can reach these lists before its photo is generated; the Rivo
  // panel tracks the photo, so show its skeleton/photo instead of the emoji tile.
  const { imagesByRecipeId } = customRecipeState;
  const withLivePhoto = useCallback(
    (recipe: BasicHomeRecipePreview) =>
      recipe.imageUrl ? recipe : applyGeneratedRecipeImage(recipe, imagesByRecipeId[recipe.id]),
    [imagesByRecipeId],
  );
  const liveCookableRecipes = useMemo(
    () => liveCookableRecipesFromDb.map(withLivePhoto),
    [liveCookableRecipesFromDb, withLivePhoto],
  );
  const enrichedBrowseRecipes = useMemo(
    () => enrichRecipes(browseRecipes).map(withLivePhoto),
    [browseRecipes, enrichRecipes, withLivePhoto],
  );

  const availableCategoryFilters = useMemo(() => {
    return [...new Set(recipeBrowseAvailableFilters.categoryKeys.map(normalizeCategoryKey).filter(isValidCategoryKey))]
      .sort((left, right) => {
        const leftIndex = CATEGORY_FILTER_ORDER.indexOf(left as (typeof CATEGORY_FILTER_ORDER)[number]);
        const rightIndex = CATEGORY_FILTER_ORDER.indexOf(right as (typeof CATEGORY_FILTER_ORDER)[number]);

        if (leftIndex === -1 && rightIndex === -1) {
          return left.localeCompare(right);
        }

        if (leftIndex === -1) {
          return 1;
        }

        if (rightIndex === -1) {
          return -1;
        }

        return leftIndex - rightIndex;
      })
      .map(getCategoryFilterValue);
  }, [recipeBrowseAvailableFilters.categoryKeys]);

  const availableDietFilters = useMemo(() => {
    return [...new Set(recipeBrowseAvailableFilters.dietTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].sort(
      (left, right) => {
        const leftIndex = DIET_FILTER_ORDER.indexOf(left as (typeof DIET_FILTER_ORDER)[number]);
        const rightIndex = DIET_FILTER_ORDER.indexOf(right as (typeof DIET_FILTER_ORDER)[number]);

        if (leftIndex === -1 && rightIndex === -1) {
          return left.localeCompare(right);
        }

        if (leftIndex === -1) {
          return 1;
        }

        if (rightIndex === -1) {
          return -1;
        }

        return leftIndex - rightIndex;
      },
    );
  }, [recipeBrowseAvailableFilters.dietTags]);

  const activeCategoryFilters = useMemo(
    () =>
      selectedFilters
        .map(parseCategoryFilterValue)
        .filter((value): value is string => Boolean(value)),
    [selectedFilters],
  );

  const activeDietTagFilters = useMemo(
    () =>
      selectedFilters.filter(
        (filter) => filter !== "quick" && parseCategoryFilterValue(filter) === null,
      ),
    [selectedFilters],
  );

  const quickFilterEnabled = useMemo(
    () => selectedFilters.includes("quick"),
    [selectedFilters],
  );

  const availableFilters = useMemo(() => {
    const tagSet = new Set<string>(["all"]);
    tagSet.add("quick");
    for (const tag of availableDietFilters) tagSet.add(tag);
    for (const categoryFilter of availableCategoryFilters) {
      tagSet.add(categoryFilter);
    }
    return [...tagSet];
  }, [availableCategoryFilters, availableDietFilters]);

  const filterSections = useMemo(
    () => {
      const popularFilters = ["all", "quick", "high-protein"].filter((filter) =>
        availableFilters.includes(filter),
      );
      const preferenceFilters = ["vegetarian", "vegan", "pescatarian"].filter((filter) =>
        availableFilters.includes(filter),
      );
      const specialFilters = ["ketogenic", "paleo", "gluten-free", "dairy-free"].filter(
        (filter) => availableFilters.includes(filter),
      );
      const handledDietFilters = new Set([
        "high-protein",
        "vegetarian",
        "vegan",
        "pescatarian",
        "ketogenic",
        "paleo",
        "gluten-free",
        "dairy-free",
      ]);
      const additionalDietFilters = availableDietFilters.filter(
        (filter) => !handledDietFilters.has(filter),
      );

      return [
        {
          key: "popular",
          title: t("basic.filters.sections.popular"),
          filters: popularFilters,
        },
        {
          key: "categories",
          title: t("basic.filters.sections.categories"),
          filters: availableCategoryFilters,
        },
        {
          key: "preferences",
          title: t("basic.filters.sections.preferences"),
          filters: preferenceFilters,
        },
        {
          key: "special",
          title: t("basic.filters.sections.special"),
          filters: [...specialFilters, ...additionalDietFilters],
        },
      ].filter((section) => section.filters.length > 0);
    },
    [availableCategoryFilters, availableDietFilters, availableFilters, t],
  );

  const getFilterLabel = useCallback(
    (filter: string): string => {
      const categoryKey = parseCategoryFilterValue(filter);

      if (categoryKey) {
        const key = CATEGORY_FILTER_TRANSLATION_KEYS[categoryKey as keyof typeof CATEGORY_FILTER_TRANSLATION_KEYS];
        return key ? t(key) : formatFilterLabel(categoryKey);
      }

      const key = RECIPE_TAG_TRANSLATION_KEYS[filter as keyof typeof RECIPE_TAG_TRANSLATION_KEYS];
      return key ? t(key) : formatFilterLabel(filter);
    },
    [t],
  );

  const getRecipeTagIcon = useCallback((filter: string) => {
    const categoryKey = parseCategoryFilterValue(filter);

    if (categoryKey === "smoothies") return Droplets;
    if (categoryKey === "dessert" || categoryKey === "treats") return Sparkles;
    if (categoryKey === "pre-workout-fuel" || categoryKey === "post-workout-fuel") return Flame;
    if (categoryKey) return ChefHat;

    if (filter === "quick") return Clock;
    if (filter === "high-protein") return Beef;
    if (filter === "vegetarian" || filter === "vegan") return Leaf;
    if (filter === "all") return Salad;
    return Flame;
  }, []);

  const selectedFilterCount = selectedFilters.length;

  const selectedFilterLabel = useMemo(() => {
    if (selectedFilters.length === 0) {
      return t("basic.filters.noSelection");
    }

    if (selectedFilters.length === 1) {
      return getFilterLabel(selectedFilters[0]);
    }

    if (selectedFilters.length === 2) {
      return selectedFilters.map((filter) => getFilterLabel(filter)).join(", ");
    }

    return t("basic.filters.selectedCount", { count: selectedFilters.length });
  }, [getFilterLabel, selectedFilters, t]);

  const buildBrowseSearchParams = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        locale,
        offset: String(offset),
        limit: String(RECIPE_PAGE_SIZE),
      });

      if (quickFilterEnabled) {
        params.set("quick", "true");
      }

      for (const categoryKey of activeCategoryFilters) {
        params.append("category", categoryKey);
      }

      for (const dietTag of activeDietTagFilters) {
        params.append("tag", dietTag);
      }

      return params;
    },
    [activeCategoryFilters, activeDietTagFilters, locale, quickFilterEnabled],
  );

  const fetchRecipeBrowsePage = useCallback(
    async (mode: "replace" | "append", offsetOverride?: number) => {
      const nextOffset = offsetOverride ?? (mode === "append" ? 0 : 0);
      const requestSequence = ++browseRequestSequenceRef.current;

      if (mode === "append") {
        setIsLoadingMoreRecipes(true);
      } else {
        setIsRefreshingRecipes(true);
      }

      try {
        const response = await fetch(
          `/api/recipes/browse?${buildBrowseSearchParams(nextOffset).toString()}`,
          {
            method: "GET",
            credentials: "same-origin",
          },
        );

        if (!response.ok) {
          throw new Error("recipe-browse-request-failed");
        }

        const data = (await response.json()) as {
          page?: {
            recipes?: BasicHomeRecipePreview[];
            hasMore?: boolean;
            totalCount?: number;
          };
        };

        if (requestSequence !== browseRequestSequenceRef.current) {
          return;
        }

        const nextRecipes = shuffleRecipesByTime(
          data.page?.recipes ?? [],
          recipeShuffleTime,
        );
        setBrowseError(null);
        setBrowseHasMore(Boolean(data.page?.hasMore));
        setBrowseTotalCount(data.page?.totalCount ?? nextRecipes.length);
        setBrowseRecipes((currentRecipes) => {
          if (mode === "replace") {
            return nextRecipes;
          }

          const recipeMap = new Map(currentRecipes.map((recipe) => [recipe.id, recipe]));
          for (const recipe of nextRecipes) {
            recipeMap.set(recipe.id, recipe);
          }

          return [...recipeMap.values()];
        });
      } catch {
        if (requestSequence === browseRequestSequenceRef.current) {
          setBrowseError(t("basic.filters.loadError"));
        }
      } finally {
        if (requestSequence === browseRequestSequenceRef.current) {
          setIsLoadingMoreRecipes(false);
          setIsRefreshingRecipes(false);
        }
      }
    },
    [buildBrowseSearchParams, recipeShuffleTime, t],
  );

  useEffect(() => {
    setBrowseRecipes(featuredRecipes);
    setBrowseHasMore(initialRecipeHasMore);
    setBrowseTotalCount(initialRecipeTotalCount);
    setBrowseError(null);
  }, [featuredRecipes, initialRecipeHasMore, initialRecipeTotalCount]);

  useEffect(() => {
    if (filterDialogOpen) {
      setDraftSelectedFilters(selectedFilters);
    }
  }, [filterDialogOpen, selectedFilters]);

  useEffect(() => {
    if (skipInitialBrowseFetchRef.current) {
      skipInitialBrowseFetchRef.current = false;
      return;
    }

    void fetchRecipeBrowsePage("replace");
  }, [fetchRecipeBrowsePage, selectedFilters]);

  const handleOpenFilterDialog = useCallback(() => {
    triggerHaptic("light");
    setDraftSelectedFilters(selectedFilters);
    setFilterDialogOpen(true);
  }, [selectedFilters, triggerHaptic]);

  const handleApplyFilter = useCallback(() => {
    triggerHaptic("medium");
    setSelectedFilters(draftSelectedFilters);
    setFilterDialogOpen(false);
  }, [draftSelectedFilters, triggerHaptic]);

  const handleClearFilter = useCallback(() => {
    triggerHaptic("light");
    setDraftSelectedFilters([]);
  }, [triggerHaptic]);

  const handleToggleDraftFilter = useCallback((filter: string) => {
    triggerHaptic("light");
    setDraftSelectedFilters((currentFilters) => {
      if (filter === "all") {
        return [];
      }

      return currentFilters.includes(filter)
        ? currentFilters.filter((currentFilter) => currentFilter !== filter)
        : [...currentFilters, filter];
    });
  }, [triggerHaptic]);

  const handleLoadMoreRecipes = useCallback(() => {
    if (
      !browseHasMore
      || browseRecipes.length >= browseTotalCount
      || isLoadingMoreRecipes
      || isRefreshingRecipes
    ) {
      return;
    }

    triggerHaptic("light");
    void fetchRecipeBrowsePage("append", browseRecipes.length);
  }, [
    browseHasMore,
    browseRecipes.length,
    browseTotalCount,
    fetchRecipeBrowsePage,
    isLoadingMoreRecipes,
    isRefreshingRecipes,
    triggerHaptic,
  ]);

  /* ---- browser recipes ---- */

  const browserRecipes = useMemo(() => {
    switch (browserSource) {
      case "filtered": return enrichedBrowseRecipes;
      case "external": return externalBrowserRecipe ? [externalBrowserRecipe] : [];
      case "cookable": return liveCookableRecipes;
      default: return [];
    }
  }, [browserSource, enrichedBrowseRecipes, externalBrowserRecipe, liveCookableRecipes]);

  useEffect(() => {
    if (!pendingExternalRecipe) {
      return;
    }

    setExternalBrowserRecipe(pendingExternalRecipe);
    setBrowserSource("external");
    setBrowserIndex(0);

    const openTimeout = window.setTimeout(() => {
      setBrowserOpen(true);
      onPendingExternalRecipeHandled();
    }, 180);

    return () => {
      window.clearTimeout(openTimeout);
    };
  }, [onPendingExternalRecipeHandled, pendingExternalRecipe]);

  const handleCookRecipeInternal = useCallback(
    (recipe: BasicHomeRecipePreview) => {
      setBrowserOpen(false);
      onCookRecipe(recipe);
    },
    [onCookRecipe],
  );

  /* ---- active recipe ---- */

  const activeRecipe = enrichedBrowseRecipes[0] ?? null;

  const activeRecipeBrowserIndex = useMemo(() => {
    if (!activeRecipe) return -1;
    return enrichedBrowseRecipes.findIndex((r) => r.id === activeRecipe.id);
  }, [activeRecipe, enrichedBrowseRecipes]);

  /* ---- custom recipe hero derivations ---- */

  const isCustomRecipeHeroActive = customRecipeState.status !== "idle";

  const customRecipeHeroCtaLabel =
    customRecipeState.status === "generating" ? t("basic.customRecipe.ctaGenerating")
    : customRecipeState.status === "fallback-empty" ? t("basic.customRecipe.fallback.retry")
    : customRecipeState.status === "error" ? t("basic.customRecipe.error.retry")
    : customRecipeState.status === "success" ? t("basic.customRecipe.result.regenerate")
    : t("basic.customRecipe.cta");

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

  /* ---- render ---- */

  const shouldShowRefreshSkeleton = isRefreshingRecipes;
  const refreshSkeletonCount = Math.min(Math.max(enrichedBrowseRecipes.length, 4), RECIPE_PAGE_SIZE);
  const loadMoreSkeletonCount = RECIPE_PAGE_SIZE;

  return (
    <motion.div
      data-tutorial-anchor="home-recipes-section"
      key="home-recipes"
      initial={{ opacity: 0, y: 16, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.992 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="font-brand"
    >
      {/* ---- Hero ---- */}
      <div className="mb-3">
        {isCustomRecipeHeroActive ? (
          <RivoCustomRecipeCard
            state={customRecipeState}
            onOpenResult={handleHeroOpenCustomRecipeResult}
            onOpenFallback={handleHeroOpenFallbackRecipe}
            onOpenPantry={handleHeroOpenCustomRecipePantry}
          />
        ) : activeRecipe ? (
          <TipOfDayCard
            recipe={activeRecipe}
            onOpen={() => {
              triggerHaptic("light");
              openRecipeBrowser("filtered", activeRecipeBrowserIndex !== -1 ? activeRecipeBrowserIndex : 0);
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white px-6 py-8 text-center">
            <Sparkles className="h-8 w-8 text-eatrivo-purple" aria-hidden="true" />
            <h2 className="text-[18px] font-bold leading-6 tracking-[-0.015em] text-gray-900">
              {t("mealPlan.empty.title")}
            </h2>
            <p className="text-[14px] font-medium leading-5 text-gray-500">
              {t("mealPlan.empty.description")}
            </p>
          </div>
        )}
      </div>

      <RivoCustomRecipeButton
        label={customRecipeHeroCtaLabel}
        onClick={handleHeroCustomRecipeClick}
        disabled={customRecipeState.status === "generating"}
        className="mb-7"
      />

      <RivoCustomRecipeExperience
        onOpenPantry={onOpenPantrySection}
        ref={rivoCustomRecipeRef}
        onAddToShoppingList={onAddToShoppingList}
        onCookRecipe={onCookRecipe}
        onStateChange={onCustomRecipeStateChange}
        showPanel={false}
        isRecipeBookmarked={bookmarks.isBookmarked}
        onBookmarkChange={bookmarks.setBookmarked}
      />

      <CookNowSection
        recipes={liveCookableRecipes}
        onOpenRecipe={(i) => {
          triggerHaptic("light");
          openRecipeBrowser("cookable", i);
        }}
        isBookmarked={bookmarks.isBookmarked}
        isBookmarkPending={bookmarks.isPending}
        onToggleBookmark={(id) => {
          triggerHaptic("light");
          void bookmarks.toggle(id);
        }}
      />

      {/* ---- All recipes ---- */}
      <section aria-labelledby="home-all-recipes-title" className="pb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="home-all-recipes-title" className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-gray-900">{t("basic.allRecipes.title")}</h2>
          <Button type="button" variant="brandOutline" onClick={handleOpenFilterDialog} className="h-10 rounded-xl px-3.5 text-[15px]">
            <SlidersHorizontal className="h-4 w-4" />
            {t("basic.filters.openButton")}
            {selectedFilterCount > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-eatrivo-purple px-1.5 text-[11px] font-bold text-white">{selectedFilterCount}</span> : null}
          </Button>
        </div>
        {selectedFilterCount > 0 ? <p className="-mt-1 mb-3 truncate text-[13px] font-medium text-gray-500">{t("basic.filters.selectedValue", { value: selectedFilterLabel })}</p> : null}

        <div className="grid grid-cols-2 items-stretch gap-2.5 md:grid-cols-3">
          {!shouldShowRefreshSkeleton && enrichedBrowseRecipes.map((recipe, idx) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onOpen={() => { triggerHaptic("light"); openRecipeBrowser("filtered", idx); }}
              bookmarked={bookmarks.isBookmarked(recipe.id)}
              bookmarkPending={bookmarks.isPending(recipe.id)}
              onToggleBookmark={() => { triggerHaptic("light"); void bookmarks.toggle(recipe.id); }}
            />
          ))}
          {shouldShowRefreshSkeleton && Array.from({ length: refreshSkeletonCount }).map((_, i) => <RecipeCardSkeleton key={`refresh-skeleton-${i}`} delayed={i % 2 === 1} />)}
          {isLoadingMoreRecipes && Array.from({ length: loadMoreSkeletonCount }).map((_, i) => <RecipeCardSkeleton key={`append-skeleton-${i}`} delayed={i % 2 === 1} />)}
          {!shouldShowRefreshSkeleton && enrichedBrowseRecipes.length === 0 && (
            <div className="col-span-full py-8 text-center text-sm text-gray-400">{t("basic.filters.empty")}</div>
          )}
        </div>
        {browseError ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-center">
            <p className="text-sm font-semibold text-red-600">{browseError}</p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void fetchRecipeBrowsePage("replace")}
              className="rounded-full border border-red-200 bg-white px-4 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              {t("basic.filters.retry")}
            </Button>
          </div>
        ) : null}
        {browseHasMore ? (
          <Button type="button" variant="brandOutline" onClick={handleLoadMoreRecipes} disabled={isLoadingMoreRecipes || isRefreshingRecipes} className="mt-4 h-12 w-full rounded-2xl text-[15px]">
            {t("basic.filters.loadMore")}
          </Button>
        ) : null}
      </section>

      {/* ---- Recipe Browser Dialog ---- */}
      <RecipeBrowserDialog
        open={browserOpen}
        onOpenChange={(open) => {
          setBrowserOpen(open);
          if (!open && browserSource === "external") {
            setExternalBrowserRecipe(null);
          }
        }}
        recipes={browserRecipes}
        initialIndex={browserIndex}
        isRecipeBookmarked={bookmarks.isBookmarked}
        onBookmarkChange={bookmarks.setBookmarked}
        onAddToShoppingList={onAddToShoppingList}
        onCookRecipe={handleCookRecipeInternal}
      />

      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex w-[min(calc(100vw-1.5rem),24rem)] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-[2rem] border border-black/5 bg-eatrivo-white-primary p-0 shadow-[0_28px_70px_rgba(0,0,0,0.22)] duration-300 data-[state=closed]:scale-[0.98] data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 sm:max-h-[min(80vh,42rem)]"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4 text-white"
          >
            <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterDialogOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-eatrivo-black-primary/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={t("basic.filters.closeButton")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <DialogTitle className="text-xl font-black tracking-[-0.04em] text-eatrivo-black-primary">
                  {t("basic.filters.title")}
                </DialogTitle>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hide">
              <div className="space-y-5 pb-2">
                {filterSections.map((section) => (
                  <motion.div
                    key={section.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className="border-b border-white/8 pb-5 last:border-b-0 last:pb-0"
                  >
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-eatrivo-black-secondary">
                      {section.title}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {section.filters.map((filter) => {
                        const isSelected =
                          filter === "all"
                            ? draftSelectedFilters.length === 0
                            : draftSelectedFilters.includes(filter);
                        const Icon = getRecipeTagIcon(filter);

                          return (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => handleToggleDraftFilter(filter)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-all duration-200 active:scale-95 ${
                              isSelected
                                ? "border-eatrivo-white-primary/20 bg-eatrivo-purple/70 text-eatrivo-white-primary"
                                : "border-eatrivo-black-primary/8 text-eatrivo-black-primary hover:translate-y-[-1px] hover:bg-white/10"
                            }`}
                          >
                            <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-eatrivo-white-primary" : "text-eatrivo-black-primary/55"}`} />
                            <span>{getFilterLabel(filter)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 shrink-0 flex items-center gap-2 border-t border-black/5 pt-4"
            >
              <Button
                type="button"
                onClick={handleApplyFilter}
                className="h-11 flex-1 rounded-full bg-eatrivo-purple text-sm font-black text-eatrivo-white-primary hover:bg-eatrivo-white-primary/90"
              >
                {t("basic.filters.save")}
                {draftSelectedFilters.length > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-eatrivo-black-primary px-1.5 text-[11px] font-black text-eatrivo-white-primary">
                    {draftSelectedFilters.length}
                  </span>
                ) : null}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilter}
                className="h-11 rounded-full border border-eatrivo-black-primary/8 bg-white/6 px-4 text-sm font-bold text-eatrivo-black-primary hover:bg-eatrivo-white-primary/78  hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                {t("basic.filters.clearAll")}
              </Button>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
