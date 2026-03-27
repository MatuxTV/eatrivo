"use client";

import { useState, useCallback, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useLocale } from "next-intl";
import { normalizeRecipeInstructions } from "@/lib/recipe-instructions";
import type {
  BasicHomePantrySummary,
  BasicHomeRecipePreview,
} from "@/app/home/types/data";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

const PANTRY_CHANGED_EVENT = "pantry:changed";

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export interface UsePantrySyncOptions {
  pantrySummary: BasicHomePantrySummary;
  pantryNames: string[];
  cookableRecipes: BasicHomeRecipePreview[];
  almostCookableRecipes: BasicHomeRecipePreview[];
}

export function usePantrySync({
  pantrySummary,
  pantryNames,
  cookableRecipes,
  almostCookableRecipes,
}: UsePantrySyncOptions) {
  const locale = useLocale();

  const [livePantrySummary, setLivePantrySummary] =
    useState<BasicHomePantrySummary>(pantrySummary);
  const [livePantryNames, setLivePantryNames] = useState<string[]>(pantryNames);
  const [liveCookableRecipes, setLiveCookableRecipes] =
    useState<BasicHomeRecipePreview[]>(cookableRecipes);
  const [liveAlmostCookableRecipes, setLiveAlmostCookableRecipes] =
    useState<BasicHomeRecipePreview[]>(almostCookableRecipes);

  /* ---- sync from SSR props ---- */

  useEffect(() => {
    setLivePantrySummary(pantrySummary);
    setLivePantryNames(pantryNames);
    setLiveCookableRecipes(cookableRecipes);
    setLiveAlmostCookableRecipes(almostCookableRecipes);
  }, [pantrySummary, pantryNames, cookableRecipes, almostCookableRecipes]);

  /* ---- refresh callback ---- */

  const refreshPantrySummary = useCallback(async () => {
    try {
      logger.debug("[usePantrySync] refreshPantrySummary: start", {
        metadata: { locale },
      });

      const [pantryResponse, matchesResponse] = await Promise.all([
        fetch("/api/pantry", { cache: "no-store" }),
        fetch(`/api/recipes/matches?locale=${locale}&maxMissingIngredients=3`, {
          cache: "no-store",
        }),
      ]);

      if (!pantryResponse.ok || !matchesResponse.ok) {
        logger.debug("[usePantrySync] refreshPantrySummary: aborted due to non-ok response");
        return;
      }

      const pantryPayload = (await pantryResponse.json()) as { items?: unknown[] };
      const matchesPayload = (await matchesResponse.json()) as {
        cookable?: unknown[];
        almostCookable?: unknown[];
        pantryIngredientKeyCount?: number;
        recipeCountAnalyzed?: number;
      };

      setLivePantrySummary({
        itemCount: pantryPayload.items?.length ?? 0,
        cookableCount: matchesPayload.cookable?.length ?? 0,
      });

      if (Array.isArray(pantryPayload.items)) {
        const newNames = (
          pantryPayload.items as Array<{ name?: string; ingredientName?: string | null }>
        ).flatMap((item) => {
          const names: string[] = [];
          if (item.name) names.push(item.name.toLowerCase().trim());
          if (item.ingredientName) names.push(item.ingredientName.toLowerCase().trim());
          return names;
        });
        setLivePantryNames(newNames);
      }

      if (matchesPayload.cookable) {
        setLiveCookableRecipes(
          (matchesPayload.cookable as RecipeMatchPayloadItem[]).map((match) => ({
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
          })),
        );
      }

      if (matchesPayload.almostCookable) {
        setLiveAlmostCookableRecipes(
          (matchesPayload.almostCookable as RecipeMatchPayloadItem[]).map((match) => ({
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
          })),
        );
      }

      logger.debug("[usePantrySync] refreshPantrySummary: done", {
        metadata: {
          itemCount: pantryPayload.items?.length ?? 0,
          cookableCount: matchesPayload.cookable?.length ?? 0,
        },
      });
    } catch (error) {
      logger.warn("Failed to refresh pantry summary", {
        context: "usePantrySync",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }, [locale]);

  /* ---- event listener ---- */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePantryChanged = () => { void refreshPantrySummary(); };
    window.addEventListener(PANTRY_CHANGED_EVENT, handlePantryChanged);
    return () => { window.removeEventListener(PANTRY_CHANGED_EVENT, handlePantryChanged); };
  }, [refreshPantrySummary]);

  return {
    livePantrySummary,
    livePantryNames,
    liveCookableRecipes,
    liveAlmostCookableRecipes,
    refreshPantrySummary,
  };
}
