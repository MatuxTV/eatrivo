"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ChefHat, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

import type { CustomRecipeHeroSnapshot } from "../RivoCustomRecipeExperience";
import { TipOfDayCard } from "./TipOfDayCard";

interface RivoCustomRecipeCardProps {
  state: CustomRecipeHeroSnapshot;
  onOpenResult: (index: number) => void;
  onOpenFallback: (id: string) => void;
  onOpenPantry: () => void;
}

/**
 * Custom-recipe hero panel restyled for the pantry visual language. Renders the
 * pending/generating, success, fallback and error states; the primary CTA is
 * supplied separately via {@link RivoCustomRecipeButton}.
 */
export function RivoCustomRecipeCard({
  state,
  onOpenResult,
  onOpenFallback,
  onOpenPantry,
}: RivoCustomRecipeCardProps) {
  const t = useTranslations("home");
  const shouldReduceMotion = useReducedMotion();

  /* ---- derivations (copied from RecipesSection hero) ---- */

  const badge =
    state.status === "generating"
      ? t("basic.customRecipe.loading.badge")
      : state.status === "success"
        ? t("basic.customRecipe.result.badge")
        : state.status === "fallback-empty"
          ? t("basic.customRecipe.fallback.badge")
          : state.status === "error"
            ? t("basic.customRecipe.error.badge")
            : t("basic.customRecipe.badge");

  const title =
    state.status === "generating"
      ? t("basic.customRecipe.loading.title")
      : state.status === "success"
        ? t("basic.customRecipe.result.title")
        : state.status === "fallback-empty"
          ? t("basic.customRecipe.fallback.title")
          : state.status === "error"
            ? t("basic.customRecipe.error.title")
            : t("basic.customRecipe.title");

  const description =
    state.status === "generating"
      ? t("basic.customRecipe.loading.description")
      : state.status === "success" && state.result
        ? t("basic.customRecipe.result.description", {
            count: state.result.recipes.length,
          })
        : state.status === "fallback-empty"
          ? t("basic.customRecipe.fallback.description")
          : state.status === "error"
            ? t("basic.customRecipe.error.description")
            : t("basic.customRecipe.description");

  const HeroIcon =
    state.status === "error"
      ? AlertCircle
      : state.status === "success"
        ? ChefHat
        : Sparkles;

  const iconClasses =
    state.status === "generating"
      ? "bg-eatrivo-purple/10 text-eatrivo-purple"
      : state.status === "success"
        ? "bg-eatrivo-green/10 text-eatrivo-green"
        : state.status === "fallback-empty"
          ? "bg-eatrivo-orange/10 text-eatrivo-orange"
          : state.status === "error"
            ? "bg-eatrivo-red/10 text-eatrivo-red"
            : "bg-eatrivo-blue/10 text-eatrivo-blue";

  const badgeClasses =
    state.status === "generating"
      ? "border border-eatrivo-purple/15 bg-eatrivo-purple/5 text-eatrivo-purple"
      : state.status === "success"
        ? "border border-eatrivo-green/15 bg-eatrivo-green/5 text-eatrivo-green"
        : state.status === "fallback-empty"
          ? "border border-eatrivo-orange/15 bg-eatrivo-orange/5 text-eatrivo-orange"
          : state.status === "error"
            ? "border border-eatrivo-red/15 bg-eatrivo-red/5 text-eatrivo-red"
            : "border border-eatrivo-blue/15 bg-eatrivo-blue/5 text-eatrivo-blue";

  const featuredRecipe =
    state.status === "success" ? (state.result?.recipes[0] ?? null) : null;

  const resultBadge = featuredRecipe?.missingIngredients?.length
    ? t("basic.customRecipe.result.almostCookable")
    : t("basic.customRecipe.result.readyNow");

  const fallbackCards =
    state.status === "fallback-empty"
      ? state.fallbackRecommendations.slice(0, 2)
      : [];

  const progress = Math.max(state.progress, 8) / 100;

  const showHeader = state.status !== "success" && state.status !== "fallback-empty";
  const showPantryCta =
    state.status === "fallback-empty" || state.status === "error";

  // The result is a recipe, so it takes the Tip of the day slot as-is instead of
  // nesting a card inside this panel.
  if (state.status === "success" && featuredRecipe) {
    return (
      <TipOfDayCard
        recipe={featuredRecipe}
        badge={resultBadge}
        onOpen={() => onOpenResult(0)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4">
      {showHeader ? (
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-[14px]",
              iconClasses,
            )}
          >
            <HeroIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              className={cn(
                "inline-flex w-fit rounded-full px-2.5 py-1 text-[12px] font-bold",
                badgeClasses,
              )}
            >
              {badge}
            </span>
            <h2 className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-gray-900">
              {title}
            </h2>
            <p className="text-[14px] font-medium leading-5 text-gray-500">
              {description}
            </p>
            {state.userMessage ? (
              <p className="text-[14px] font-medium leading-5 text-gray-500">
                {state.userMessage}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.status === "generating" ? (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-gray-700">
              {t("basic.customRecipe.loading.progressLabel")}
            </span>
            <span className="text-[13px] font-bold text-eatrivo-purple">
              {Math.round(state.progress)}%
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-[#F6F0FF]"
            role="progressbar"
            aria-label={t("basic.customRecipe.loading.progressLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(state.progress)}
          >
            <motion.div
              className="h-full w-full origin-left rounded-full bg-eatrivo-purple"
              initial={{ scaleX: progress }}
              animate={{ scaleX: progress }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.35, ease: "easeOut" }
              }
            />
          </div>

          <div className="flex flex-col gap-1 rounded-2xl bg-[#F6F0FF] px-4 py-3">
            <p className="text-[12px] font-semibold text-gray-500">
              {t("basic.customRecipe.loading.tipsLabel")}
            </p>
            <p className="text-[14px] font-semibold text-gray-900">
              {state.displayTip}
            </p>
          </div>
        </div>
      ) : null}

      {state.status === "fallback-empty" ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-gray-900">
            {title}
          </h2>
          <div className="flex flex-col gap-3">
            {fallbackCards.map((recommendation) => {
              const recommendationId =
                "id" in recommendation ? recommendation.id : null;

              return (
                <button
                  type="button"
                  key={recommendationId ?? recommendation.title}
                  onClick={() => {
                    if (recommendationId) onOpenFallback(recommendationId);
                  }}
                  disabled={!recommendationId}
                  className="rounded-2xl border border-orange-100 bg-orange-50/60 p-3.5 text-left transition-colors hover:border-orange-200 disabled:cursor-default disabled:hover:border-orange-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold text-gray-900">
                      {recommendation.title}
                    </p>
                    {"category" in recommendation && recommendation.category ? (
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[12px] font-semibold text-eatrivo-orange ring-1 ring-eatrivo-orange/10">
                        {recommendation.category}
                      </span>
                    ) : null}
                  </div>
                  {"availability" in recommendation &&
                  recommendation.availability ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-eatrivo-purple/10 px-2.5 py-1 text-[12px] font-semibold text-eatrivo-purple">
                        {recommendation.availability === "pantry"
                          ? t("basic.customRecipe.result.readyNow")
                          : t("basic.customRecipe.fallback.missingCount", {
                              count: recommendation.missingCount ?? 0,
                            })}
                      </span>
                      {recommendation.totalTimeMin ? (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[12px] font-semibold text-eatrivo-orange">
                          {recommendation.totalTimeMin} {t("time.minutesShort")}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3">
          <p className="text-[12px] font-semibold text-gray-500">
            {t("basic.customRecipe.error.detailLabel")}
          </p>
          <p className="mt-1 text-[14px] text-gray-700">{state.error}</p>
        </div>
      ) : null}

      {showPantryCta ? (
        <Button
          variant="brandOutline"
          type="button"
          onClick={onOpenPantry}
          className="h-11 w-full rounded-2xl"
        >
          {t("basic.customRecipe.fallback.openPantry")}
        </Button>
      ) : null}
    </div>
  );
}
