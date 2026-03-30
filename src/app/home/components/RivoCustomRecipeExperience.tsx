"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertCircle,
  Beef,
  Bookmark,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplet,
  Flame,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Users,
  Wheat,
  X,
} from "lucide-react";

import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import {
  customRecipeAcceptResponseSchema,
  customRecipeCurrentGenerationResponseSchema,
  customRecipeLatestResultResponseSchema,
  customRecipeStreamEventSchema,
} from "@/lib/custom-recipes/contracts";
import type { RecipeIngredientItem } from "@/lib/recipe-ingredients";
import type { RecipeInstruction } from "@/lib/recipe-instructions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

export type CustomRecipeGenerationStatus =
  | "idle"
  | "generating"
  | "success"
  | "fallback-empty"
  | "error";

type CustomRecipeMealType = "breakfast" | "lunch" | "dinner" | "snack";

interface CustomRecipeRequestPreferences {
  servings: number;
  mealType: CustomRecipeMealType;
  mealPrep: boolean;
}

interface CustomRecipeApiMessageDescriptor {
  key: string;
  values?: Record<string, string | number | boolean>;
}

interface CustomRecipeApiIngredientItem {
  name: string;
  amount: string | null;
  category?: string | null;
  quantityValue?: number | null;
  unit?: string | null;
  ingredientKey?: string | null;
  ingredientSpecificKey?: string | null;
  pantryMatchName?: string | null;
  pantryComparison?: RecipeIngredientItem["pantryComparison"] | null;
}

interface CustomRecipeApiMatchedIngredient {
  recipeIngredientName: string;
  pantryIngredientName: string | null;
  matchType: "exact" | "fallback";
  displayName: string;
  amount: string | null;
}

interface CustomRecipeApiGeneratedRecipe {
  status: "available";
  kind: "pantry" | "almost_cookable";
  name: string;
  category: string;
  description: string;
  servings: number;
  servingUnit: string | null;
  prepTimeMin: number;
  totalTimeMin: number;
  difficulty: "easy" | "medium" | "hard";
  mealPrepFriendly: boolean;
  tags: string[];
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  ingredientItems: CustomRecipeApiIngredientItem[];
  instructions: RecipeInstruction[];
  matchedIngredients?: CustomRecipeApiMatchedIngredient[];
  matchedIngredientNames: string[];
  missingIngredientNames: string[];
}

interface CustomRecipeApiUnavailableRecipe {
  status: "unavailable";
  reason:
    | "INSUFFICIENT_PANTRY"
    | "AI_UNABLE_TO_COMPOSE"
    | "PANTRY_EMPTY"
    | "DIETARY_CONSTRAINTS";
  message: CustomRecipeApiMessageDescriptor;
}

type CustomRecipeApiRecipe =
  | CustomRecipeApiGeneratedRecipe
  | CustomRecipeApiUnavailableRecipe;

interface CustomRecipeApiSuggestion {
  kind: "suggestion";
  availability: "pantry" | "almost_cookable";
  id: string;
  slug: string;
  externalKey: string;
  name: string;
  category: string;
  categoryKey: string;
  servings: number;
  servingUnit: string | null;
  prepTimeMin: number;
  totalTimeMin: number;
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  instructions: RecipeInstruction[];
  ingredientItems: CustomRecipeApiIngredientItem[];
  mealPrepFriendly: boolean;
  totalRequiredIngredients: number;
  matchedRequiredIngredients: number;
  missingRequiredIngredients: number;
  matchRatio: number;
  matchedIngredientNames: string[];
  missingIngredientNames: string[];
}

interface CustomRecipeApiResultPayload {
  pantryRecipe: CustomRecipeApiRecipe;
  almostCookableRecipe: CustomRecipeApiRecipe;
  fallbackDatabaseSuggestions: CustomRecipeApiSuggestion[];
  userMessage: CustomRecipeApiMessageDescriptor;
  meta: {
    locale: "en" | "sk";
    pantryItemCount: number;
    pantryIngredientKeyCount: number;
    fallbackUsed: boolean;
    retryCount: number;
  };
}

export interface CustomRecipeFallbackRecommendation {
  id: string;
  title: string;
  category: string;
  availability?: "pantry" | "almost_cookable";
  missingCount?: number;
  totalTimeMin?: number;
  proteinG?: number;
}

export interface CustomRecipeAdaptedResult {
  recipes: BasicHomeRecipePreview[];
  fallbackRecipes: BasicHomeRecipePreview[];
  fallbackRecommendations: CustomRecipeFallbackRecommendation[];
  userMessage?: CustomRecipeApiMessageDescriptor;
}

export type CustomRecipeFallbackItem =
  | CustomRecipeFallbackRecommendation
  | { title: string; description?: string | null };

export interface CustomRecipeHeroSnapshot {
  status: CustomRecipeGenerationStatus;
  progress: number;
  displayTip: string;
  result: CustomRecipeAdaptedResult | null;
  error: string | null;
  userMessage: string | null;
  fallbackRecommendations: CustomRecipeFallbackItem[];
}

interface RivoCustomRecipeExperienceProps {
  onOpenPantry: () => void;
  onAddToShoppingList?: (
    ingredientName: string,
    quantity: string | null,
    category: string | null,
  ) => Promise<void>;
  onCookRecipe?: (recipe: BasicHomeRecipePreview) => void;
  showPrimaryCta?: boolean;
  showPanel?: boolean;
  onStatusChange?: (status: CustomRecipeGenerationStatus) => void;
  onStateChange?: (snapshot: CustomRecipeHeroSnapshot) => void;
}

export interface RivoCustomRecipeExperienceHandle {
  generate: () => void;
  openResultRecipe: (index?: number) => void;
  openFallbackRecipe: (recommendationId: string) => void;
  openPantry: () => void;
}

const CUSTOM_RECIPE_START_ENDPOINT = "/api/recipes/custom/generate";
const CUSTOM_RECIPE_ACCEPT_ENDPOINT = "/api/recipes/custom/accept";
const CUSTOM_RECIPE_LATEST_ENDPOINT = "/api/recipes/custom/latest";
const CUSTOM_RECIPE_MOCK_STORAGE_KEY = "eatrivo:customRecipeMock";
const CUSTOM_RECIPE_STATE_STORAGE_KEY = "eatrivo:customRecipeState";
const DEFAULT_CATEGORY_KEY = "lunch-and-dinner";
const DEFAULT_REQUEST_PREFERENCES: CustomRecipeRequestPreferences = {
  servings: 2,
  mealType: "dinner",
  mealPrep: false,
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PersistedCustomRecipeState {
  version: 1;
  savedAt: number;
  locale: string;
  status: Exclude<CustomRecipeGenerationStatus, "generating">;
  rawResultPayload: CustomRecipeApiResultPayload | null;
  error: string | null;
}

function getCategoryGradient(categoryKey: string): string {
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
      return "from-purple-600 via-fuchsia-500 to-pink-500";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload) || typeof payload.error !== "string") {
    return null;
  }

  return payload.error;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isPersistedRecipeId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function normalizeResultPayload(payload: unknown): CustomRecipeApiResultPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (isRecord(payload.result)) {
    return payload.result as unknown as CustomRecipeApiResultPayload;
  }

  if ("pantryRecipe" in payload || "almostCookableRecipe" in payload) {
    return payload as unknown as CustomRecipeApiResultPayload;
  }

  return null;
}

function readMockPayload(): CustomRecipeApiResultPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawMockPayload = window.sessionStorage.getItem(
    CUSTOM_RECIPE_MOCK_STORAGE_KEY,
  );

  if (!rawMockPayload) {
    return null;
  }

  const parsedPayload = JSON.parse(rawMockPayload) as unknown;
  const normalizedPayload = normalizeResultPayload(parsedPayload);

  if (!normalizedPayload) {
    throw new Error("Custom recipe mock payload is invalid.");
  }

  return normalizedPayload;
}

function readPersistedCustomRecipeState(
  locale: string,
): PersistedCustomRecipeState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawState = window.sessionStorage.getItem(CUSTOM_RECIPE_STATE_STORAGE_KEY);

  if (!rawState) {
    return null;
  }

  try {
    const parsedState = JSON.parse(rawState) as Partial<PersistedCustomRecipeState>;

    if (
      parsedState.version !== 1 ||
      typeof parsedState.savedAt !== "number" ||
      typeof parsedState.locale !== "string" ||
      parsedState.locale !== locale ||
      !parsedState.status
    ) {
      return null;
    }

    return {
      version: 1,
      savedAt: parsedState.savedAt,
      locale: parsedState.locale,
      status: parsedState.status,
      rawResultPayload:
        normalizeResultPayload(parsedState.rawResultPayload) ?? null,
      error: typeof parsedState.error === "string" ? parsedState.error : null,
    };
  } catch {
    return null;
  }
}

function persistCustomRecipeState(snapshot: PersistedCustomRecipeState) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    CUSTOM_RECIPE_STATE_STORAGE_KEY,
    JSON.stringify(snapshot),
  );
}

function clearPersistedCustomRecipeState() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(CUSTOM_RECIPE_STATE_STORAGE_KEY);
}

async function fetchLatestCustomRecipeState(
  locale: string,
): Promise<PersistedCustomRecipeState | null> {
  const response = await fetch(CUSTOM_RECIPE_LATEST_ENDPOINT, {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 204 || response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Custom recipe latest result request failed.");
  }

  const payload = await response.json().catch(() => null);
  const parsed = customRecipeLatestResultResponseSchema.safeParse(payload);

  if (!parsed.success || parsed.data.result.meta.locale !== locale) {
    return null;
  }

  return {
    version: 1,
    savedAt: Date.parse(parsed.data.createdAt),
    locale,
    status: (
      parsed.data.result.pantryRecipe.status !== "available" &&
        parsed.data.result.almostCookableRecipe.status !== "available")
      ? "fallback-empty"
      : "success",
    rawResultPayload: parsed.data.result,
    error: null,
  };
}

function adaptIngredientItem(
  ingredient: CustomRecipeApiIngredientItem,
): RecipeIngredientItem | null {
  const name = readString(ingredient.name);

  if (!name) {
    return null;
  }

  return {
    name,
    amount: readString(ingredient.amount),
    category: readString(ingredient.category),
    quantityValue:
      typeof ingredient.quantityValue === "number" &&
      Number.isFinite(ingredient.quantityValue)
        ? ingredient.quantityValue
        : null,
    unit: readString(ingredient.unit),
    ingredientKey: readString(ingredient.ingredientKey),
    ingredientSpecificKey: readString(ingredient.ingredientSpecificKey),
    pantryComparison: ingredient.pantryComparison ?? null,
  };
}

function buildMatchedIngredients(
  matchedIngredients: CustomRecipeApiMatchedIngredient[] | undefined,
  matchedIngredientNames: string[],
  ingredientItems: RecipeIngredientItem[],
): NonNullable<BasicHomeRecipePreview["matchedIngredients"]> | undefined {
  if (matchedIngredients && matchedIngredients.length > 0) {
    return matchedIngredients.map((ingredient) => ({
      recipeIngredientName: ingredient.recipeIngredientName,
      pantryIngredientName: ingredient.pantryIngredientName,
      matchType: ingredient.matchType,
      displayName: ingredient.displayName,
      amount: ingredient.amount,
    }));
  }

  const ingredientByName = new Map(
    ingredientItems.map((ingredient) => [
      ingredient.name.trim().toLowerCase(),
      ingredient,
    ]),
  );

    const fallbackMatchedIngredients = matchedIngredientNames.map((ingredientName) => {
    const ingredient = ingredientByName.get(ingredientName.trim().toLowerCase());

    return {
      recipeIngredientName: ingredientName,
      pantryIngredientName: ingredientName,
      matchType: "exact" as const,
      displayName: ingredient?.name ?? ingredientName,
      amount: ingredient?.amount ?? null,
    };
  });

  return fallbackMatchedIngredients.length > 0
    ? fallbackMatchedIngredients
    : undefined;
}

function adaptGeneratedRecipe(
  recipe: CustomRecipeApiGeneratedRecipe,
  fallbackId: string,
): BasicHomeRecipePreview {
  const ingredientItems = recipe.ingredientItems
    .map((ingredient) => adaptIngredientItem(ingredient))
    .filter((ingredient): ingredient is RecipeIngredientItem => ingredient !== null);

  return {
    id: fallbackId,
    slug: toSlug(recipe.name) || fallbackId,
    title: recipe.name,
    category: recipe.category,
    categoryKey: DEFAULT_CATEGORY_KEY,
    servings: recipe.servings,
    totalTimeMin: recipe.totalTimeMin,
    calories: recipe.calories,
    proteinG: recipe.proteinG,
    carbsG: recipe.carbohydratesG,
    fatG: recipe.fatG,
    restrictionFlags: [],
    instructions: recipe.instructions,
    dietTags: recipe.tags,
    ingredientItems,
    ingredientPreview:
      recipe.matchedIngredientNames.length > 0
        ? recipe.matchedIngredientNames
        : ingredientItems.map((ingredient) => ingredient.name).slice(0, 4),
    matchedIngredients: buildMatchedIngredients(
      recipe.matchedIngredients,
      recipe.matchedIngredientNames,
      ingredientItems,
    ),
    mealPrepFriendly: recipe.mealPrepFriendly,
    missingIngredients:
      recipe.missingIngredientNames.length > 0
        ? recipe.missingIngredientNames
        : undefined,
  };
}

function adaptFallbackRecommendation(
  recipe: CustomRecipeApiSuggestion,
): CustomRecipeFallbackRecommendation {
  return {
    id: recipe.id,
    title: recipe.name,
    category: recipe.category,
    availability: recipe.availability,
    missingCount: recipe.missingIngredientNames.length,
    totalTimeMin: recipe.totalTimeMin,
    proteinG: recipe.proteinG,
  };
}

function adaptSuggestionRecipe(
  recipe: CustomRecipeApiSuggestion,
): BasicHomeRecipePreview {
  const ingredientItems = recipe.ingredientItems
    .map((ingredient) => adaptIngredientItem(ingredient))
    .filter((ingredient): ingredient is RecipeIngredientItem => ingredient !== null);

  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.name,
    category: recipe.category,
    categoryKey: recipe.categoryKey || DEFAULT_CATEGORY_KEY,
    servings: recipe.servings,
    totalTimeMin: recipe.totalTimeMin,
    calories: recipe.calories,
    proteinG: recipe.proteinG,
    carbsG: recipe.carbohydratesG,
    fatG: recipe.fatG,
    restrictionFlags: [],
    instructions: recipe.instructions,
    dietTags: [],
    ingredientItems,
    ingredientPreview:
      recipe.matchedIngredientNames.length > 0
        ? recipe.matchedIngredientNames
        : ingredientItems.map((ingredient) => ingredient.name).slice(0, 4),
    matchedIngredients: buildMatchedIngredients(
      undefined,
      recipe.matchedIngredientNames,
      ingredientItems,
    ),
    mealPrepFriendly: recipe.mealPrepFriendly,
    missingIngredients:
      recipe.missingIngredientNames.length > 0
        ? recipe.missingIngredientNames
        : undefined,
  };
}

function resolveMessageDescriptor(
  t: ReturnType<typeof useTranslations>,
  descriptor?: CustomRecipeApiMessageDescriptor | null,
): string | null {
  if (!descriptor?.key) {
    return null;
  }

  try {
    const values = descriptor.values
      ? Object.fromEntries(
          Object.entries(descriptor.values).map(([key, value]) => [
            key,
            typeof value === "boolean" ? String(value) : value,
          ]),
        )
      : undefined;

    return t(descriptor.key, values);
  } catch {
    return null;
  }
}

function mapCustomRecipeError(
  t: ReturnType<typeof useTranslations>,
  errorCodeOrMessage: string,
): string {
  const normalized = errorCodeOrMessage.trim();

  switch (normalized) {
    case "AUTH_REQUIRED":
      return t("basic.customRecipe.error.codes.AUTH_REQUIRED");
    case "RATE_LIMITED":
      return t("basic.customRecipe.error.codes.RATE_LIMITED");
    case "PROFILE_NOT_FOUND":
    case "PROFILE_FETCH_FAILED":
    case "PROFILE_DETAILS_NOT_FOUND":
      return t("basic.customRecipe.error.codes.PROFILE_UNAVAILABLE");
    case "PANTRY_FETCH_FAILED":
    case "PANTRY_EMPTY":
      return t("basic.customRecipe.error.codes.PANTRY_UNAVAILABLE");
    case "GENERATION_IN_PROGRESS":
      return t("basic.customRecipe.error.codes.GENERATION_IN_PROGRESS");
    case "GENERATION_INTERRUPTED":
      return t("basic.customRecipe.error.codes.GENERATION_INTERRUPTED");
    case "GENERATION_NOT_FOUND":
    case "GENERATION_RESULT_NOT_READY":
    case "GENERATION_FAILED":
      return t("basic.customRecipe.error.codes.GENERATION_FAILED");
    default:
      if (normalized.toLowerCase().includes("timed out")) {
        return t("basic.customRecipe.error.codes.TIMEOUT");
      }

      return t("basic.customRecipe.error.codes.DEFAULT");
  }
}

function adaptCustomRecipeResponse(
  payload: CustomRecipeApiResultPayload,
): CustomRecipeAdaptedResult {
  const pantryRecipe =
    payload.pantryRecipe.status === "available"
      ? adaptGeneratedRecipe(payload.pantryRecipe, "generated-pantry-recipe")
      : null;
  const almostCookableRecipe =
    payload.almostCookableRecipe.status === "available"
      ? adaptGeneratedRecipe(
          payload.almostCookableRecipe,
          "generated-almost-cookable-recipe",
        )
      : null;

  return {
    recipes: [pantryRecipe, almostCookableRecipe].filter(
      (recipe): recipe is BasicHomeRecipePreview => recipe !== null,
    ),
    fallbackRecipes: payload.fallbackDatabaseSuggestions.map((recipe) =>
      adaptSuggestionRecipe(recipe),
    ),
    fallbackRecommendations: payload.fallbackDatabaseSuggestions.map((recipe) =>
      adaptFallbackRecommendation(recipe),
    ),
    userMessage: payload.userMessage,
  };
}

const RivoCustomRecipeExperience = forwardRef<
  RivoCustomRecipeExperienceHandle,
  RivoCustomRecipeExperienceProps
>(function RivoCustomRecipeExperience({
  onOpenPantry,
  onAddToShoppingList,
  onCookRecipe,
  showPrimaryCta = true,
  showPanel = true,
  onStatusChange,
  onStateChange,
}: RivoCustomRecipeExperienceProps, ref) {
  const t = useTranslations("home");
  const locale = useLocale();
  const shouldReduceMotion = useReducedMotion();
  const triggerHaptic = useHapticFeedback();
  const requestIdRef = useRef(0);
  const activeRequestControllerRef = useRef<AbortController | null>(null);

  const [status, setStatus] = useState<CustomRecipeGenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [result, setResult] = useState<CustomRecipeAdaptedResult | null>(null);
  const [rawResultPayload, setRawResultPayload] =
    useState<CustomRecipeApiResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestPreferences, setRequestPreferences] =
    useState<CustomRecipeRequestPreferences>(DEFAULT_REQUEST_PREFERENCES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogIndex, setDialogIndex] = useState(0);
  const [dialogRecipes, setDialogRecipes] = useState<BasicHomeRecipePreview[]>([]);
  const [dialogDirection, setDialogDirection] = useState(0);
  const [selectedMissingIngredients, setSelectedMissingIngredients] = useState<Set<string>>(
    new Set(),
  );
  const [bookmarkedRecipeId, setBookmarkedRecipeId] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkPending, setIsBookmarkPending] = useState(false);

  const customRecipeTips = useMemo(
    () => [
      t("basic.customRecipe.loading.tips.scanning"),
      t("basic.customRecipe.loading.tips.matching"),
      t("basic.customRecipe.loading.tips.finishing"),
    ],
    [t],
  );
  const displayTip =
    customRecipeTips[tipIndex % customRecipeTips.length] ?? customRecipeTips[0] ?? "";
  const fallbackRecommendations = useMemo<CustomRecipeFallbackItem[]>(
    () =>
      result?.fallbackRecommendations.length
        ? result.fallbackRecommendations
        : [
            { title: t("basic.customRecipe.fallback.defaultSuggestions.pantry") },
            { title: t("basic.customRecipe.fallback.defaultSuggestions.protein") },
            { title: t("basic.customRecipe.fallback.defaultSuggestions.vegetables") },
          ],
    [result?.fallbackRecommendations, t],
  );
  const userMessage = resolveMessageDescriptor(t, result?.userMessage);
  const activeDialogRecipe = dialogRecipes[dialogIndex] ?? null;
  const hasNextDialogRecipe = dialogIndex < dialogRecipes.length - 1;
  const hasPreviousDialogRecipe = dialogIndex > 0;
  const mealTypeOptions = useMemo(
    () => [
      {
        value: "breakfast" as const,
        label: t("basic.customRecipe.setup.mealTypes.breakfast"),
      },
      {
        value: "lunch" as const,
        label: t("basic.customRecipe.setup.mealTypes.lunch"),
      },
      {
        value: "dinner" as const,
        label: t("basic.customRecipe.setup.mealTypes.dinner"),
      },
      {
        value: "snack" as const,
        label: t("basic.customRecipe.setup.mealTypes.snack"),
      },
    ],
    [t],
  );

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    onStateChange?.({
      status,
      progress,
      displayTip,
      result,
      error,
      userMessage,
      fallbackRecommendations,
    });
  }, [
    displayTip,
    error,
    fallbackRecommendations,
    onStateChange,
    progress,
    result,
    status,
    userMessage,
  ]);

  useEffect(() => {
    if (status !== "generating" || customRecipeTips.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % customRecipeTips.length);
    }, 2500);

    return () => {
      window.clearInterval(interval);
    };
  }, [customRecipeTips.length, status]);

  useEffect(() => {
    if (status !== "generating") {
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 99) {
          return current;
        }

        return Math.min(99, current + (current < 65 ? 2 : 1));
      });
    }, 1500);

    return () => {
      window.clearInterval(interval);
    };
  }, [status]);

  useEffect(() => {
    if (!dialogOpen) {
      setSelectedMissingIngredients(new Set());
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (!dialogOpen || !activeDialogRecipe) {
      setBookmarkedRecipeId(null);
      setIsBookmarked(false);
      setIsBookmarkPending(false);
      return;
    }

    if (!isPersistedRecipeId(activeDialogRecipe.id)) {
      setBookmarkedRecipeId(null);
      setIsBookmarked(false);
      return;
    }

    let isCancelled = false;

    setBookmarkedRecipeId(activeDialogRecipe.id);
    setIsBookmarkPending(true);

    void fetch(`/api/recipes/${activeDialogRecipe.id}/bookmark`, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            readErrorMessage(payload) ?? "Bookmark status request failed.",
          );
        }

        if (isCancelled) {
          return;
        }

        setIsBookmarked(Boolean((payload as { bookmarked?: boolean } | null)?.bookmarked));
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setIsBookmarked(false);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsBookmarkPending(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeDialogRecipe, dialogOpen]);

  useEffect(() => {
    const persistedState = readPersistedCustomRecipeState(locale);

    if (!persistedState) {
      let isCancelled = false;

      void fetchLatestCustomRecipeState(locale)
        .then((latestState) => {
          if (!latestState || isCancelled) {
            return;
          }

          const adaptedResult = latestState.rawResultPayload
            ? adaptCustomRecipeResponse(latestState.rawResultPayload)
            : null;

          setError(latestState.error);
          setRawResultPayload(latestState.rawResultPayload);
          setResult(adaptedResult);
          setProgress(latestState.rawResultPayload ? 100 : 0);
          setStatus(latestState.status);
          persistCustomRecipeState(latestState);
        })
        .catch(() => {
          // Passive restore failure should not break the component.
        });

      return () => {
        isCancelled = true;
      };
    }

    setError(persistedState.error);

    if (persistedState.rawResultPayload) {
      const adaptedResult = adaptCustomRecipeResponse(persistedState.rawResultPayload);
      setRawResultPayload(persistedState.rawResultPayload);
      setResult(adaptedResult);
      setProgress(100);
      setStatus(persistedState.status);
      return;
    }

    setRawResultPayload(null);
    setResult(null);
    setProgress(0);
    setStatus(persistedState.status);

    return undefined;
  }, [locale]);

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    if (status === "generating") {
      clearPersistedCustomRecipeState();
      return;
    }

    persistCustomRecipeState({
      version: 1,
      savedAt: Date.now(),
      locale,
      status,
      rawResultPayload,
      error,
    });
  }, [error, locale, rawResultPayload, status]);

  useEffect(() => {
    return () => {
      activeRequestControllerRef.current?.abort();
      activeRequestControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (status !== "generating") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [status]);

  useEffect(() => {
    let isCancelled = false;

    const inspectActiveGeneration = async () => {
      const response = await fetch(CUSTOM_RECIPE_START_ENDPOINT, {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(payload) ?? "Custom recipe generation state request failed.",
        );
      }

      const parsed = customRecipeCurrentGenerationResponseSchema.safeParse(payload);
      if (!parsed.success || isCancelled || !parsed.data.isGenerating) {
        return;
      }

      setStatus("error");
      setProgress(parsed.data.progress ?? 0);
      setError(mapCustomRecipeError(t, "GENERATION_INTERRUPTED"));
      toast.info(t("basic.customRecipe.error.codes.GENERATION_INTERRUPTED"), {
        duration: 4000,
      });
    };

    void inspectActiveGeneration().catch(() => {
      // Passive inspection failures should not break the primary flow.
    });

    return () => {
      isCancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && hasNextDialogRecipe) {
        setDialogDirection(1);
        setDialogIndex((current) => current + 1);
      }

      if (event.key === "ArrowLeft" && hasPreviousDialogRecipe) {
        setDialogDirection(-1);
        setDialogIndex((current) => current - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogOpen, hasNextDialogRecipe, hasPreviousDialogRecipe]);

  const consumeRecipeStream = useCallback(
    async (response: Response, requestId: number) => {
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | Record<string, unknown>
          | null;
        throw new Error(
          readErrorMessage(payload) ?? "Custom recipe request failed.",
        );
      }

      if (!response.body) {
        throw new Error("Custom recipe stream is unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (requestIdRef.current !== requestId) {
          throw new Error("__stale_request__");
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) {
            continue;
          }

          let parsedEvent: unknown;
          try {
            parsedEvent = JSON.parse(trimmedLine);
          } catch {
            throw new Error("Custom recipe stream response is invalid.");
          }

          const parsed = customRecipeStreamEventSchema.safeParse(parsedEvent);
          if (!parsed.success) {
            throw new Error("Custom recipe stream event is invalid.");
          }

          const streamEvent = parsed.data;

          if (streamEvent.type === "progress") {
            setProgress((current) =>
              Math.max(Math.min(streamEvent.progress, 100), current),
            );
            continue;
          }

          if (streamEvent.type === "error") {
            throw new Error(streamEvent.code || streamEvent.message);
          }

          return streamEvent.result as CustomRecipeApiResultPayload;
        }
      }

      if (buffer.trim().length > 0) {
        const parsedEvent = JSON.parse(buffer) as unknown;
        const parsed = customRecipeStreamEventSchema.safeParse(parsedEvent);
        if (!parsed.success) {
          throw new Error("Custom recipe stream event is invalid.");
        }

        const streamEvent = parsed.data;

        if (streamEvent.type === "final") {
          return streamEvent.result as CustomRecipeApiResultPayload;
        }

        if (streamEvent.type === "error") {
          throw new Error(streamEvent.code || streamEvent.message);
        }
      }

      throw new Error("GENERATION_INTERRUPTED");
    },
    [],
  );

  const openRecipeDialog = useCallback(
    (recipes: BasicHomeRecipePreview[], index = 0) => {
      if (!recipes.length) {
        return;
      }

      setDialogRecipes(recipes);
      setDialogIndex(index);
      setDialogDirection(0);
      setDialogOpen(true);
    },
    [],
  );

  const replaceRecipeReference = useCallback(
    (
      previousRecipeId: string,
      persistedRecipe: { recipeId: string; slug?: string },
    ) => {
      const replaceRecipe = (recipe: BasicHomeRecipePreview) => {
        if (recipe.id !== previousRecipeId) {
          return recipe;
        }

        return {
          ...recipe,
          id: persistedRecipe.recipeId,
          slug: persistedRecipe.slug ?? recipe.slug,
        };
      };

      setResult((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          recipes: current.recipes.map(replaceRecipe),
          fallbackRecipes: current.fallbackRecipes.map(replaceRecipe),
        };
      });
      setDialogRecipes((current) => current.map(replaceRecipe));
    },
    [],
  );

  const getGeneratedRecipeFromPreview = useCallback(
    (recipe: BasicHomeRecipePreview) => {
      if (!rawResultPayload) {
        return null;
      }

      if (
        recipe.id === "generated-pantry-recipe" &&
        rawResultPayload.pantryRecipe.status === "available"
      ) {
        return rawResultPayload.pantryRecipe;
      }

      if (
        recipe.id === "generated-almost-cookable-recipe" &&
        rawResultPayload.almostCookableRecipe.status === "available"
      ) {
        return rawResultPayload.almostCookableRecipe;
      }

      return null;
    },
    [rawResultPayload],
  );

  const persistGeneratedRecipeForBookmark = useCallback(
    async (recipe: BasicHomeRecipePreview) => {
      const generatedRecipe = getGeneratedRecipeFromPreview(recipe);

      if (!generatedRecipe) {
        return null;
      }

      const response = await fetch(CUSTOM_RECIPE_ACCEPT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          locale: rawResultPayload?.meta.locale ?? locale,
          recipe: generatedRecipe,
          waitForPersist: true,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(payload) ?? "Custom recipe persistence failed.",
        );
      }

      const parsedResponse = customRecipeAcceptResponseSchema.safeParse(payload);

      if (!parsedResponse.success || !parsedResponse.data.recipeId) {
        throw new Error("Persisted recipe id is missing.");
      }

      return parsedResponse.data;
    },
    [getGeneratedRecipeFromPreview, locale, rawResultPayload?.meta.locale],
  );

  const applyCompletedPayload = useCallback(
    (payload: CustomRecipeApiResultPayload) => {
      const adaptedResult = adaptCustomRecipeResponse(payload);
      setRawResultPayload(payload);
      setResult(adaptedResult);
      setProgress(100);

      if (adaptedResult.recipes.length > 0) {
        setStatus("success");
        openRecipeDialog(adaptedResult.recipes, 0);
        toast.success(t("basic.customRecipe.toasts.ready"), { duration: 3000 });
      } else {
        setStatus("fallback-empty");
        toast.info(t("basic.customRecipe.toasts.empty"), { duration: 3000 });
      }
    },
    [openRecipeDialog, t],
  );

  const handleGenerate = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    triggerHaptic("medium");
    clearPersistedCustomRecipeState();
    setRequestDialogOpen(false);
    setDialogOpen(false);
    setStatus("generating");
    setProgress(12);
    setTipIndex(0);
    setResult(null);
    setRawResultPayload(null);
    setError(null);

    try {
      activeRequestControllerRef.current?.abort();
      const controller = new AbortController();
      activeRequestControllerRef.current = controller;

      const mockPayload = readMockPayload();

      if (mockPayload) {
        await delay(1400);

        if (requestIdRef.current !== requestId) {
          return;
        }

        applyCompletedPayload(mockPayload);

        return;
      }

      const response = await fetch(CUSTOM_RECIPE_START_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          servings: requestPreferences.servings,
          mealType: requestPreferences.mealType,
          mealPrep: requestPreferences.mealPrep,
        }),
        signal: controller.signal,
      });

      const completedPayload = await consumeRecipeStream(response, requestId);

      if (requestIdRef.current !== requestId) {
        return;
      }

      applyCompletedPayload(completedPayload);
    } catch (generationError) {
      if (
        generationError instanceof DOMException &&
        generationError.name === "AbortError"
      ) {
        return;
      }

      if (
        generationError instanceof Error &&
        generationError.message === "__stale_request__"
      ) {
        return;
      }

      if (requestIdRef.current !== requestId) {
        return;
      }

      setStatus("error");
      setProgress(0);
      setError(
        mapCustomRecipeError(
          t,
          generationError instanceof Error
            ? generationError.message
            : "Custom recipe generation failed.",
        ),
      );
      toast.error(t("basic.customRecipe.toasts.error"));
    } finally {
      activeRequestControllerRef.current = null;
    }
  }, [
    applyCompletedPayload,
    consumeRecipeStream,
    locale,
    requestPreferences.mealPrep,
    requestPreferences.mealType,
    requestPreferences.servings,
    t,
    triggerHaptic,
  ]);

  const handleOpenRequestDialog = useCallback(() => {
    if (status === "generating") {
      return;
    }

    triggerHaptic("light");
    setRequestDialogOpen(true);
  }, [status, triggerHaptic]);

  const handleRequestDialogOpenChange = useCallback((open: boolean) => {
    if (status === "generating" && open) {
      return;
    }

    setRequestDialogOpen(open);
  }, [status]);

  const handleConfirmGenerate = useCallback(() => {
    void handleGenerate();
  }, [handleGenerate]);

  const handleOpenResultRecipe = useCallback(
    (index = 0) => {
      const recipes = result?.recipes ?? [];

      if (!recipes.length || index < 0 || index >= recipes.length) {
        return;
      }

      triggerHaptic("light");
      openRecipeDialog(recipes, index);
    },
    [openRecipeDialog, result?.recipes, triggerHaptic],
  );

  const handleOpenFallbackRecipe = useCallback(
    (recommendationId: string) => {
      const fallbackRecipes = result?.fallbackRecipes ?? [];

      const recipeIndex = fallbackRecipes.findIndex(
        (recipe) => recipe.id === recommendationId,
      );

      if (recipeIndex === -1) {
        return;
      }

      triggerHaptic("light");
      openRecipeDialog(fallbackRecipes, recipeIndex);
    },
    [openRecipeDialog, result, triggerHaptic],
  );

  const handleOpenPantry = useCallback(() => {
    triggerHaptic("light");
    setDialogOpen(false);
    onOpenPantry();
  }, [onOpenPantry, triggerHaptic]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      generate: () => {
        handleOpenRequestDialog();
      },
      openResultRecipe: (index = 0) => {
        handleOpenResultRecipe(index);
      },
      openFallbackRecipe: (recommendationId: string) => {
        handleOpenFallbackRecipe(recommendationId);
      },
      openPantry: () => {
        handleOpenPantry();
      },
    }),
    [handleOpenFallbackRecipe, handleOpenPantry, handleOpenRequestDialog, handleOpenResultRecipe],
  );

  const handleNextDialogRecipe = useCallback(() => {
    if (!hasNextDialogRecipe) {
      return;
    }

    setDialogDirection(1);
    setDialogIndex((current) => current + 1);
  }, [hasNextDialogRecipe]);

  const handlePreviousDialogRecipe = useCallback(() => {
    if (!hasPreviousDialogRecipe) {
      return;
    }

    setDialogDirection(-1);
    setDialogIndex((current) => current - 1);
  }, [hasPreviousDialogRecipe]);

  const handleSelectMissingIngredient = useCallback(
    async (name: string, quantity: string | null, category: string | null) => {
      if (!onAddToShoppingList) {
        return;
      }

      setSelectedMissingIngredients((previous) => new Set(previous).add(name));

      try {
        await onAddToShoppingList(name, quantity, category);
      } catch {
        setSelectedMissingIngredients((previous) => {
          const next = new Set(previous);
          next.delete(name);
          return next;
        });
      }
    },
    [onAddToShoppingList],
  );

  const persistAcceptedGeneratedRecipe = useCallback(
    (recipe: BasicHomeRecipePreview) => {
      const generatedRecipe = getGeneratedRecipeFromPreview(recipe);

      if (!generatedRecipe) {
        return;
      }

      void fetch(CUSTOM_RECIPE_ACCEPT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          locale: rawResultPayload?.meta.locale ?? locale,
          recipe: generatedRecipe,
          waitForPersist: false,
        }),
      }).catch(() => null);
    },
    [getGeneratedRecipeFromPreview, rawResultPayload?.meta.locale],
  );

  const handleToggleBookmark = useCallback(async () => {
    if (!activeDialogRecipe || isBookmarkPending) {
      return;
    }

    triggerHaptic("light");
    setIsBookmarkPending(true);

    const previousBookmarked = isBookmarked;
    let recipeId = isPersistedRecipeId(activeDialogRecipe.id)
      ? activeDialogRecipe.id
      : bookmarkedRecipeId;

    try {
      if (!recipeId) {
        const persistedRecipe = await persistGeneratedRecipeForBookmark(
          activeDialogRecipe,
        );

        if (!persistedRecipe?.recipeId) {
          throw new Error("Persisted recipe id is missing.");
        }

        recipeId = persistedRecipe.recipeId;
        setBookmarkedRecipeId(recipeId);
        replaceRecipeReference(activeDialogRecipe.id, {
          recipeId,
          slug: persistedRecipe.slug,
        });
      }

      const response = await fetch(`/api/recipes/${recipeId}/bookmark`, {
        method: previousBookmarked ? "DELETE" : "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          readErrorMessage(payload) ?? "Bookmark request failed.",
        );
      }

      setIsBookmarked(!previousBookmarked);
      toast.success(
        locale === "sk"
          ? previousBookmarked
            ? "Recept bol odstranený zo záložiek."
            : "Recept bol uložený do záložiek."
          : previousBookmarked
            ? "Recipe removed from bookmarks."
            : "Recipe saved to bookmarks.",
      );
    } catch (bookmarkError) {
      setIsBookmarked(previousBookmarked);
      toast.error(
        locale === "sk"
          ? "Záložku sa nepodarilo uložiť."
          : "Could not update bookmark.",
      );
      console.error("[CustomRecipe] bookmark toggle failed", bookmarkError);
    } finally {
      setIsBookmarkPending(false);
    }
  }, [
    activeDialogRecipe,
    bookmarkedRecipeId,
    isBookmarked,
    isBookmarkPending,
    locale,
    persistGeneratedRecipeForBookmark,
    replaceRecipeReference,
    triggerHaptic,
  ]);

  const handleCookGeneratedRecipe = useCallback(
    (recipe: BasicHomeRecipePreview) => {
      setDialogOpen(false);
      persistAcceptedGeneratedRecipe(recipe);
      onCookRecipe?.(recipe);
    },
    [onCookRecipe, persistAcceptedGeneratedRecipe],
  );

  const fadeIn = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.4, ease: "easeOut" as const },
      };
  const dialogSlideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <>
      {showPanel ? (
        <div className="mb-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-gray-200 md:p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={status} {...fadeIn} className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      status === "generating"
                        ? "bg-eatrivo-purple/10"
                        : status === "success"
                          ? "bg-eatrivo-green/10"
                          : status === "fallback-empty"
                            ? "bg-eatrivo-orange/10"
                            : status === "error"
                              ? "bg-eatrivo-red/10"
                              : "bg-eatrivo-blue/10"
                    }`}
                  >
                    {status === "error" ? (
                      <AlertCircle className="h-5 w-5 text-eatrivo-red" />
                    ) : status === "success" ? (
                      <ChefHat className="h-5 w-5 text-eatrivo-green" />
                    ) : (
                      <Sparkles
                        className={`h-5 w-5 ${
                          status === "generating"
                            ? "text-eatrivo-purple"
                            : status === "fallback-empty"
                              ? "text-eatrivo-orange"
                              : "text-eatrivo-blue"
                        }`}
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {status === "generating"
                        ? t("basic.customRecipe.loading.badge")
                        : status === "success"
                          ? t("basic.customRecipe.result.badge")
                          : status === "fallback-empty"
                            ? t("basic.customRecipe.fallback.badge")
                            : status === "error"
                              ? t("basic.customRecipe.error.badge")
                              : t("basic.customRecipe.badge")}
                    </p>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {status === "generating"
                        ? t("basic.customRecipe.loading.title")
                        : status === "success"
                          ? t("basic.customRecipe.result.title")
                          : status === "fallback-empty"
                            ? t("basic.customRecipe.fallback.title")
                            : status === "error"
                              ? t("basic.customRecipe.error.title")
                              : t("basic.customRecipe.title")}
                    </h2>
                    <p className="max-w-2xl text-sm text-gray-600">
                      {status === "generating"
                        ? t("basic.customRecipe.loading.description")
                        : status === "success" && result
                          ? t("basic.customRecipe.result.description", {
                              count: result.recipes.length,
                            })
                          : status === "fallback-empty"
                            ? t("basic.customRecipe.fallback.description")
                            : status === "error"
                              ? t("basic.customRecipe.error.description")
                              : t("basic.customRecipe.description")}
                    </p>
                    {userMessage && status !== "idle" ? (
                      <p className="text-sm text-gray-500">{userMessage}</p>
                    ) : null}
                  </div>
                </div>

                {showPrimaryCta || status === "fallback-empty" || status === "error" ? (
                  <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                    {showPrimaryCta ? (
                      <Button
                        type="button"
                        onClick={() => {
                          handleOpenRequestDialog();
                        }}
                        disabled={status === "generating"}
                        className="rounded-full bg-eatrivo-purple px-6 text-white hover:bg-eatrivo-purple/90 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                      >
                        {status === "generating"
                          ? t("basic.customRecipe.ctaGenerating")
                          : status === "idle"
                            ? t("basic.customRecipe.cta")
                            : status === "fallback-empty"
                              ? t("basic.customRecipe.fallback.retry")
                              : status === "error"
                                ? t("basic.customRecipe.error.retry")
                                : t("basic.customRecipe.result.regenerate")}
                      </Button>
                    ) : null}

                    {status === "fallback-empty" || status === "error" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleOpenPantry}
                        className="rounded-full border border-gray-200 text-gray-700 hover:bg-eatrivo-white-secondary focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                      >
                        {t("basic.customRecipe.fallback.openPantry")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {status === "generating" ? (
                <div className="space-y-4" role="status" aria-live="polite">
                  <div className="rounded-2xl bg-eatrivo-white-secondary p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {t("basic.customRecipe.loading.progressLabel")}
                      </span>
                      <span className="text-sm font-bold text-eatrivo-purple">
                        {Math.round(progress)}%
                      </span>
                    </div>

                    <div
                      className="h-2 rounded-full bg-white"
                      role="progressbar"
                      aria-label={t("basic.customRecipe.loading.progressLabel")}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progress)}
                    >
                      <motion.div
                        className="h-full rounded-full bg-eatrivo-purple"
                        animate={
                          shouldReduceMotion
                            ? {}
                            : { width: `${Math.max(progress, 8)}%` }
                        }
                        style={{ width: `${Math.max(progress, 8)}%` }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      />
                    </div>

                    <div className="rounded-2xl border border-eatrivo-purple/10 bg-eatrivo-purple/5 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                        {t("basic.customRecipe.loading.tipsLabel")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {displayTip}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {status === "success" && result ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {result.recipes.map((recipe, index) => {
                      const isAlmostCookable =
                        Array.isArray(recipe.missingIngredients) &&
                        recipe.missingIngredients.length > 0;

                      return (
                        <button
                          type="button"
                          key={recipe.id}
                          onClick={() => {
                            triggerHaptic("light");
                            openRecipeDialog(result.recipes, index);
                          }}
                          className="rounded-2xl border border-gray-100 bg-eatrivo-white-primary p-4 text-left transition-all duration-200 hover:border-eatrivo-purple/30 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/40 focus-visible:ring-offset-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                                {isAlmostCookable
                                  ? t("basic.customRecipe.result.almostCookable")
                                  : t("basic.customRecipe.result.readyNow")}
                              </p>
                              <h4 className="mt-1 text-base font-semibold text-gray-900">
                                {recipe.title}
                              </h4>
                            </div>
                            <span className="rounded-full bg-eatrivo-purple/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-eatrivo-purple">
                              {recipe.category}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-eatrivo-green/10 px-2.5 py-1 text-xs font-medium text-eatrivo-green">
                              {recipe.proteinG}g {t("nutrition.protein").toLowerCase()}
                            </span>
                            <span className="rounded-full bg-eatrivo-orange/10 px-2.5 py-1 text-xs font-medium text-eatrivo-orange">
                              {recipe.totalTimeMin} {t("time.minutesShort")}
                            </span>
                            <span className="rounded-full bg-eatrivo-purple/10 px-2.5 py-1 text-xs font-medium text-eatrivo-purple">
                              {t("basic.customRecipe.result.open")}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {status === "fallback-empty" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    {fallbackRecommendations.map((recommendation) => (
                      <button
                        type="button"
                        key={
                          "id" in recommendation && recommendation.id
                            ? recommendation.id
                            : recommendation.title
                        }
                        onClick={() => {
                          if ("id" in recommendation && recommendation.id) {
                            handleOpenFallbackRecipe(recommendation.id);
                          }
                        }}
                        disabled={!("id" in recommendation && recommendation.id)}
                        className="rounded-2xl border border-eatrivo-orange/10 bg-eatrivo-orange/5 p-4 text-left transition-colors hover:border-eatrivo-orange/30 disabled:cursor-default disabled:hover:border-eatrivo-orange/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {recommendation.title}
                          </p>
                          {"category" in recommendation && recommendation.category ? (
                            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-eatrivo-orange ring-1 ring-eatrivo-orange/10">
                              {recommendation.category}
                            </span>
                          ) : null}
                        </div>

                        {"availability" in recommendation &&
                        recommendation.availability ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-eatrivo-purple/10 px-2.5 py-1 text-xs font-medium text-eatrivo-purple">
                              {recommendation.availability === "pantry"
                                ? t("basic.customRecipe.result.readyNow")
                                : t("basic.customRecipe.fallback.missingCount", {
                                    count: recommendation.missingCount ?? 0,
                                  })}
                            </span>
                            {recommendation.totalTimeMin ? (
                              <span className="rounded-full bg-eatrivo-orange/10 px-2.5 py-1 text-xs font-medium text-eatrivo-orange">
                                {recommendation.totalTimeMin} {t("time.minutesShort")}
                              </span>
                            ) : null}
                          </div>
                        ) : "description" in recommendation &&
                          recommendation.description ? (
                          <p className="mt-2 text-sm text-gray-600">
                            {recommendation.description}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>

                </div>
              ) : null}

              {status === "error" ? (
                <div className="space-y-4">
                  {error ? (
                    <div className="rounded-2xl border border-eatrivo-red/10 bg-eatrivo-red/5 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                        {t("basic.customRecipe.error.detailLabel")}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">{error}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

                {status === "idle" ? null : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      ) : null}

      <Dialog open={requestDialogOpen} onOpenChange={handleRequestDialogOpenChange}>
        <DialogContent className="top-[50%] left-1/2 w-[calc(100vw-1.5rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] border-none bg-transparent p-0 shadow-none data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100">
          <motion.div
            initial={{
              y: shouldReduceMotion ? 0 : 22,
              opacity: shouldReduceMotion ? 1 : 0,
              scale: shouldReduceMotion ? 1 : 0.965,
            }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 340, damping: 28, mass: 0.82 }
            }
            className="flex max-h-[min(88dvh,48rem)] flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:rounded-[2rem]"
          >
            <div className="bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_38%,#f3e8ff_100%)] px-4 pb-4 pt-3 sm:px-7 sm:pb-5 sm:pt-7">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-eatrivo-purple ring-1 ring-eatrivo-purple/10">
                    {t("basic.customRecipe.badge")}
                  </div>
                  <DialogTitle className="pr-2 text-[1.65rem] font-black tracking-tight text-gray-900 sm:text-[1.75rem]">
                    {t("basic.customRecipe.setup.title")}
                  </DialogTitle>
                  <DialogDescription className="max-w-md text-sm leading-6 text-gray-600 sm:text-sm">
                    {t("basic.customRecipe.setup.description")}
                  </DialogDescription>
                </div>

              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-7 sm:py-7">
              <div className="space-y-4 sm:space-y-6">
                <div className="grid gap-4 sm:gap-5 sm:grid-cols-[1.1fr_1fr]">
                  <div className="space-y-3 rounded-3xl border border-orange-100 bg-orange-50/70 p-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                        {t("basic.customRecipe.setup.servingsLabel")}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {t("basic.customRecipe.setup.servingsHint")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 ring-1 ring-orange-100">
                      <button
                        type="button"
                        onClick={() => {
                          setRequestPreferences((current) => ({
                            ...current,
                            servings: Math.max(1, current.servings - 1),
                          }));
                        }}
                        disabled={requestPreferences.servings <= 1}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-eatrivo-orange transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <div className="min-w-[5.5rem] text-center">
                        <p className="text-3xl font-black tracking-tight text-gray-900 sm:text-3xl">
                          {requestPreferences.servings}
                        </p>
                        <p className="text-xs font-medium text-gray-500">
                          {requestPreferences.servings === 1
                            ? t("basic.recipeDialog.oneServing", {
                                count: requestPreferences.servings,
                              })
                            : t("basic.recipeDialog.servings", {
                                count: requestPreferences.servings,
                              })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setRequestPreferences((current) => ({
                            ...current,
                            servings: Math.min(8, current.servings + 1),
                          }));
                        }}
                        disabled={requestPreferences.servings >= 8}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-eatrivo-orange transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-3xl border border-purple-100 bg-purple-50/60 p-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                        {t("basic.customRecipe.setup.mealTypeLabel")}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {t("basic.customRecipe.setup.mealTypeHint")}
                      </p>
                    </div>

                    <Select
                      value={requestPreferences.mealType}
                      onValueChange={(value) => {
                        setRequestPreferences((current) => ({
                          ...current,
                          mealType: value as CustomRecipeMealType,
                        }));
                      }}
                    >
                      <SelectTrigger className="h-12 rounded-2xl border-purple-100 bg-white text-left shadow-none">
                        <SelectValue placeholder={t("basic.customRecipe.setup.mealTypePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {mealTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRequestPreferences((current) => ({
                      ...current,
                      mealPrep: !current.mealPrep,
                    }));
                  }}
                  className={`flex w-full items-start justify-between gap-4 rounded-3xl border px-4 py-4 text-left transition-colors ${
                    requestPreferences.mealPrep
                      ? "border-eatrivo-green/20 bg-eatrivo-green/5"
                      : "border-gray-200 bg-gray-50/70"
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {t("basic.customRecipe.setup.mealPrepLabel")}
                    </p>
                    <p className="text-sm leading-6 text-gray-600">
                      {t("basic.customRecipe.setup.mealPrepDescription")}
                    </p>
                  </div>

                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      requestPreferences.mealPrep
                        ? "border-eatrivo-green bg-eatrivo-green text-white"
                        : "border-gray-300 bg-white text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>

                <div className="rounded-3xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                    {t("basic.customRecipe.setup.profileHintLabel")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {t("basic.customRecipe.setup.profileHint")}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-6 sm:pt-4">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRequestDialogOpen(false)}
                  className="h-11 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 sm:h-10"
                >
                  {t("basic.customRecipe.setup.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmGenerate}
                  disabled={status === "generating"}
                  className="h-12 rounded-full bg-eatrivo-purple px-6 text-white hover:bg-eatrivo-purple/90 sm:h-10"
                >
                  {t("basic.customRecipe.setup.submit")}
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-eatrivo-white-primary p-0 gap-0 border-none shadow-2xl rounded-[2rem] sm:rounded-[2.5rem]"
        >
          {activeDialogRecipe ? (
            <>
              <div className="sticky top-0 z-30 flex items-center justify-between bg-eatrivo-white-primary/98 px-4 pt-4 pb-2">
                <button
                  type="button"
                  disabled={!hasPreviousDialogRecipe}
                  onClick={handlePreviousDialogRecipe}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-lg ring-1 ring-gray-200/50 transition-all hover:bg-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <span className="text-[12px] font-bold tracking-wider text-gray-400">
                  {dialogIndex + 1} / {dialogRecipes.length}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasNextDialogRecipe}
                    onClick={handleNextDialogRecipe}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-lg ring-1 ring-gray-200/50 transition-all hover:bg-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-lg ring-1 ring-gray-200/50 transition-all hover:bg-white active:scale-90"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait" custom={dialogDirection}>
                <motion.div
                  key={activeDialogRecipe.id}
                  custom={dialogDirection}
                  variants={dialogSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div
                    className={`relative mx-4 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${getCategoryGradient(activeDialogRecipe.categoryKey)} p-6 text-white sm:p-8`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_45%)]" />
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                            {activeDialogRecipe.category}
                          </span>
                          {activeDialogRecipe.mealPrepFriendly ? (
                            <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                              <Sparkles className="h-3 w-3" />
                              {t("basic.recipeDialog.mealPrep")}
                            </span>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            void handleToggleBookmark();
                          }}
                          disabled={isBookmarkPending}
                          aria-label={
                            isBookmarked ? "Remove bookmark" : "Save recipe"
                          }
                          title={isBookmarked ? "Remove bookmark" : "Save recipe"}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg ring-1 ring-white/30 backdrop-blur-md transition-all active:scale-95 disabled:cursor-wait disabled:opacity-70 ${
                            isBookmarked
                              ? "bg-white text-eatrivo-purple"
                              : "bg-white/18 text-white hover:bg-white/26"
                          }`}
                        >
                          {isBookmarkPending ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                          ) : (
                            <Bookmark
                              className={`h-4.5 w-4.5 ${isBookmarked ? "fill-current" : ""}`}
                            />
                          )}
                        </button>
                      </div>

                      <DialogTitle className="text-balance text-3xl font-black leading-[1.05] tracking-tighter text-white drop-shadow-sm sm:text-4xl">
                        {activeDialogRecipe.title}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        {t("basic.recipeDialog.detail")}
                      </DialogDescription>

                      <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-white/90">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {activeDialogRecipe.totalTimeMin} {t("time.minutesShort")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Flame className="h-4 w-4" />
                          {activeDialogRecipe.calories} kcal
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          {t("basic.recipeDialog.servings", { count: 1 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8 p-6 sm:p-8">
                    <div>
                      <h3 className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                        {t("recipe.nutritionValues")}
                        <div className="h-px flex-1 bg-gray-100" />
                      </h3>

                      <div className="grid grid-cols-4 gap-3">
                        {[
                          {
                            icon: Flame,
                            value: activeDialogRecipe.calories,
                            unit: "",
                            label: t("nutrition.calories"),
                            color: "text-orange-500 bg-orange-50",
                          },
                          {
                            icon: Beef,
                            value: activeDialogRecipe.proteinG,
                            unit: "g",
                            label: t("nutrition.protein"),
                            color: "text-green-600 bg-green-50",
                          },
                          {
                            icon: Wheat,
                            value: activeDialogRecipe.carbsG,
                            unit: "g",
                            label: t("nutrition.carbs"),
                            color: "text-amber-600 bg-amber-50",
                          },
                          {
                            icon: Droplet,
                            value: activeDialogRecipe.fatG,
                            unit: "g",
                            label: t("nutrition.fats"),
                            color: "text-rose-500 bg-rose-50",
                          },
                        ].map((macro) => (
                          <div
                            key={macro.label}
                            className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100"
                          >
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${macro.color}`}
                            >
                              <macro.icon className="h-4 w-4" />
                            </div>
                            <span className="text-xl font-black leading-none tracking-tight text-[#1a1a2e]">
                              {macro.value}
                              {macro.unit}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              {macro.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                        {t("recipe.ingredients")}
                        <div className="h-px flex-1 bg-gray-100" />
                      </h3>

                      {(() => {
                        const ingredientByName = new Map(
                          activeDialogRecipe.ingredientItems.map((ingredient) => [
                            ingredient.name.trim().toLowerCase(),
                            ingredient,
                          ]),
                        );

                        const resolveAmountLabel = (
                          ingredientName: string,
                          fallbackAmount: string | null,
                        ) => {
                          const ingredient = ingredientByName.get(
                            ingredientName.trim().toLowerCase(),
                          );

                          if (
                            ingredient?.pantryComparison?.status === "insufficient" &&
                            ingredient.pantryComparison.requiredLabel &&
                            ingredient.pantryComparison.availableLabel
                          ) {
                            return `${ingredient.pantryComparison.requiredLabel} (${t("basic.recipeDialog.haveAmountInline", {
                              amount: ingredient.pantryComparison.availableLabel,
                            })})`;
                          }

                          return (
                            ingredient?.pantryComparison?.requiredLabel ??
                            ingredient?.amount ??
                            fallbackAmount
                          );
                        };

                        const resolveTone = (
                          ingredientName: string,
                          available: boolean,
                          matchType: "exact" | "fallback",
                        ) => {
                          if (!available) {
                            return "red" as const;
                          }

                          if (matchType === "fallback") {
                            return "orange" as const;
                          }

                          const comparison = ingredientByName.get(
                            ingredientName.trim().toLowerCase(),
                          )?.pantryComparison;

                          if (
                            comparison?.status === "insufficient" ||
                            comparison?.status === "unit-mismatch" ||
                            comparison?.status === "missing-pantry-quantity"
                          ) {
                            return "orange" as const;
                          }

                          return "green" as const;
                        };

                        const available = (activeDialogRecipe.matchedIngredients ?? []).map(
                          (ingredient) => ({
                            key: ingredient.recipeIngredientName,
                            name: ingredient.recipeIngredientName,
                            note:
                              ingredient.matchType === "fallback" &&
                              ingredient.pantryIngredientName &&
                              ingredient.pantryIngredientName.trim().toLowerCase() !==
                                ingredient.recipeIngredientName.trim().toLowerCase()
                                ? t("basic.recipeDialog.fallbackUsing", {
                                    ingredient: ingredient.pantryIngredientName,
                                  })
                                : null,
                            amount: resolveAmountLabel(
                              ingredient.recipeIngredientName,
                              ingredient.amount,
                            ),
                            category: null,
                            available: true,
                            matchType: ingredient.matchType,
                            tone: resolveTone(
                              ingredient.recipeIngredientName,
                              true,
                              ingredient.matchType,
                            ),
                          }),
                        );
                        const fallbackAvailable =
                          activeDialogRecipe.matchedIngredients === undefined
                            ? activeDialogRecipe.ingredientItems.map((ingredient) => ({
                                key: ingredient.name,
                                name: ingredient.name,
                                note: null,
                                amount: resolveAmountLabel(
                                  ingredient.name,
                                  ingredient.amount,
                                ),
                                category: null,
                                available: true,
                                matchType: "exact" as const,
                                tone: resolveTone(ingredient.name, true, "exact"),
                              }))
                            : [];
                        const missing = (activeDialogRecipe.missingIngredients ?? []).map(
                          (ingredientName) => ({
                            key: ingredientName,
                            name: ingredientName,
                            note: null,
                            amount: resolveAmountLabel(ingredientName, null),
                            category:
                              ingredientByName.get(
                                ingredientName.trim().toLowerCase(),
                              )?.category ?? null,
                            available: false,
                            matchType: "exact" as const,
                            tone: "red" as const,
                          }),
                        );
                        const allIngredients = [
                          ...available,
                          ...fallbackAvailable,
                          ...missing,
                        ];

                        if (allIngredients.length === 0) {
                          return (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
                              <ChefHat className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                              <p className="text-[13px] font-bold text-gray-400">
                                {t("recipe.noIngredients")}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {allIngredients.map((ingredient) => (
                              <div
                                key={`${ingredient.key}-${ingredient.available ? "available" : "missing"}`}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-colors ${
                                  ingredient.tone === "green"
                                    ? "bg-green-50/60 ring-green-200/50"
                                    : ingredient.tone === "orange"
                                      ? "bg-amber-50/70 ring-amber-200/60"
                                      : "bg-red-50/60 ring-red-200/50"
                                }`}
                              >
                                {ingredient.available ? (
                                  <div
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full shadow-sm ${
                                      ingredient.tone === "orange"
                                        ? "bg-eatrivo-orange"
                                        : "bg-eatrivo-green"
                                    }`}
                                  >
                                    {ingredient.tone === "orange" ? (
                                      <Minus className="h-3 w-3 text-white" />
                                    ) : (
                                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleSelectMissingIngredient(
                                        ingredient.name,
                                        ingredient.amount,
                                        ingredient.category,
                                      );
                                    }}
                                    disabled={selectedMissingIngredients.has(ingredient.name)}
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
                                      selectedMissingIngredients.has(ingredient.name)
                                        ? "bg-gray-200"
                                        : "bg-red-500 shadow-sm shadow-red-200 hover:bg-red-600"
                                    }`}
                                    title={t("basic.recipeDialog.addToShoppingList")}
                                  >
                                    {selectedMissingIngredients.has(ingredient.name) ? (
                                      <Check className="h-3 w-3 text-gray-500" strokeWidth={3} />
                                    ) : (
                                      <Plus className="h-3 w-3 text-white" strokeWidth={3} />
                                    )}
                                  </button>
                                )}

                                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <span
                                      className={`block truncate text-[13px] font-bold ${
                                        ingredient.tone === "green"
                                          ? "text-[#1a1a2e]"
                                          : ingredient.tone === "orange"
                                            ? "text-amber-800"
                                            : "text-red-700"
                                      }`}
                                    >
                                      {ingredient.name}
                                    </span>
                                    {ingredient.note ? (
                                      <span className="mt-1 block truncate text-[11px] font-semibold text-amber-700/80">
                                        {ingredient.note}
                                      </span>
                                    ) : null}
                                  </div>
                                  {ingredient.amount ? (
                                    <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 ring-1 ring-gray-200/70">
                                      {ingredient.amount}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ))}

                            <div className="pt-2 sm:col-span-2">
                              <Button
                                className="w-full"
                                onClick={() => handleCookGeneratedRecipe(activeDialogRecipe)}
                                disabled={!onCookRecipe}
                              >
                                {t("basic.recipeDialog.cookThisRecipe")}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
});

RivoCustomRecipeExperience.displayName = "RivoCustomRecipeExperience";

export default RivoCustomRecipeExperience;
