"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Droplets,
  AlertCircle,
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
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { shuffleRecipesByTime } from "@/app/home/utils/shuffleRecipes";

const RivoCustomRecipeExperience = dynamic(
  () => import("./RivoCustomRecipeExperience"),
  {
    ssr: false,
  },
);

const HeroCardSkeleton = () => (
  <div className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm sm:mb-8 xl:min-h-[380px]">
    <div className="relative flex h-full min-h-[300px] w-full flex-col bg-white text-gray-900 sm:min-h-[360px] animate-pulse p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 sm:h-5 w-24 rounded-full bg-emerald-50" />
          <div className="h-8 sm:h-12 w-3/4 rounded-xl bg-gray-100" />
        </div>
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[1.1rem] sm:rounded-[1.4rem] bg-gray-100 shrink-0" />
      </div>
      <div className="flex gap-4 mb-6 mt-2">
        <div className="h-4 w-16 rounded bg-gray-100" />
        <div className="h-4 w-16 rounded bg-gray-100" />
        <div className="h-4 w-20 rounded bg-gray-100" />
      </div>
      <div className="h-px w-full bg-gray-50 mb-6" />
      <div className="flex flex-1 flex-col justify-between gap-6">
        <div className="flex justify-center">
          <div className="h-28 w-28 sm:h-36 sm:w-36 lg:h-44 lg:w-44 rounded-full bg-gray-100 border-[8px] border-gray-50" />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="h-20 sm:h-24 rounded-[1.1rem] sm:rounded-[1.35rem] bg-gray-50" />
          <div className="h-20 sm:h-24 rounded-[1.1rem] sm:rounded-[1.35rem] bg-gray-50" />
          <div className="h-20 sm:h-24 rounded-[1.1rem] sm:rounded-[1.35rem] bg-gray-50" />
        </div>
      </div>
    </div>
  </div>
);

function RecipeGridCardSkeleton({ priority = false }: { priority?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`w-full aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-white p-5 ring-1 ring-gray-100 shadow-lg shadow-eatrivo-purple/5 ${priority ? "animate-pulse" : "animate-pulse [animation-delay:120ms]"}`}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="h-7 w-20 rounded-md bg-eatrivo-purple/10" />
          <div className="h-7 w-16 rounded-md bg-gray-100" />
        </div>
        <div className="mt-auto space-y-3">
          <div className="h-5 w-11/12 rounded-lg bg-gray-100" />
          <div className="h-5 w-8/12 rounded-lg bg-gray-100" />
          <div className="flex items-end gap-1.5 pt-1">
            <div className="h-8 w-16 rounded-lg bg-gray-100" />
            <div className="h-3 w-12 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  featuredRecipes: BasicHomeRecipePreview[];
  recipeShuffleTime?: number;
  recipeBrowseAvailableFilters: RecipeBrowseAvailableFilters;
  initialRecipeHasMore: boolean;
  initialRecipeTotalCount: number;
  livePantryNames: string[];
  livePantrySummary: { itemCount: number; cookableCount: number };
  liveCookableRecipes: BasicHomeRecipePreview[];
  liveAlmostCookableRecipes: BasicHomeRecipePreview[];
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
  featuredRecipes,
  recipeShuffleTime = 0,
  recipeBrowseAvailableFilters,
  initialRecipeHasMore,
  initialRecipeTotalCount,
  livePantryNames,
  livePantrySummary,
  liveCookableRecipes,
  liveAlmostCookableRecipes,
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
  const cookableTouchStartXRef = useRef<number | null>(null);
  const almostCookableTouchStartXRef = useRef<number | null>(null);
  const suppressCookableTapRef = useRef(false);
  const suppressAlmostCookableTapRef = useRef(false);
  const skipInitialBrowseFetchRef = useRef(true);
  const browseRequestSequenceRef = useRef(0);

  /* ---- internal browser state ---- */

  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserSource, setBrowserSource] = useState<"featured" | "cookable" | "almost" | "filtered" | "external" | null>(null);
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
  const [cookableSpotlightIndex, setCookableSpotlightIndex] = useState(0);
  const [almostCookableSpotlightIndex, setAlmostCookableSpotlightIndex] = useState(0);

  const openRecipeBrowser = useCallback(
    (
      source: "featured" | "cookable" | "almost" | "filtered" | "external",
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

  const enrichedBrowseRecipes = useMemo(() => enrichRecipes(browseRecipes), [browseRecipes, enrichRecipes]);
  const enrichedCookableRecipes = useMemo(() => liveCookableRecipes, [liveCookableRecipes]);
  const enrichedAlmostCookableRecipes = useMemo(() => liveAlmostCookableRecipes, [liveAlmostCookableRecipes]);

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

  useEffect(() => {
    setCookableSpotlightIndex((current) => {
      if (enrichedCookableRecipes.length === 0) {
        return 0;
      }
      return Math.min(current, enrichedCookableRecipes.length - 1);
    });
  }, [enrichedCookableRecipes.length]);

  useEffect(() => {
    setAlmostCookableSpotlightIndex((current) => {
      if (enrichedAlmostCookableRecipes.length === 0) {
        return 0;
      }
      return Math.min(current, enrichedAlmostCookableRecipes.length - 1);
    });
  }, [enrichedAlmostCookableRecipes.length]);

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

  const stepSpotlightIndex = useCallback(
    (
      recipeCount: number,
      setIndex: React.Dispatch<React.SetStateAction<number>>,
      direction: 1 | -1,
      hapticType: "light" | "medium" = "light",
    ) => {
      if (recipeCount <= 1) {
        return;
      }

      triggerHaptic(hapticType);
      setIndex((current) => (current + direction + recipeCount) % recipeCount);
    },
    [triggerHaptic],
  );

  const handleSpotlightTouchStart = useCallback(
    (
      startRef: React.MutableRefObject<number | null>,
      suppressTapRef: React.MutableRefObject<boolean>,
    ) => (event: React.TouchEvent<HTMLButtonElement>) => {
      startRef.current = event.changedTouches[0]?.clientX ?? null;
      suppressTapRef.current = false;
    },
    [],
  );

  const handleSpotlightTouchEnd = useCallback(
    (
      recipeCount: number,
      setIndex: React.Dispatch<React.SetStateAction<number>>,
      startRef: React.MutableRefObject<number | null>,
      suppressTapRef: React.MutableRefObject<boolean>,
    ) => (event: React.TouchEvent<HTMLButtonElement>) => {
      const startX = startRef.current;
      const endX = event.changedTouches[0]?.clientX;

      startRef.current = null;

      if (startX === null || typeof endX !== "number") {
        return;
      }

      const deltaX = endX - startX;
      if (Math.abs(deltaX) < 40) {
        return;
      }

      suppressTapRef.current = true;
      stepSpotlightIndex(recipeCount, setIndex, deltaX < 0 ? 1 : -1, "medium");
    },
    [stepSpotlightIndex],
  );

  /* ---- browser recipes ---- */

  const browserRecipes = useMemo(() => {
    switch (browserSource) {
      case "featured": return enrichedBrowseRecipes;
      case "cookable": return enrichedCookableRecipes;
      case "almost": return enrichedAlmostCookableRecipes;
      case "filtered": return enrichedBrowseRecipes;
      case "external": return externalBrowserRecipe ? [externalBrowserRecipe] : [];
      default: return [];
    }
  }, [browserSource, enrichedBrowseRecipes, enrichedCookableRecipes, enrichedAlmostCookableRecipes, externalBrowserRecipe]);

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
  const activeRecipeBrowserSource: "filtered" | "featured" = "filtered";

  const activeRecipeBrowserIndex = useMemo(() => {
    if (!activeRecipe) return -1;
    const sourceRecipes = activeRecipeBrowserSource === "filtered" ? enrichedBrowseRecipes : enrichedBrowseRecipes;
    return sourceRecipes.findIndex((r) => r.id === activeRecipe.id);
  }, [activeRecipe, activeRecipeBrowserSource, enrichedBrowseRecipes]);

  const activeCookableRecipe = enrichedCookableRecipes[cookableSpotlightIndex] ?? null;
  const activeAlmostCookableRecipe = enrichedAlmostCookableRecipes[almostCookableSpotlightIndex] ?? null;

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

  /* ---- render ---- */

  const shouldShowRefreshSkeleton = isRefreshingRecipes;
  const refreshSkeletonCount = Math.min(Math.max(enrichedBrowseRecipes.length, 4), RECIPE_PAGE_SIZE);
  const loadMoreSkeletonCount = RECIPE_PAGE_SIZE;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <motion.div
        data-tutorial-anchor="home-recipes-section"
        key="home-recipes"
        initial={{ opacity: 0, y: 16, scale: 0.992 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.992 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <HeroCardSkeleton />
      </motion.div>
    );
  }

  return (
    <motion.div
      data-tutorial-anchor="home-recipes-section"
      key="home-recipes"
      initial={{ opacity: 0, y: 16, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.992 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ---- Hero Card ---- */}
      <div className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-md sm:mb-8 xl:min-h-[380px]">
        {isCustomRecipeHeroActive ? (
          <div className="relative flex h-full min-h-[300px] w-full flex-col bg-white text-eatrivo-black-primary sm:min-h-[360px]">
            <div className="flex h-full flex-col gap-5 px-4 pb-4 pt-5 sm:gap-6 sm:px-7 sm:pb-7 sm:pt-7">

              {customRecipeState.status !== "success" && customRecipeState.status !== "fallback-empty" ? (
                <div className="flex items-start ">
                  <div className={`rounded-[1.1rem] p-2 shadow-sm ${customRecipeHeroIconClasses}`}>
                    <CustomRecipeHeroIcon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${customRecipeHeroBadgeClasses}`}>
                      {customRecipeHeroBadge}
                    </span>
                    <div className="space-y-1">
                      <h2 className="text-xl font-black tracking-tight text-eatrivo-black-primary sm:text-3xl lg:text-4xl">
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
                <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-emerald-700 sm:px-3 sm:py-1.5 sm:text-[11px]">
                    {t("basic.hero.badge")}
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-[#172033] sm:text-4xl lg:text-5xl">
                    {activeRecipe.title}
                  </h2>
                </div>
                <div className="shrink-0 rounded-[1.1rem] border border-gray-200 bg-eatrivo-white-secondary/50 p-1.5 shadow-sm sm:rounded-[1.4rem] sm:p-2">
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

        {/* Cookable Recipes Spotlight */}
        <div className="relative z-10 -mx-6 sm:-mx-8 px-6 sm:px-8">
          {enrichedCookableRecipes.length > 0 ? (
            <div className="pb-6">
              <div className="mb-4 flex items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                    {t("basic.pantryDashboard.cookablePrefix")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {cookableSpotlightIndex + 1} / {enrichedCookableRecipes.length}
                  </p>
                </div>
                {enrichedCookableRecipes.length > 1 ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => stepSpotlightIndex(enrichedCookableRecipes.length, setCookableSpotlightIndex, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-eatrivo-purple/20 bg-white text-eatrivo-purple shadow-sm transition-all hover:-translate-y-0.5 hover:bg-eatrivo-purple/5 active:scale-95"
                      aria-label={t("basic.almostCookable.scrollLeft")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepSpotlightIndex(enrichedCookableRecipes.length, setCookableSpotlightIndex, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-eatrivo-purple/20 bg-white text-eatrivo-purple shadow-sm transition-all hover:-translate-y-0.5 hover:bg-eatrivo-purple/5 active:scale-95"
                      aria-label={t("basic.almostCookable.scrollRight")}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>

              {activeCookableRecipe ? (
                <motion.button
                  key={activeCookableRecipe.id}
                  type="button"
                  initial={{ opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  onTouchStart={handleSpotlightTouchStart(cookableTouchStartXRef, suppressCookableTapRef)}
                  onTouchEnd={handleSpotlightTouchEnd(
                    enrichedCookableRecipes.length,
                    setCookableSpotlightIndex,
                    cookableTouchStartXRef,
                    suppressCookableTapRef,
                  )}
                  onClick={() => {
                    if (suppressCookableTapRef.current) {
                      suppressCookableTapRef.current = false;
                      return;
                    }
                    const idx = enrichedCookableRecipes.findIndex((recipe) => recipe.id === activeCookableRecipe.id);
                    openRecipeBrowser("cookable", idx !== -1 ? idx : 0);
                  }}
                  className="group/recipe relative flex w-full overflow-hidden rounded-[1.15rem] border border-gray-100 bg-white px-4 py-3 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-md sm:px-5 sm:py-3.5"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-eatrivo-purple/80" />
                  <div className="flex w-full items-center justify-between gap-4 pt-1">
                    <h3 className="min-w-0 text-[15px] font-black leading-tight tracking-tight text-gray-900 transition-colors group-hover/recipe:text-eatrivo-purple sm:text-base">
                      <span className="line-clamp-2">{activeCookableRecipe.title}</span>
                    </h3>
                    <div className="shrink-0 text-right text-eatrivo-purple">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-400">{t("nutrition.protein")}</p>
                      <p className="text-[1.65rem] font-black leading-none sm:text-[1.8rem]">{activeCookableRecipe.proteinG}g</p>
                    </div>
                  </div>
                </motion.button>
              ) : null}
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
                  <button type="button" onClick={() => stepSpotlightIndex(enrichedAlmostCookableRecipes.length, setAlmostCookableSpotlightIndex, -1)} className="h-8 w-8 rounded-full border border-amber-200 bg-white text-amber-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-50 active:scale-95 flex items-center justify-center" aria-label={t("basic.almostCookable.scrollLeft")}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-[3rem] text-center text-[11px] font-bold text-gray-400">
                    {almostCookableSpotlightIndex + 1}/{enrichedAlmostCookableRecipes.length}
                  </div>
                  <button type="button" onClick={() => stepSpotlightIndex(enrichedAlmostCookableRecipes.length, setAlmostCookableSpotlightIndex, 1)} className="h-8 w-8 rounded-full border border-amber-200 bg-white text-amber-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-50 active:scale-95 flex items-center justify-center" aria-label={t("basic.almostCookable.scrollRight")}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-[11px] font-bold text-gray-400">
                  1/1
                </div>
              )}
            </div>
            {activeAlmostCookableRecipe ? (
              <motion.button
                key={activeAlmostCookableRecipe.id}
                type="button"
                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                onTouchStart={handleSpotlightTouchStart(almostCookableTouchStartXRef, suppressAlmostCookableTapRef)}
                onTouchEnd={handleSpotlightTouchEnd(
                  enrichedAlmostCookableRecipes.length,
                  setAlmostCookableSpotlightIndex,
                  almostCookableTouchStartXRef,
                  suppressAlmostCookableTapRef,
                )}
                onClick={() => {
                  if (suppressAlmostCookableTapRef.current) {
                    suppressAlmostCookableTapRef.current = false;
                    return;
                  }
                  const idx = enrichedAlmostCookableRecipes.findIndex((recipe) => recipe.id === activeAlmostCookableRecipe.id);
                  openRecipeBrowser("almost", idx !== -1 ? idx : 0);
                }}
                className="group/almost relative mx-6 mb-4 flex w-auto overflow-hidden rounded-[1.15rem] border border-amber-100 bg-white px-4 py-3 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-md sm:mx-8 sm:px-5 sm:py-3.5"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-amber-400/90" />
                <div className="flex w-full items-center justify-between gap-4 pt-1">
                  <h3 className="min-w-0 text-[15px] font-black leading-tight tracking-tight text-gray-900 transition-colors group-hover/almost:text-amber-600 sm:text-base">
                    <span className="line-clamp-2">{activeAlmostCookableRecipe.title}</span>
                  </h3>
                  <div className="shrink-0 text-right text-amber-700">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-400">{t("nutrition.protein")}</p>
                    <p className="text-[1.65rem] font-black leading-none sm:text-[1.8rem]">{activeAlmostCookableRecipe.proteinG}g</p>
                  </div>
                </div>
              </motion.button>
            ) : null}
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

      {/* ---- Filters Trigger ---- */}
      <div className="pb-4">
        <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-gray-100 bg-white/90 px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
              {t("basic.filters.title")}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-gray-900">
              {selectedFilterCount === 0
                ? t("basic.filters.noSelection")
                : t("basic.filters.selectedValue", { value: selectedFilterLabel })}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenFilterDialog}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-eatrivo-purple px-4 py-2.5 text-sm font-bold text-eatrivo-white-primary transition-all hover:translate-y-[-1px] active:scale-95"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("basic.filters.openButton")}
            {selectedFilterCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-black text-[#111014]">
                {selectedFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* ---- Filtered Recipes Grid ---- */}
      <div className="pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {!shouldShowRefreshSkeleton && enrichedBrowseRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex flex-col gap-2 cursor-pointer"
              onClick={() => {
                const idx = enrichedBrowseRecipes.findIndex((r) => r.id === recipe.id);
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
          {shouldShowRefreshSkeleton && Array.from({ length: refreshSkeletonCount }).map((_, index) => (
            <RecipeGridCardSkeleton key={`refresh-skeleton-${index}`} priority={index % 2 === 0} />
          ))}
          {isLoadingMoreRecipes && Array.from({ length: loadMoreSkeletonCount }).map((_, index) => (
            <RecipeGridCardSkeleton key={`append-skeleton-${index}`} priority={index % 2 === 0} />
          ))}
          {!shouldShowRefreshSkeleton && enrichedBrowseRecipes.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 text-sm">{t("basic.filters.empty")}</div>
          )}
        </div>
        {browseError ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-[1.35rem] border border-red-100 bg-red-50 px-4 py-4 text-center">
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
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              onClick={handleLoadMoreRecipes}
              disabled={isLoadingMoreRecipes || isRefreshingRecipes}
              className="h-11 rounded-full bg-eatrivo-purple px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-eatrivo-purple/90"
            >
              {t("basic.filters.loadMore")}
            </Button>
          </div>
        ) : null}
      </div>

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
