"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  ChefHat,
  RefreshCcw,
  Sparkles,
} from "lucide-react";

import type { BasicHomeRecipePreview } from "@/app/[locale]/home/page";
import {
  customRecipeCurrentGenerationResponseSchema,
  customRecipeStreamEventSchema,
} from "@/lib/custom-recipes/contracts";
import type { RecipeIngredientItem } from "@/lib/recipe-ingredients";
import type { RecipeInstruction } from "@/lib/recipe-instructions";
import { Button } from "@/components/ui/button";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import RecipeBrowserDialog from "./RecipeBrowserDialog";

type CustomRecipeGenerationStatus =
  | "idle"
  | "generating"
  | "success"
  | "fallback-empty"
  | "error";

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
  pantryComparison?: RecipeIngredientItem["pantryComparison"] | null;
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

interface CustomRecipeFallbackRecommendation {
  id: string;
  title: string;
  category: string;
  availability?: "pantry" | "almost_cookable";
  missingCount?: number;
  totalTimeMin?: number;
  proteinG?: number;
}

interface CustomRecipeAdaptedResult {
  recipes: BasicHomeRecipePreview[];
  fallbackRecipes: BasicHomeRecipePreview[];
  fallbackRecommendations: CustomRecipeFallbackRecommendation[];
  userMessage?: CustomRecipeApiMessageDescriptor;
}

interface RivoCustomRecipeExperienceProps {
  onOpenPantry: () => void;
  onAddToShoppingList?: (
    ingredientName: string,
    quantity: string | null,
    category: string | null,
  ) => Promise<void>;
  onCookRecipe?: (recipe: BasicHomeRecipePreview) => void;
}

const CUSTOM_RECIPE_START_ENDPOINT = "/api/recipes/custom/generate";
const CUSTOM_RECIPE_MOCK_STORAGE_KEY = "eatrivo:customRecipeMock";
const DEFAULT_CATEGORY_KEY = "lunch-and-dinner";

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
    pantryComparison: ingredient.pantryComparison ?? null,
  };
}

function buildMatchedIngredients(
  matchedIngredientNames: string[],
  ingredientItems: RecipeIngredientItem[],
): NonNullable<BasicHomeRecipePreview["matchedIngredients"]> | undefined {
  const ingredientByName = new Map(
    ingredientItems.map((ingredient) => [
      ingredient.name.trim().toLowerCase(),
      ingredient,
    ]),
  );

  const matchedIngredients = matchedIngredientNames.map((ingredientName) => {
    const ingredient = ingredientByName.get(ingredientName.trim().toLowerCase());

    return {
      recipeIngredientName: ingredientName,
      pantryIngredientName: ingredientName,
      matchType: "exact" as const,
      displayName: ingredient?.name ?? ingredientName,
      amount: ingredient?.amount ?? null,
    };
  });

  return matchedIngredients.length > 0 ? matchedIngredients : undefined;
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
    totalTimeMin: recipe.totalTimeMin,
    calories: recipe.calories,
    proteinG: recipe.proteinG,
    carbsG: recipe.carbohydratesG,
    fatG: recipe.fatG,
    instructions: recipe.instructions,
    dietTags: recipe.tags,
    ingredientItems,
    ingredientPreview:
      recipe.matchedIngredientNames.length > 0
        ? recipe.matchedIngredientNames
        : ingredientItems.map((ingredient) => ingredient.name).slice(0, 4),
    matchedIngredients: buildMatchedIngredients(
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
    totalTimeMin: recipe.totalTimeMin,
    calories: recipe.calories,
    proteinG: recipe.proteinG,
    carbsG: recipe.carbohydratesG,
    fatG: recipe.fatG,
    instructions: recipe.instructions,
    dietTags: [],
    ingredientItems,
    ingredientPreview:
      recipe.matchedIngredientNames.length > 0
        ? recipe.matchedIngredientNames
        : ingredientItems.map((ingredient) => ingredient.name).slice(0, 4),
    matchedIngredients: buildMatchedIngredients(
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
    return t(descriptor.key, descriptor.values);
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

export default function RivoCustomRecipeExperience({
  onOpenPantry,
  onAddToShoppingList,
  onCookRecipe,
}: RivoCustomRecipeExperienceProps) {
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
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogIndex, setDialogIndex] = useState(0);
  const [dialogRecipes, setDialogRecipes] = useState<BasicHomeRecipePreview[]>([]);

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
  const fallbackRecommendations:
    | Array<
        | CustomRecipeFallbackRecommendation
        | { title: string; description?: string | null }
      >
    = result?.fallbackRecommendations.length
      ? result.fallbackRecommendations
      : [
          { title: t("basic.customRecipe.fallback.defaultSuggestions.pantry") },
          { title: t("basic.customRecipe.fallback.defaultSuggestions.protein") },
          { title: t("basic.customRecipe.fallback.defaultSuggestions.vegetables") },
        ];
  const userMessage = resolveMessageDescriptor(t, result?.userMessage);

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
      setDialogOpen(true);
    },
    [],
  );

  const applyCompletedPayload = useCallback(
    (payload: CustomRecipeApiResultPayload) => {
      const adaptedResult = adaptCustomRecipeResponse(payload);
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
    setDialogOpen(false);
    setStatus("generating");
    setProgress(12);
    setTipIndex(0);
    setResult(null);
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
        body: JSON.stringify({ locale }),
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
  }, [applyCompletedPayload, consumeRecipeStream, locale, t, triggerHaptic]);

  const handleOpenResult = useCallback(() => {
    const generatedRecipes = result?.recipes ?? [];

    if (!generatedRecipes.length) {
      return;
    }

    triggerHaptic("light");
    openRecipeDialog(generatedRecipes, 0);
  }, [openRecipeDialog, result, triggerHaptic]);

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

  const handleCookGeneratedRecipe = useCallback(
    (recipe: BasicHomeRecipePreview) => {
      setDialogOpen(false);
      onCookRecipe?.(recipe);
    },
    [onCookRecipe],
  );

  const fadeIn = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.4, ease: "easeOut" as const },
      };

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 hover:border-gray-200 transition-colors">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-eatrivo-blue/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-eatrivo-blue" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                  {t("basic.customRecipe.badge")}
                </p>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t("basic.customRecipe.title")}
                </h2>
                <p className="text-sm text-gray-600 max-w-2xl">
                  {t("basic.customRecipe.description")}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                void handleGenerate();
              }}
              disabled={status === "generating"}
              className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
            >
              {status === "generating"
                ? t("basic.customRecipe.ctaGenerating")
                : status === "idle"
                  ? t("basic.customRecipe.cta")
                  : t("basic.customRecipe.ctaRetry")}
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {status === "idle" ? null : (
            <motion.div
              key={status}
              {...fadeIn}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 space-y-4"
            >
              {status === "generating" ? (
                <div className="space-y-4" role="status" aria-live="polite">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-eatrivo-purple/10 rounded-lg">
                      <Sparkles className="w-5 h-5 text-eatrivo-purple" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                        {t("basic.customRecipe.loading.badge")}
                      </p>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {t("basic.customRecipe.loading.title")}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t("basic.customRecipe.loading.description")}
                      </p>
                    </div>
                  </div>

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
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-eatrivo-green/10 rounded-lg">
                      <ChefHat className="w-5 h-5 text-eatrivo-green" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                        {t("basic.customRecipe.result.badge")}
                      </p>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {t("basic.customRecipe.result.title")}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t("basic.customRecipe.result.description", {
                          count: result.recipes.length,
                        })}
                      </p>
                      {userMessage ? (
                        <p className="text-sm text-gray-500">{userMessage}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {result.recipes.map((recipe) => {
                      const isAlmostCookable =
                        Array.isArray(recipe.missingIngredients) &&
                        recipe.missingIngredients.length > 0;

                      return (
                        <div
                          key={recipe.id}
                          className="rounded-2xl border border-gray-100 bg-eatrivo-white-primary p-4"
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
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      onClick={handleOpenResult}
                      className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    >
                      {t("basic.customRecipe.result.open")}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        void handleGenerate();
                      }}
                      className="rounded-full border border-gray-200 text-gray-700 hover:bg-eatrivo-white-secondary focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      {t("basic.customRecipe.result.regenerate")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {status === "fallback-empty" ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-eatrivo-orange/10 rounded-lg">
                      <Sparkles className="w-5 h-5 text-eatrivo-orange" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                        {t("basic.customRecipe.fallback.badge")}
                      </p>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {t("basic.customRecipe.fallback.title")}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t("basic.customRecipe.fallback.description")}
                      </p>
                      {userMessage ? (
                        <p className="text-sm text-gray-500">{userMessage}</p>
                      ) : null}
                    </div>
                  </div>

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

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      onClick={() => {
                        void handleGenerate();
                      }}
                      className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      {t("basic.customRecipe.fallback.retry")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleOpenPantry}
                      className="rounded-full border border-gray-200 text-gray-700 hover:bg-eatrivo-white-secondary focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    >
                      {t("basic.customRecipe.fallback.openPantry")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {status === "error" ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-eatrivo-red/10 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-eatrivo-red" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                        {t("basic.customRecipe.error.badge")}
                      </p>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {t("basic.customRecipe.error.title")}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t("basic.customRecipe.error.description")}
                      </p>
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-eatrivo-red/10 bg-eatrivo-red/5 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                        {t("basic.customRecipe.error.detailLabel")}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">{error}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      onClick={() => {
                        void handleGenerate();
                      }}
                      className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      {t("basic.customRecipe.error.retry")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleOpenPantry}
                      className="rounded-full border border-gray-200 text-gray-700 hover:bg-eatrivo-white-secondary focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    >
                      {t("basic.customRecipe.fallback.openPantry")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RecipeBrowserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recipes={dialogRecipes}
        initialIndex={dialogIndex}
        onAddToShoppingList={onAddToShoppingList}
        onCookRecipe={handleCookGeneratedRecipe}
      />
    </>
  );
}
