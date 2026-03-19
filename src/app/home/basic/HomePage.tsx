"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { APP_CONFIG } from "@/app/config/app";
import { logger } from "@/lib/logger";
import {
  CookingPot,
  Clock,
  Flame,
  Archive,
  Leaf,
  Beef,
  Salad,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Milk,
  Apple,
  Carrot,
  Wheat,
  Egg,
  Droplets,
  CupSoda,
  Nut,
  Package,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import WelcomeDialog from "../premium/WelcomeDialog";
import HomeSidebar from "../components/HomeSidebar";
import HomeHeader from "../premium/HomeHeader";
import MobileNavigation from "../components/MobileNavigation";
import PantrySection from "../premium/PantrySection";
import ProfilePageClient from "@/app/profile/components/ProfilePageClient";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { NotificationBanner } from "@/components/pwa/NotificationBanner";
import FeedbackButton from "@/components/FeedbackButton";
import ChatWithRivoPage from "@/app/[locale]/chat-with-rivo/ChatWithRivoPage";
import RecipeBrowserDialog from "../components/RecipeBrowserDialog";
import RivoCustomRecipeExperience from "../components/RivoCustomRecipeExperience";
import type {
  BasicHomePantrySummary,
  BasicHomeRecipePreview,
} from "@/app/[locale]/home/page";
import KitchenCounterPage from "@/app/kitchen-counter/KitchenCounterPage";
import { normalizeRecipeInstructions } from "@/lib/recipe-instructions";
import { Button } from "@/components/ui/button";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import {
  type AppHomeSection,
  getPrimaryAppHomeSection,
  isHomeSection,
} from "../types/navigation";

const SHOPPING_LIST_CATEGORY_ORDER = [
  "dairy",
  "meat_fish",
  "fruit",
  "vegetables",
  "grains",
  "eggs",
  "condiments",
  "beverages",
  "nuts_seeds",
  "other",
] as const;

const SHOPPING_CATEGORY_TRANSLATION_KEYS: Record<string, string> = {
  dairy: "dairy",
  meat_fish: "meat_fish",
  fruit: "fruit",
  vegetables: "vegetables",
  grains: "grains",
  eggs: "eggs",
  condiments: "condiments",
  beverages: "beverages",
  nuts_seeds: "nuts_seeds",
  other: "other",
};

const SHOPPING_CATEGORY_ICONS: Record<string, React.ElementType> = {
  dairy: Milk,
  meat_fish: Beef,
  fruit: Apple,
  vegetables: Carrot,
  grains: Wheat,
  eggs: Egg,
  condiments: Droplets,
  beverages: CupSoda,
  nuts_seeds: Nut,
  other: Package,
};

const PANTRY_CHANGED_EVENT = "pantry:changed";
const KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY =
  "kitchenCounter:selectedRecipe";
const RECIPE_TAG_TRANSLATION_KEYS = {
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

function getCategoryAccent(categoryKey: string): string {
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
      return "from-eatrivo-purple via-fuchsia-500 to-eatrivo-pink";
  }
}

interface HomePageProps {
  featuredRecipes?: BasicHomeRecipePreview[];
  pantrySummary?: BasicHomePantrySummary;
  cookableRecipes?: BasicHomeRecipePreview[];
  almostCookableRecipes?: BasicHomeRecipePreview[];
  pantryNames?: string[];
}

interface RecipeMatchPayloadItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryKey: string;
  totalTimeMin: number;
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  instructions?: BasicHomeRecipePreview["instructions"];
  ingredientItems?: BasicHomeRecipePreview["ingredientItems"];
  mealPrepFriendly: boolean;
  matchedIngredientNames: string[];
  matchedIngredients?: BasicHomeRecipePreview["matchedIngredients"];
  missingIngredientNames?: string[];
}

interface ShoppingListItem {
  id?: string;
  name: string;
  quantity: string | null;
  category: string;
  isChecked?: boolean;
}

interface ShoppingListApiItem {
  id: string;
  name: string;
  quantity: string | null;
  category: string;
  sortOrder: number;
  isChecked?: boolean;
}

interface ShoppingListApiMeta {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
}

function readStoredKitchenCounterRecipe(): BasicHomeRecipePreview | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem(
    KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY,
  );

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<BasicHomeRecipePreview>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.category !== "string"
    ) {
      return null;
    }

    return {
      ...parsed,
      instructions: normalizeRecipeInstructions(parsed.instructions),
    } as BasicHomeRecipePreview;
  } catch {
    return null;
  }
}

export default function HomePage({
  featuredRecipes = [],
  pantrySummary = { itemCount: 0, cookableCount: 0 },
  cookableRecipes = [],
  almostCookableRecipes = [],
  pantryNames = [],
}: HomePageProps) {
  const t = useTranslations("home");
  const pantryT = useTranslations("pantry");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [livePantrySummary, setLivePantrySummary] =
    useState<BasicHomePantrySummary>(pantrySummary);
  const [livePantryNames, setLivePantryNames] = useState<string[]>(pantryNames);
  const [liveCookableRecipes, setLiveCookableRecipes] =
    useState<BasicHomeRecipePreview[]>(cookableRecipes);
  const [liveAlmostCookableRecipes, setLiveAlmostCookableRecipes] = useState<
    BasicHomeRecipePreview[]
  >(almostCookableRecipes);
  const [shoppingListItems, setShoppingListItems] = useState<
    ShoppingListItem[]
  >([]);
  const [currentShoppingList, setCurrentShoppingList] =
    useState<ShoppingListApiMeta | null>(null);
  const [isCompletingShoppingList, setIsCompletingShoppingList] =
    useState(false);
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isRemovingItemId, setIsRemovingItemId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedKitchenCounter, setSelectedKitchenCounter] =
    useState<BasicHomeRecipePreview | null>(null);
  const getRecipeTagLabel = useCallback(
    (tag: string): string => {
      const key =
        RECIPE_TAG_TRANSLATION_KEYS[
          tag as keyof typeof RECIPE_TAG_TRANSLATION_KEYS
        ];

      return key ? t(key) : tag.replace(/-/g, " ");
    },
    [t],
  );

  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [activeSection, setActiveSection] = useState<AppHomeSection>("home");

  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserSource, setBrowserSource] = useState<
    "featured" | "cookable" | "almost" | "filtered" | null
  >(null);
  const [browserIndex, setBrowserIndex] = useState(0);
  const almostCookableScrollRef = useRef<HTMLDivElement | null>(null);
  const triggerHaptic = useHapticFeedback();
  const primaryActiveSection = getPrimaryAppHomeSection(activeSection);
  const activeHomeSection =
    activeSection === "home.shoppingList"
      ? "home.shoppingList"
      : "home.recipes";

  const handleHomeSectionChange = useCallback(
    (section: "home.recipes" | "home.shoppingList") => {
      triggerHaptic(activeHomeSection === section ? "light" : "medium");
      setActiveSection(section);
    },
    [activeHomeSection, triggerHaptic],
  );

  const toggleCheckItem = useCallback(
    (itemId: string) => {
      triggerHaptic("light");
      
      const prevChecked = checkedItemIds.has(itemId);
      const nextChecked = !prevChecked;

      setCheckedItemIds((prev) => {
        const next = new Set(prev);
        if (nextChecked) next.add(itemId);
        else next.delete(itemId);
        return next;
      });

      fetch(`/api/shopping-lists/current/items/${itemId}/check`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isChecked: nextChecked })
      }).catch((_err) => {
        toast.error("Chyba synchronizácie s databázou");
        setCheckedItemIds((prev) => {
          const next = new Set(prev);
          if (prevChecked) next.add(itemId);
          else next.delete(itemId);
          return next;
        });
      });
    },
    [triggerHaptic, checkedItemIds],
  );

  const handleEditQuantity = useCallback(async (itemId: string, currentQuantity: string | null) => {
    const newQuantity = window.prompt("Upraviť množstvo:", currentQuantity || "");
    if (newQuantity !== null && newQuantity.trim() !== currentQuantity?.trim()) {
      const trimmed = newQuantity.trim();
      
      const previousItems = [...shoppingListItems];
      setShoppingListItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: trimmed } : item));

      try {
        const response = await fetch(`/api/shopping-lists/current/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountLabel: trimmed })
        });
        if (!response.ok) throw new Error("Update failed");
      } catch {
        toast.error("Nepodarilo sa upraviť množstvo");
        setShoppingListItems(previousItems);
      }
    }
  }, [shoppingListItems]);

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      if (isRemovingItemId) return;
      setIsRemovingItemId(itemId);
      triggerHaptic("medium");

      // Optimistic update: snapshot current state
      const previousItems = [...shoppingListItems];
      const previousCheckedItemIds = new Set(checkedItemIds);

      // Perform optimistic removal
      setShoppingListItems((prev) => prev.filter((item) => item.id !== itemId));
      setCheckedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      // Background request
      fetch(`/api/shopping-lists/current/items/${itemId}`, {
        method: "DELETE",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to remove item");
          }
          // Successfully deleted on server
        })
        .catch(() => {
          // Revert on error
          toast.error(t("basic.shoppingList.removeError"));
          setShoppingListItems(previousItems);
          setCheckedItemIds(previousCheckedItemIds);
        })
        .finally(() => {
          setIsRemovingItemId(null);
        });
    },
    [
      isRemovingItemId,
      triggerHaptic,
      t,
      shoppingListItems,
      checkedItemIds,
    ],
  );

  const handleStartEditTitle = useCallback(() => {
    setEditTitleValue(
      currentShoppingList?.title || t("greeting.actions.shoppingList"),
    );
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  }, [currentShoppingList?.title, t]);

  const handleSaveTitle = useCallback(async () => {
    const trimmed = editTitleValue.trim();
    if (!trimmed || !currentShoppingList?.id) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/shopping-lists/${currentShoppingList.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        },
      );

      if (!response.ok) {
        toast.error(t("basic.shoppingList.titleUpdateError"));
      } else {
        setCurrentShoppingList((prev) =>
          prev ? { ...prev, title: trimmed } : prev,
        );
      }
    } catch {
      toast.error(t("basic.shoppingList.titleUpdateError"));
    } finally {
      setIsEditingTitle(false);
    }
  }, [editTitleValue, currentShoppingList?.id, t]);

  const totalChecked = useMemo(
    () =>
      shoppingListItems.filter((item) => checkedItemIds.has(item.id ?? ""))
        .length,
    [shoppingListItems, checkedItemIds],
  );

  const allItemsChecked =
    shoppingListItems.length > 0 && totalChecked === shoppingListItems.length;

  const openRecipeBrowser = useCallback(
    (source: "featured" | "cookable" | "almost" | "filtered", index: number) => {
      setBrowserSource(source);
      setBrowserIndex(index);
      setBrowserOpen(true);
    },
    [],
  );

  const scrollAlmostCookableRecipes = useCallback((direction: 1 | -1) => {
    almostCookableScrollRef.current?.scrollBy({
      left: direction * 220,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const sectionParam = searchParams.get("section");
    const validSections = [
      "home",
      "home.recipes",
      "home.shoppingList",
      "pantry",
      "chatWithRivo",
      "profile",
      "kitchenCounter",
    ] as const;
    if (
      sectionParam &&
      validSections.includes(sectionParam as (typeof validSections)[number])
    ) {
      setActiveSection(sectionParam as (typeof validSections)[number]);
      const url = new URL(window.location.href);
      url.searchParams.delete("section");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  useEffect(() => {
    setLivePantrySummary(pantrySummary);
    setLivePantryNames(pantryNames);
    setLiveCookableRecipes(cookableRecipes);
    setLiveAlmostCookableRecipes(almostCookableRecipes);
  }, [pantrySummary, pantryNames, cookableRecipes, almostCookableRecipes]);

  useEffect(() => {
    setSelectedKitchenCounter(readStoredKitchenCounterRecipe());
  }, []);

  // Reactively enrich recipes with pantry comparison
  const pantryNameSet = useMemo(
    () => new Set(livePantryNames.map((n) => n.toLowerCase().trim())),
    [livePantryNames],
  );

  const enrichRecipes = useCallback(
    (recipes: BasicHomeRecipePreview[]): BasicHomeRecipePreview[] =>
      recipes.map((recipe) => {
        if (
          recipe.matchedIngredients !== undefined ||
          recipe.missingIngredients !== undefined
        ) {
          return recipe;
        }

        // For cookable/almostCookable, ingredientPreview = matched, missingIngredients already set
        // For featured, ingredientPreview = ALL ingredients, need to split
        const allIngredients = [
          ...recipe.ingredientPreview,
          ...(recipe.missingIngredients ?? []),
        ];
        const matched: string[] = [];
        const missing: string[] = [];
        for (const ing of allIngredients) {
          if (pantryNameSet.has(ing.toLowerCase().trim())) {
            matched.push(ing);
          } else {
            missing.push(ing);
          }
        }
        return {
          ...recipe,
          ingredientPreview: matched,
          missingIngredients: missing,
        };
      }),
    [pantryNameSet],
  );

  const enrichedFeaturedRecipes = useMemo(
    () => enrichRecipes(featuredRecipes),
    [enrichRecipes, featuredRecipes],
  );
  const enrichedCookableRecipes = useMemo(
    () => liveCookableRecipes,
    [liveCookableRecipes],
  );
  const enrichedAlmostCookableRecipes = useMemo(
    () => liveAlmostCookableRecipes,
    [liveAlmostCookableRecipes],
  );

  const filteredRecipes = useMemo(() => {
    if (selectedFilter === "all") {
      return enrichedFeaturedRecipes;
    }

    if (selectedFilter === "quick") {
      return enrichedFeaturedRecipes.filter(
        (recipe) => recipe.totalTimeMin <= 20,
      );
    }

    return enrichedFeaturedRecipes.filter((recipe) =>
      recipe.dietTags.includes(selectedFilter),
    );
  }, [enrichedFeaturedRecipes, selectedFilter]);

  const browserRecipes = useMemo(() => {
    switch (browserSource) {
      case "featured":
        return enrichedFeaturedRecipes;
      case "cookable":
        return enrichedCookableRecipes;
      case "almost":
        return enrichedAlmostCookableRecipes;
      case "filtered":
        return filteredRecipes;
      default:
        return [];
    }
  }, [
    browserSource,
    enrichedFeaturedRecipes,
    enrichedCookableRecipes,
    enrichedAlmostCookableRecipes,
    filteredRecipes,
  ]);

  const mapShoppingListItems = useCallback(
    (items: ShoppingListApiItem[]): ShoppingListItem[] =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        isChecked: item.isChecked,
      })),
    [],
  );

  const getShoppingCategoryLabel = useCallback(
    (category: string) => {
      const key = SHOPPING_CATEGORY_TRANSLATION_KEYS[category] ?? "other";

      try {
        return pantryT(`categories.${key}` as Parameters<typeof pantryT>[0]);
      } catch {
        return category;
      }
    },
    [pantryT],
  );

  const shoppingListItemsByCategory = useMemo(() => {
    return shoppingListItems.reduce<Record<string, ShoppingListItem[]>>(
      (acc, item) => {
        const category = item.category || "other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      },
      {},
    );
  }, [shoppingListItems]);

  const shoppingListCategories = useMemo(() => {
    const presentCategories = Object.keys(shoppingListItemsByCategory);
    const orderedCategories = SHOPPING_LIST_CATEGORY_ORDER.filter((category) =>
      presentCategories.includes(category),
    );
    const remainingCategories = presentCategories
      .filter(
        (category) =>
          !SHOPPING_LIST_CATEGORY_ORDER.includes(
            category as (typeof SHOPPING_LIST_CATEGORY_ORDER)[number],
          ),
      )
      .sort((left, right) =>
        getShoppingCategoryLabel(left).localeCompare(
          getShoppingCategoryLabel(right),
        ),
      );

    return [...orderedCategories, ...remainingCategories];
  }, [getShoppingCategoryLabel, shoppingListItemsByCategory]);

  const loadCurrentShoppingList = useCallback(async () => {
    if (!session?.user?.id) {
      setShoppingListItems([]);
      setCurrentShoppingList(null);
      return;
    }

    try {
      const response = await fetch("/api/shopping-lists/current", {
        cache: "no-store",
      });

      if (!response.ok) {
        logger.warn("Failed to load current shopping list", {
          context: "HomePage",
          metadata: { status: response.status },
        });
        return;
      }

      const payload = (await response.json()) as {
        shoppingList?: ShoppingListApiMeta | null;
        items?: ShoppingListApiItem[];
      };

      setCurrentShoppingList(payload.shoppingList ?? null);
      const items = Array.isArray(payload.items) ? mapShoppingListItems(payload.items) : [];
      setShoppingListItems(items);
      const initialChecked = new Set<string>();
      items.forEach((item) => {
        if (item.isChecked && item.id) initialChecked.add(item.id);
      });
      setCheckedItemIds(initialChecked);
    } catch (error) {
      logger.warn("Failed to fetch current shopping list", {
        context: "HomePage",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }, [mapShoppingListItems, session?.user?.id]);

  const refreshPantrySummary = useCallback(async () => {
    try {
      logger.debug("[BasicHome] refreshPantrySummary: start", {
        metadata: { locale },
      });

      const [pantryResponse, matchesResponse] = await Promise.all([
        fetch("/api/pantry", { cache: "no-store" }),
        fetch(`/api/recipes/matches?locale=${locale}&maxMissingIngredients=3`, {
          cache: "no-store",
        }),
      ]);

      logger.debug("[BasicHome] refreshPantrySummary: responses", {
        metadata: {
          pantryOk: pantryResponse.ok,
          pantryStatus: pantryResponse.status,
          matchesOk: matchesResponse.ok,
          matchesStatus: matchesResponse.status,
        },
      });

      if (!pantryResponse.ok || !matchesResponse.ok) {
        logger.debug(
          "[BasicHome] refreshPantrySummary: aborted due to non-ok response",
        );
        return;
      }

      const pantryPayload = (await pantryResponse.json()) as {
        items?: unknown[];
      };
      const matchesPayload = (await matchesResponse.json()) as {
        cookable?: unknown[];
        almostCookable?: unknown[];
        pantryIngredientKeyCount?: number;
        recipeCountAnalyzed?: number;
      };

      logger.debug("[BasicHome] refreshPantrySummary: payload", {
        metadata: {
          pantryItems: pantryPayload.items?.length ?? 0,
          cookableRecipes: matchesPayload.cookable?.length ?? 0,
          almostCookableRecipes: matchesPayload.almostCookable?.length ?? 0,
          pantryIngredientKeyCount:
            matchesPayload.pantryIngredientKeyCount ?? 0,
          recipeCountAnalyzed: matchesPayload.recipeCountAnalyzed ?? 0,
        },
      });

      setLivePantrySummary({
        itemCount: pantryPayload.items?.length ?? 0,
        cookableCount: matchesPayload.cookable?.length ?? 0,
      });

      // Update live pantry names for reactive ingredient comparison
      if (Array.isArray(pantryPayload.items)) {
        const newNames = (
          pantryPayload.items as Array<{
            name?: string;
            ingredientName?: string | null;
          }>
        ).flatMap((item) => {
          const names: string[] = [];
          if (item.name) names.push(item.name.toLowerCase().trim());
          if (item.ingredientName)
            names.push(item.ingredientName.toLowerCase().trim());
          return names;
        });
        setLivePantryNames(newNames);
      }

      // Update live recipe lists from matches payload
      if (matchesPayload.cookable) {
        setLiveCookableRecipes(
          (matchesPayload.cookable as RecipeMatchPayloadItem[]).map(
            (match) => ({
              id: match.id,
              slug: match.slug,
              title: match.name,
              category: match.category,
              categoryKey: match.categoryKey,
              totalTimeMin: match.totalTimeMin,
              calories: match.calories,
              proteinG: match.proteinG,
              carbsG: match.carbohydratesG,
              fatG: match.fatG,
              instructions: normalizeRecipeInstructions(match.instructions),
              dietTags: [],
              ingredientItems: match.ingredientItems ?? [],
              ingredientPreview: match.matchedIngredientNames,
              matchedIngredients: match.matchedIngredients,
              mealPrepFriendly: match.mealPrepFriendly,
            }),
          ),
        );
      }

      if (matchesPayload.almostCookable) {
        setLiveAlmostCookableRecipes(
          (matchesPayload.almostCookable as RecipeMatchPayloadItem[]).map(
            (match) => ({
              id: match.id,
              slug: match.slug,
              title: match.name,
              category: match.category,
              categoryKey: match.categoryKey,
              totalTimeMin: match.totalTimeMin,
              calories: match.calories,
              proteinG: match.proteinG,
              carbsG: match.carbohydratesG,
              fatG: match.fatG,
              instructions: normalizeRecipeInstructions(match.instructions),
              dietTags: [],
              ingredientItems: match.ingredientItems ?? [],
              ingredientPreview: match.matchedIngredientNames,
              matchedIngredients: match.matchedIngredients,
              mealPrepFriendly: match.mealPrepFriendly,
              missingIngredients: match.missingIngredientNames,
            }),
          ),
        );
      }

      logger.debug("[BasicHome] refreshPantrySummary: updated live summary", {
        metadata: {
          itemCount: pantryPayload.items?.length ?? 0,
          cookableCount: matchesPayload.cookable?.length ?? 0,
        },
      });
    } catch (error) {
      logger.warn("Failed to refresh pantry summary on basic home", {
        context: "HomePage",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePantryChanged = () => {
      void refreshPantrySummary();
    };

    window.addEventListener(PANTRY_CHANGED_EVENT, handlePantryChanged);

    return () => {
      window.removeEventListener(PANTRY_CHANGED_EVENT, handlePantryChanged);
    };
  }, [refreshPantrySummary]);

  const availableFilters = useMemo(() => {
    const tagSet = new Set<string>(["all"]);

    for (const recipe of enrichedFeaturedRecipes) {
      if (recipe.totalTimeMin <= 20) {
        tagSet.add("quick");
      }

      for (const tag of recipe.dietTags) {
        tagSet.add(tag);
      }
    }

    return [...tagSet].slice(0, 6);
  }, [enrichedFeaturedRecipes]);

  const activeRecipe = filteredRecipes[0] ?? enrichedFeaturedRecipes[0] ?? null;

  useEffect(() => {
    logger.debug("[BasicHome] featured recipes state", {
      metadata: {
        totalFeaturedRecipes: enrichedFeaturedRecipes.length,
        selectedFilter,
        filteredRecipes: filteredRecipes.length,
        activeRecipeTitle: activeRecipe?.title ?? null,
      },
    });
  }, [
    activeRecipe?.title,
    enrichedFeaturedRecipes.length,
    filteredRecipes.length,
    selectedFilter,
  ]);

  useEffect(() => {
    if (session?.user) {
      const userVersion = session.user.lastSeenWelcomeVersion;
      const currentVersion = APP_CONFIG.WELCOME_DIALOG_VERSION;
      const needsWelcome = !userVersion || userVersion !== currentVersion;
      setShowWelcomeDialog(needsWelcome);
    }
  }, [session?.user]);

  useEffect(() => {
    void loadCurrentShoppingList();
  }, [loadCurrentShoppingList]);

  const handleCloseDialog = async () => {
    setShowWelcomeDialog(false);
    try {
      await fetch("/api/user/update-dialog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: APP_CONFIG.WELCOME_DIALOG_VERSION,
        }),
      });
    } catch (error) {
      logger.error("Failed to update welcome dialog version", error, {
        context: "HomePage",
        metadata: { userId: session?.user?.id },
      });
    }
  };

  const handleCookRecipe = useCallback((recipe: BasicHomeRecipePreview) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY,
        JSON.stringify(recipe),
      );
    }

    setSelectedKitchenCounter(recipe);
    setBrowserOpen(false);
    setActiveSection("kitchenCounter");
  }, []);

  const handleAddToShoppingList = useCallback(
    async (
      ingredientName: string,
      quantity: string | null,
      category: string | null,
    ) => {
      const normalizedName = ingredientName.trim();

      if (!normalizedName) {
        return;
      }

      const response = await fetch("/api/shopping-lists/current", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          amountLabel: quantity,
          category,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        logger.warn("Failed to add item to shopping list", {
          context: "HomePage",
          metadata: {
            ingredientName: normalizedName,
            status: response.status,
            error: payload?.error ?? null,
          },
        });

        throw new Error(payload?.error ?? "Failed to add shopping list item");
      }

      const payload = (await response.json()) as {
        items?: ShoppingListApiItem[];
      };

      setShoppingListItems(
        Array.isArray(payload.items) ? mapShoppingListItems(payload.items) : [],
      );
      if (payload.items) {
        setCurrentShoppingList(
          (prev) =>
            prev ?? {
              id: "current",
              title: t("greeting.actions.shoppingList"),
              description: null,
              status: "active",
            },
        );
      }
      await loadCurrentShoppingList();
    },
    [loadCurrentShoppingList, mapShoppingListItems, t],
  );

  const handleCompleteShoppingList = useCallback(async () => {
    if (!currentShoppingList?.id || isCompletingShoppingList) {
      return;
    }

    setIsCompletingShoppingList(true);

    try {
      const response = await fetch(
        `/api/shopping-lists/${currentShoppingList.id}/checkout-to-pantry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "checked_only",
            completeList: true
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(payload?.error ?? "Failed to complete shopping list");
      }

      toast.success(t("basic.shoppingList.completeSuccess") || "Nákup uložený do špajze!");

      setCheckedItemIds(new Set());

      await refreshPantrySummary();
      await loadCurrentShoppingList();
    } catch (error) {
      logger.warn("Failed to complete shopping list", {
        context: "HomePage",
        metadata: {
          shoppingListId: currentShoppingList.id,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setIsCompletingShoppingList(false);
    }
  }, [
    currentShoppingList?.id,
    isCompletingShoppingList,
    loadCurrentShoppingList,
    refreshPantrySummary,
    t,
  ]);

  const handleKitchenCounterBack = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(
        KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY,
      );
    }

    setSelectedKitchenCounter(null);
    setActiveSection("home");
  }, []);

  return (
    <div className="min-h-screen bg-eatrivo-white-primary flex">
      <WelcomeDialog
        open={showWelcomeDialog}
        onOpenChange={handleCloseDialog}
        version={APP_CONFIG.WELCOME_DIALOG_VERSION}
        changelog={
          APP_CONFIG.WELCOME_DIALOG_CHANGELOG[APP_CONFIG.WELCOME_DIALOG_VERSION]
        }
      />
      <HomeSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <HomeHeader onSectionChange={setActiveSection} />
      <main
        className={`flex-1 w-full md:max-w-[calc(100vw-256px)] h-[100dvh] ${
          primaryActiveSection === "chatWithRivo"
            ? "overflow-hidden p-0"
            : "pt-20 md:pt-8 pb-[calc(100px+env(safe-area-inset-bottom))] md:pb-8 px-4 md:px-8 overflow-y-auto"
        }`}
      >
        <AnimatePresence mode="wait">
          {isHomeSection(activeSection) ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto space-y-6"
            >
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {t("greeting.title", {
                    name: session?.user?.name?.split(" ")[0] || "",
                  })}
                </h1>
                <div className="mt-4 w-full rounded-2xl border border-eatrivo-black-primary/10 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="relative h-12 overflow-hidden rounded-xl px-4 text-sm font-semibold active:scale-[0.98]"
                      onClick={() => handleHomeSectionChange("home.recipes")}
                    >
                      {activeHomeSection === "home.recipes" ? (
                        <motion.span
                          layoutId="home-section-switch"
                          className="absolute inset-0 rounded-xl bg-eatrivo-purple shadow-[0_10px_30px_rgba(139,92,246,0.28)]"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 32,
                            mass: 0.8,
                          }}
                        />
                      ) : null}
                      <span
                        className={`relative z-10 transition-colors duration-300 ${
                          activeHomeSection === "home.recipes"
                            ? "text-white"
                            : "text-eatrivo-purple/75"
                        }`}
                      >
                        {t("greeting.actions.recipes")}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="relative h-12 overflow-hidden rounded-xl px-4 text-sm font-semibold active:scale-[0.98]"
                      onClick={() =>
                        handleHomeSectionChange("home.shoppingList")
                      }
                    >
                      {activeHomeSection === "home.shoppingList" ? (
                        <motion.span
                          layoutId="home-section-switch"
                          className="absolute inset-0 rounded-xl bg-eatrivo-purple shadow-[0_10px_30px_rgba(139,92,246,0.28)]"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 32,
                            mass: 0.8,
                          }}
                        />
                      ) : null}
                      <span
                        className={`relative z-10 transition-colors duration-300 ${
                          activeHomeSection === "home.shoppingList"
                            ? "text-white"
                            : "text-eatrivo-purple/75"
                        }`}
                      >
                        {t("greeting.actions.shoppingList")}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {activeHomeSection === "home.shoppingList" ? (
                  <motion.div
                    key="home-shopping-list"
                    initial={{ opacity: 0, y: 14, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.985 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-8 rounded-2xl border border-eatrivo-purple/10 bg-white p-4 shadow-sm sm:p-6 md:p-8"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06, duration: 0.22 }}
                      className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        {isEditingTitle ? (
                          <div className="flex items-center gap-2">
                            <input
                              ref={titleInputRef}
                              type="text"
                              value={editTitleValue}
                              onChange={(e) =>
                                setEditTitleValue(e.target.value)
                              }
                              onBlur={() => {
                                void handleSaveTitle();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  void handleSaveTitle();
                                }
                                if (e.key === "Escape") {
                                  setIsEditingTitle(false);
                                }
                              }}
                              className="w-full rounded-lg border border-eatrivo-purple/30 bg-eatrivo-purple/5 px-3 py-1.5 text-xl font-semibold text-gray-900 outline-none focus:border-eatrivo-purple focus:ring-2 focus:ring-eatrivo-purple/20 transition-all"
                              maxLength={200}
                            />
                          </div>
                        ) : (
                          <div className="group flex items-center gap-2">
                            <h2
                              className="text-xl font-semibold text-gray-900 cursor-pointer"
                              onClick={
                                currentShoppingList?.id
                                  ? handleStartEditTitle
                                  : undefined
                              }
                              role={
                                currentShoppingList?.id ? "button" : undefined
                              }
                              tabIndex={currentShoppingList?.id ? 0 : undefined}
                              onKeyDown={(e) => {
                                if (
                                  (e.key === "Enter" || e.key === " ") &&
                                  currentShoppingList?.id
                                ) {
                                  e.preventDefault();
                                  handleStartEditTitle();
                                }
                              }}
                            >
                              {currentShoppingList?.title ||
                                t("greeting.actions.shoppingList")}
                            </h2>
                            {currentShoppingList?.id ? (
                              <button
                                type="button"
                                onClick={handleStartEditTitle}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                                aria-label={t(
                                  "basic.shoppingList.editTitleLabel",
                                )}
                              >
                                <Pencil className="h-4 w-4 text-gray-400" />
                              </button>
                            ) : null}
                          </div>
                        )}
                        <p className="mt-2 text-sm text-gray-500">
                          {t("basic.shoppingList.description")}
                        </p>
                      </div>
                      <div className="inline-flex w-fit shrink-0 rounded-full bg-eatrivo-purple/10 px-3 py-1 text-xs font-semibold text-eatrivo-purple">
                        {shoppingListItems.length}{" "}
                        {t("basic.shoppingList.itemsCount")}
                      </div>
                    </motion.div>

                    {/* Progress bar */}
                    {shoppingListItems.length > 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.22 }}
                        className="mt-5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500">
                            {t("basic.shoppingList.progressLabel", {
                              checked: totalChecked,
                              total: shoppingListItems.length,
                            })}
                          </span>
                          {allItemsChecked ? (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 20,
                              }}
                              className="text-xs font-bold text-eatrivo-green"
                            >
                              {t("basic.shoppingList.allDone")}
                            </motion.span>
                          ) : null}
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <motion.div
                            className="h-full rounded-full bg-eatrivo-green"
                            initial={{ width: "0%" }}
                            animate={{
                              width:
                                shoppingListItems.length > 0
                                  ? `${(totalChecked / shoppingListItems.length) * 100}%`
                                  : "0%",
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                          />
                        </div>
                      </motion.div>
                    ) : null}

                    {/* Done button — only enabled when all items checked */}
                    {shoppingListItems.length > 0 && currentShoppingList?.id ? (
                      <div className="mt-4 flex">
                        <Button
                          type="button"
                          onClick={() => {
                            void handleCompleteShoppingList();
                          }}
                          disabled={
                            isCompletingShoppingList || !allItemsChecked
                          }
                          className={`h-11 w-full rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-300 sm:ml-auto sm:h-auto sm:w-auto ${
                            allItemsChecked
                              ? "bg-eatrivo-green hover:bg-eatrivo-green/90 shadow-[0_4px_20px_rgba(34,197,94,0.3)]"
                              : "bg-gray-300 cursor-not-allowed"
                          }`}
                        >
                          {isCompletingShoppingList
                            ? t("basic.shoppingList.completing")
                            : t("basic.shoppingList.doneButton")}
                        </Button>
                      </div>
                    ) : null}

                    {shoppingListItems.length > 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.24 }}
                        className="mt-6 space-y-5 sm:space-y-6"
                      >
                        {shoppingListCategories.map((category) => {
                          const Icon =
                            SHOPPING_CATEGORY_ICONS[category] ?? Package;
                          const categoryItems =
                            shoppingListItemsByCategory[category] ?? [];
                          const categoryChecked = categoryItems.filter((item) =>
                            checkedItemIds.has(item.id ?? ""),
                          ).length;
                          // Sort: unchecked first, checked last
                          const sortedCategoryItems = [...categoryItems].sort(
                            (a, b) => {
                              const aChecked = checkedItemIds.has(a.id ?? "")
                                ? 1
                                : 0;
                              const bChecked = checkedItemIds.has(b.id ?? "")
                                ? 1
                                : 0;
                              return aChecked - bChecked;
                            },
                          );

                          return (
                            <div key={category} className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2.5 px-1">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-eatrivo-purple/10 text-eatrivo-purple">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-black tracking-tight text-[#1a1a2e]">
                                  {getShoppingCategoryLabel(category)}
                                </h3>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                                    categoryChecked === categoryItems.length &&
                                    categoryItems.length > 0
                                      ? "bg-eatrivo-green/10 text-eatrivo-green"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {categoryChecked}/{categoryItems.length}
                                </span>
                              </div>

                              <div className="grid gap-2">
                                <AnimatePresence mode="popLayout">
                                  {sortedCategoryItems.map((item) => {
                                    const itemKey = item.id ?? item.name;
                                    const isChecked = checkedItemIds.has(
                                      item.id ?? "",
                                    );

                                    return (
                                      <motion.div
                                        key={itemKey}
                                        layout
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.92 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 400,
                                          damping: 30,
                                        }}
                                        className={`flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors duration-200 sm:items-center sm:px-4 ${
                                          isChecked
                                            ? "border-eatrivo-green/20 bg-eatrivo-green/5"
                                            : "border-gray-100 bg-gray-50"
                                        }`}
                                      >
                                        {/* Check button — 44x44 touch target (thumb zone) */}
                                        <button
                                          type="button"
                                          aria-label={
                                            isChecked
                                              ? "Uncheck item"
                                              : "Check item"
                                          }
                                          onClick={() =>
                                            toggleCheckItem(item.id ?? "")
                                          }
                                          className="flex h-11 w-11 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                                        >
                                          <motion.span
                                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                                              isChecked
                                                ? "border-eatrivo-green bg-eatrivo-green"
                                                : "border-gray-300 bg-white"
                                            }`}
                                            whileTap={{ scale: 0.85 }}
                                          >
                                            <AnimatePresence mode="wait">
                                              {isChecked ? (
                                                <motion.span
                                                  key="check"
                                                  initial={{
                                                    scale: 0,
                                                    opacity: 0,
                                                  }}
                                                  animate={{
                                                    scale: 1,
                                                    opacity: 1,
                                                  }}
                                                  exit={{
                                                    scale: 0,
                                                    opacity: 0,
                                                  }}
                                                  transition={{
                                                    type: "spring",
                                                    stiffness: 500,
                                                    damping: 20,
                                                  }}
                                                >
                                                  <Check
                                                    className="h-4 w-4 text-white"
                                                    strokeWidth={3}
                                                  />
                                                </motion.span>
                                              ) : null}
                                            </AnimatePresence>
                                          </motion.span>
                                        </button>

                                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                          <span
                                            className={`min-w-0 break-words pr-1 text-sm font-medium leading-snug transition-all duration-200 sm:truncate sm:pr-0 ${
                                              isChecked
                                                ? "text-gray-400 line-through"
                                                : "text-gray-800"
                                            }`}
                                          >
                                            {item.name}
                                          </span>
                                          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-1.5">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  void handleEditQuantity(item.id ?? "", item.quantity);
                                              }}
                                              aria-label="Edit quantity"
                                              className={`max-w-full rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-center leading-tight ring-1 transition-all duration-200 whitespace-normal break-words sm:whitespace-nowrap cursor-pointer hover:bg-gray-50 active:scale-95 ${
                                                isChecked
                                                  ? "text-gray-400 ring-gray-150"
                                                  : "text-gray-500 hover:text-eatrivo-purple hover:ring-eatrivo-purple/30 ring-gray-200/70"
                                              } ${!item.quantity ? "px-3" : ""}`}
                                            >
                                              {item.quantity || "+"}
                                            </button>
                                            {/* Remove item button */}
                                            <button
                                              type="button"
                                              aria-label={t(
                                                "basic.shoppingList.removeItemLabel",
                                              )}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                void handleRemoveItem(
                                                  item.id ?? "",
                                                );
                                              }}
                                              disabled={
                                                isRemovingItemId === item.id
                                              }
                                              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:h-7 sm:w-7 ${
                                                isRemovingItemId === item.id
                                                  ? "bg-red-100 cursor-not-allowed"
                                                  : "hover:bg-red-50 active:bg-red-100 active:scale-90"
                                              }`}
                                            >
                                              <X
                                                className={`h-3.5 w-3.5 transition-colors ${
                                                  isRemovingItemId === item.id
                                                    ? "text-red-300"
                                                    : "text-gray-400 hover:text-red-500"
                                                }`}
                                              />
                                            </button>
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </AnimatePresence>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.24 }}
                        className="mt-6 rounded-2xl border border-dashed border-eatrivo-purple/20 bg-eatrivo-purple/5 px-6 py-10 text-center"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {t("basic.shoppingList.emptyTitle")}
                        </p>
                        <p className="mt-2 text-sm text-gray-500">
                          {t("basic.shoppingList.emptyDescription")}
                        </p>
                      </motion.div>
                    )}

                  </motion.div>
                ) : (
                  <motion.div
                    key="home-recipes"
                    initial={{ opacity: 0, y: 16, scale: 0.992 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.992 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="relative w-full min-h-[360px] rounded-2xl overflow-hidden shadow-sm mb-8 bg-white border border-gray-100 xl:min-h-[420px] transition-all duration-300 hover:border-gray-200 hover:shadow-md">
                      {activeRecipe ? (
                        <div
                          className={`relative h-full bg-gradient-to-br ${getCategoryAccent(activeRecipe.categoryKey)}`}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.15),transparent_40%)]" />
                          <div className="relative p-6 sm:p-8 flex h-full min-h-[360px] flex-col justify-between text-white">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-3 max-w-2xl">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <span className="rounded-full bg-[#1a1a2e]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-sm backdrop-blur-md">
                                    {t("basic.hero.badge")}
                                  </span>
                                  <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-sm backdrop-blur-md">
                                    {activeRecipe.category}
                                  </span>
                                  {activeRecipe.mealPrepFriendly ? (
                                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-sm backdrop-blur-md">
                                      {t("basic.hero.mealPrep")}
                                    </span>
                                  ) : null}
                                </div>

                                <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
                                  {activeRecipe.title}
                                </h2>

                                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/90">
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    {activeRecipe.totalTimeMin}{" "}
                                    {t("time.minutesShort")}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Flame className="w-4 h-4" />
                                    {activeRecipe.calories} kcal
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Beef className="w-4 h-4" />
                                    {activeRecipe.proteinG}g{" "}
                                    {t("nutrition.protein").toLowerCase()}
                                  </span>
                                </div>
                              </div>

                              <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/20 backdrop-blur-md shadow-lg shadow-black/5 ring-1 ring-white/30">
                                <CookingPot className="h-8 w-8 text-white drop-shadow-sm" />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 max-w-xl">
                              <div className="rounded-2xl bg-white/20 p-3.5 backdrop-blur-md shadow-sm ring-1 ring-white/30 flex flex-col justify-center">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/90">
                                  {t("nutrition.protein")}
                                </p>
                                <p className="mt-0.5 text-xl font-black drop-shadow-sm">
                                  {activeRecipe.proteinG}g
                                </p>
                              </div>
                              <div className="rounded-2xl bg-white/20 p-3.5 backdrop-blur-md shadow-sm ring-1 ring-white/30 flex flex-col justify-center">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/90">
                                  {t("nutrition.carbs")}
                                </p>
                                <p className="mt-0.5 text-xl font-black drop-shadow-sm">
                                  {activeRecipe.carbsG}g
                                </p>
                              </div>
                              <div className="rounded-2xl bg-white/20 p-3.5 backdrop-blur-md shadow-sm ring-1 ring-white/30 flex flex-col justify-center">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/90">
                                  {t("nutrition.fats")}
                                </p>
                                <p className="mt-0.5 text-xl font-black drop-shadow-sm">
                                  {activeRecipe.fatG}g
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full min-h-[360px] rounded-2xl bg-white border border-gray-100 p-8 flex flex-col justify-center text-center">
                          <Sparkles className="w-10 h-10 text-eatrivo-purple mx-auto mb-4" />
                          <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            {t("mealPlan.empty.title")}
                          </h2>
                          <p className="text-gray-500">
                            {t("mealPlan.empty.description")}
                          </p>
                        </div>
                      )}
                    </div>
                    <RivoCustomRecipeExperience
                      onOpenPantry={() => {
                        triggerHaptic("light");
                        setActiveSection("pantry");
                      }}
                      onAddToShoppingList={handleAddToShoppingList}
                      onCookRecipe={handleCookRecipe}
                    />

                    {/* Middle Section: Pantry & Recent */}
                    {/* Unified Pantry Dashboard */}
                    <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 group transition-colors hover:border-gray-200 relative overflow-hidden">
                      {/* Header Section */}
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10">
                        <div>
                          <div className="flex items-center gap-2 text-eatrivo-purple mb-4">
                            <div className="p-2 bg-eatrivo-purple/10 rounded-lg">
                              <Archive className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                              {t("basic.pantryDashboard.badge")}
                            </span>
                          </div>

                          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-none mb-2">
                            {livePantrySummary.itemCount}{" "}
                            <span className="text-gray-400 font-medium">
                              {t("basic.pantryDashboard.itemsUnit")}
                            </span>
                          </h2>

                          <p className="text-sm text-gray-500">
                            {t("basic.pantryDashboard.cookablePrefix")}
                            <strong className="text-eatrivo-purple font-semibold">
                              {livePantrySummary.cookableCount}
                            </strong>
                            {t("basic.pantryDashboard.cookableSuffix")}
                          </p>
                        </div>

                        {/* Desktop CTA */}
                        <div className="hidden md:block shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveSection("pantry")}
                            className="px-6 py-2.5 rounded-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white text-sm font-bold shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                          >
                            {t("basic.pantryDashboard.openCta")}
                            <span className="text-white/50 text-[10px] ml-1">
                              →
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Cookable Recipes Carousel */}
                      <div className="relative z-10 -mx-6 sm:-mx-8 px-6 sm:px-8">
                        {enrichedCookableRecipes.length > 0 ? (
                          <div
                            className="flex overflow-x-auto gap-4 pb-6 snap-x hide-scrollbar"
                            style={{
                              msOverflowStyle: "none",
                              scrollbarWidth: "none",
                            }}
                          >
                            {enrichedCookableRecipes.map((recipe) => (
                              <div
                                key={recipe.id}
                                className="min-w-[140px] max-w-[140px] flex flex-col gap-3 snap-start cursor-pointer group/recipe"
                                onClick={() => {
                                  const idx = enrichedCookableRecipes.findIndex(
                                    (r) => r.id === recipe.id,
                                  );
                                  openRecipeBrowser(
                                    "cookable",
                                    idx !== -1 ? idx : 0,
                                  );
                                }}
                              >
                                <div className="w-full aspect-[4/5] rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex flex-col justify-between group-hover/recipe:scale-[1.03] group-hover/recipe:-translate-y-1 group-hover/recipe:border-gray-200 group-hover/recipe:shadow-md transition-all duration-300 ease-out">
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-eatrivo-purple bg-eatrivo-purple/10 px-2 py-1 rounded-md">
                                      {recipe.category}
                                    </span>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md">
                                      <Clock className="w-3 h-3 text-gray-400" />
                                      {recipe.totalTimeMin}
                                    </div>
                                  </div>
                                  <div className="mt-auto">
                                    <h4 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 mb-3 group-hover/recipe:text-eatrivo-purple transition-colors">
                                      {recipe.title}
                                    </h4>
                                    <div className="flex items-baseline gap-1.5">
                                      <p className="text-xl font-bold leading-none text-gray-900">
                                        {recipe.proteinG}g
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mb-6 rounded-2xl bg-white border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                              <Archive className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {t("basic.cookableEmpty.title")}
                            </p>
                            <p className="text-xs text-gray-500 max-w-[250px]">
                              {t("basic.cookableEmpty.description")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Almost Cookable Recipes */}
                      {enrichedAlmostCookableRecipes.length > 0 && (
                        <div className="relative z-10 mt-2">
                          <div className="flex items-center justify-between gap-3 mb-4 px-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                              <h3 className="text-sm font-bold text-gray-900">
                                {t("basic.almostCookable.title")}
                              </h3>
                              <span className="text-[11px] font-bold text-gray-400 truncate">
                                {t("basic.almostCookable.subtitle")}
                              </span>
                            </div>

                            {enrichedAlmostCookableRecipes.length > 1 ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    scrollAlmostCookableRecipes(-1)
                                  }
                                  className="h-7 w-7 rounded-full border border-amber-200 bg-white text-amber-600 shadow-sm transition-all hover:bg-amber-50 active:scale-95 flex items-center justify-center"
                                  aria-label={t(
                                    "basic.almostCookable.scrollLeft",
                                  )}
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => scrollAlmostCookableRecipes(1)}
                                  className="h-7 w-7 rounded-full border border-amber-200 bg-white text-amber-600 shadow-sm transition-all hover:bg-amber-50 active:scale-95 flex items-center justify-center"
                                  aria-label={t(
                                    "basic.almostCookable.scrollRight",
                                  )}
                                >
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div
                            ref={almostCookableScrollRef}
                            className="flex overflow-x-auto gap-4 pb-4 -mx-6 sm:-mx-8 px-6 sm:px-8 snap-x hide-scrollbar"
                            style={{
                              msOverflowStyle: "none",
                              scrollbarWidth: "none",
                            }}
                          >
                            {enrichedAlmostCookableRecipes.map((recipe) => (
                              <div
                                key={recipe.id}
                                className="min-w-[160px] max-w-[160px] flex flex-col gap-3 snap-start cursor-pointer group/almost"
                                onClick={() => {
                                  const idx =
                                    enrichedAlmostCookableRecipes.findIndex(
                                      (r) => r.id === recipe.id,
                                    );
                                  openRecipeBrowser(
                                    "almost",
                                    idx !== -1 ? idx : 0,
                                  );
                                }}
                              >
                                <div className="w-full aspect-[4/5] rounded-2xl bg-white border border-amber-100 shadow-sm p-4 flex flex-col justify-between group-hover/almost:scale-[1.03] group-hover/almost:-translate-y-1 group-hover/almost:border-amber-200 transition-all duration-300 ease-out">
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                      {recipe.category}
                                    </span>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md">
                                      <Clock className="w-3 h-3 text-gray-400" />
                                      {recipe.totalTimeMin}
                                    </div>
                                  </div>
                                  <div className="mt-auto">
                                    <h4 className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 mb-2 group-hover/almost:text-amber-600 transition-colors">
                                      {recipe.title}
                                    </h4>
                                    {recipe.missingIngredients &&
                                      recipe.missingIngredients.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {recipe.missingIngredients
                                            .slice(0, 2)
                                            .map((ing) => (
                                              <span
                                                key={ing}
                                                className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md truncate max-w-[90px]"
                                              >
                                                − {ing}
                                              </span>
                                            ))}
                                          {recipe.missingIngredients.length >
                                            2 && (
                                            <span className="text-[9px] font-bold text-amber-500">
                                              +
                                              {recipe.missingIngredients
                                                .length - 2}
                                            </span>
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
                          onClick={() => setActiveSection("pantry")}
                          className="w-full py-3 rounded-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white text-sm font-bold shadow-sm active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {t("basic.pantryDashboard.openCta")}
                        </button>
                      </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="pb-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 px-1">
                        {t("basic.filters.title")}
                      </h3>
                      <div
                        className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar whitespace-nowrap px-1"
                        style={{
                          msOverflowStyle: "none",
                          scrollbarWidth: "none",
                        }}
                      >
                        {availableFilters.map((filter) => {
                          const isSelected = selectedFilter === filter;
                          const icon =
                            filter === "quick"
                              ? Clock
                              : filter === "high-protein"
                                ? Beef
                                : filter === "vegetarian" || filter === "vegan"
                                  ? Leaf
                                  : filter === "all"
                                    ? Salad
                                    : Flame;
                          const Icon = icon;

                          return (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setSelectedFilter(filter)}
                              className={`px-5 py-2.5 rounded-full text-[13px] font-bold flex items-center gap-2 transition-all duration-300 ease-out active:scale-95 border ${
                                isSelected
                                  ? "bg-eatrivo-purple text-white border-eatrivo-purple shadow-lg shadow-eatrivo-purple/20"
                                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm"
                              }`}
                            >
                              {getRecipeTagLabel(filter)}
                              <Icon
                                className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-400"}`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Filtered Recipes Grid */}
                    <div className="pb-8">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredRecipes.map((recipe) => (
                          <div
                            key={recipe.id}
                            className="flex flex-col gap-2 cursor-pointer"
                            onClick={() => {
                              const idx = filteredRecipes.findIndex(
                                (r) => r.id === recipe.id,
                              );
                              openRecipeBrowser(
                                "filtered",
                                idx !== -1 ? idx : 0,
                              );
                            }}
                          >
                            <div className="w-full aspect-[4/5] rounded-[1.5rem] overflow-hidden shadow-lg shadow-eatrivo-purple/5 bg-white p-5 flex flex-col justify-between group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-500 ease-out group-hover:shadow-eatrivo-purple/15 ring-1 ring-gray-100">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-eatrivo-purple bg-eatrivo-purple/10 px-2.5 py-1.5 rounded-md">
                                  {recipe.category}
                                </span>
                                <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  {recipe.totalTimeMin} {t("time.minutesShort")}
                                </div>
                              </div>

                              <div className="mt-auto">
                                <h4 className="text-base font-bold text-gray-900 leading-tight line-clamp-2 mb-4 group-hover:text-eatrivo-purple transition-colors">
                                  {recipe.title}
                                </h4>
                                <div className="flex items-baseline gap-1.5">
                                  <p className="text-2xl font-bold text-gray-900 leading-none">
                                    {recipe.proteinG}g
                                  </p>
                                  <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                                    {t("nutrition.protein")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredRecipes.length === 0 && (
                          <div className="col-span-full py-8 text-center text-gray-400 text-sm">
                            {t("basic.filters.empty")}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : primaryActiveSection === "pantry" ? (
            <motion.div
              key="pantry"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              <PantrySection onPantryChanged={refreshPantrySummary} />
            </motion.div>
          ) : primaryActiveSection === "profile" ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full -mx-4 md:-mx-8 md:-my-8"
            >
              <ProfilePageClient onBack={() => setActiveSection("home")} />
            </motion.div>
          ) : primaryActiveSection === "chatWithRivo" ? (
            <motion.div
              key="chatWithRivo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ChatWithRivoPage />
            </motion.div>
          ) : primaryActiveSection === "kitchenCounter" ? (
            <motion.div
              key="kitchenCounter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full max-w-7xl mx-auto p-0 md:px-4 md:py-6"
            >
              <KitchenCounterPage
                recipe={selectedKitchenCounter}
                onBack={handleKitchenCounterBack}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
      <MobileNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <PWAInstallPrompt />
      <NotificationBanner />
      {isHomeSection(activeSection) && (
        <div className="hidden md:block">
          <FeedbackButton />
        </div>
      )}
      <RecipeBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        recipes={browserRecipes}
        initialIndex={browserIndex}
        onAddToShoppingList={handleAddToShoppingList}
        onCookRecipe={handleCookRecipe}
      />
    </div>
  );
}
