"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock3, PackageCheck, ShoppingBasket, Soup } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const PANTRY_CHANGED_EVENT = "pantry:changed";

interface MatchedRecipe {
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
  mealPrepFriendly: boolean;
  totalRequiredIngredients: number;
  matchedRequiredIngredients: number;
  missingRequiredIngredients: number;
  matchRatio: number;
  matchedIngredients: {
    recipeIngredientName: string;
    pantryIngredientName: string | null;
    matchType: "exact" | "fallback";
    displayName: string;
  }[];
  matchedIngredientNames: string[];
  missingIngredientNames: string[];
}

interface RecipeMatchesResponse {
  success: boolean;
  pantryIsEmpty: boolean;
  pantryIngredientKeyCount: number;
  recipeCountAnalyzed: number;
  cookable: MatchedRecipe[];
  almostCookable: MatchedRecipe[];
}

function RecipeMatchCard({
  recipe,
  variant,
  t,
}: {
  recipe: MatchedRecipe;
  variant: "cookable" | "almost";
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              {recipe.category}
            </Badge>
            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
              <Clock3 className="h-4 w-4" />
              {recipe.totalTimeMin} {t("minutesShort")}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">{recipe.name}</h3>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{recipe.calories} kcal</span>
            <span>{t("proteinShortLabel")} {recipe.proteinG}g</span>
            <span>{t("carbsShortLabel")} {recipe.carbohydratesG}g</span>
            <span>{t("fatShortLabel")} {recipe.fatG}g</span>
          </div>
        </div>

        <div className="rounded-2xl bg-eatrivo-purple/8 p-3 text-eatrivo-purple">
          {variant === "cookable" ? (
            <PackageCheck className="h-5 w-5" />
          ) : (
            <ShoppingBasket className="h-5 w-5" />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-eatrivo-green/10 px-3 py-1 font-medium text-eatrivo-green">
          {t("haveCount", {
            matched: recipe.matchedRequiredIngredients,
            total: recipe.totalRequiredIngredients,
          })}
        </span>
        {variant === "almost" && recipe.missingRequiredIngredients > 0 ? (
          <span className="rounded-full bg-eatrivo-orange/10 px-3 py-1 font-medium text-eatrivo-orange">
            {t("missingCount", { count: recipe.missingRequiredIngredients })}
          </span>
        ) : (
          <span className="rounded-full bg-eatrivo-purple/10 px-3 py-1 font-medium text-eatrivo-purple">
            {t("readyNow")}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {variant === "cookable" ? t("availableIngredients") : t("missingIngredients")}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {variant === "cookable"
              ? (recipe.matchedIngredients ?? []).length > 0
                ? recipe.matchedIngredients
                    .map((ingredient) => ingredient.displayName)
                    .join(", ")
                : recipe.matchedIngredientNames.join(", ")
              : recipe.missingIngredientNames.join(", ")}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function PantryRecipeMatches() {
  const locale = useLocale();
  const t = useTranslations("home.pantryMatches");
  const [data, setData] = useState<RecipeMatchesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchMatches = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/recipes/matches?locale=${locale}`);
        const payload = (await response.json()) as
          | RecipeMatchesResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load recipe matches");
        }

        if (isActive) {
          setData(payload as RecipeMatchesResponse);
        }
      } catch (fetchError) {
        if (isActive) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load recipe matches",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchMatches();

    const handlePantryChanged = () => {
      void fetchMatches();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(PANTRY_CHANGED_EVENT, handlePantryChanged);
    }

    return () => {
      isActive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(PANTRY_CHANGED_EVENT, handlePantryChanged);
      }
    };
  }, [locale]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-eatrivo-green/10 p-2 text-eatrivo-green">
          <Soup className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t("title")}</h2>
          <p className="text-sm text-gray-500">{t("subtitle")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
          {t("loadError")}
        </div>
      ) : data?.pantryIsEmpty ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900">{t("emptyPantry.title")}</h3>
          <p className="mt-2 text-sm text-gray-500">{t("emptyPantry.description")}</p>
        </div>
      ) : data && data.cookable.length === 0 && data.almostCookable.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900">{t("noMatches.title")}</h3>
          <p className="mt-2 text-sm text-gray-500">{t("noMatches.description")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data && data.cookable.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">{t("cookableTitle")}</h3>
                <span className="text-sm text-gray-500">{data.cookable.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.cookable.map((recipe) => (
                  <RecipeMatchCard
                    key={recipe.id}
                    recipe={recipe}
                    variant="cookable"
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {data && data.almostCookable.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">{t("almostCookableTitle")}</h3>
                <span className="text-sm text-gray-500">{data.almostCookable.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.almostCookable.map((recipe) => (
                  <RecipeMatchCard
                    key={recipe.id}
                    recipe={recipe}
                    variant="almost"
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}