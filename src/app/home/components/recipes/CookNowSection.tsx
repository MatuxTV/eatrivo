"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import { cn } from "@/lib/utils/utils";

import { CookNowCard } from "./CookNowCard";
import { RecipeCard } from "./RecipeCard";

interface CookNowSectionProps {
  recipes: BasicHomeRecipePreview[];
  onOpenRecipe: (index: number) => void;
  isBookmarked: (id: string) => boolean;
  isBookmarkPending: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
}

/** "Cook now" section: horizontal swipe carousel that expands into a grid. */
export function CookNowSection({
  recipes,
  onOpenRecipe,
  isBookmarked,
  isBookmarkPending,
  onToggleBookmark,
}: CookNowSectionProps) {
  const t = useTranslations("home");
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const headerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (recipes.length === 0) {
    return null;
  }

  const toggle = () => {
    if (expanded) {
      setExpanded(false);
      setActiveIndex(0);
      requestAnimationFrame(() => {
        const header = headerRef.current;
        if (header && header.getBoundingClientRect().top < 0) {
          header.scrollIntoView({
            block: "start",
            behavior: reduceMotion ? "auto" : "smooth",
          });
        }
      });
    } else {
      setExpanded(true);
    }
  };

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const firstItem = scroller.firstElementChild as HTMLElement | null;
    if (!firstItem) {
      return;
    }
    const step = firstItem.offsetWidth + 10;
    const index = Math.round(scroller.scrollLeft / step);
    setActiveIndex(Math.min(Math.max(index, 0), recipes.length - 1));
  };

  const scrollToIndex = (index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const firstItem = scroller.firstElementChild as HTMLElement | null;
    const width = firstItem?.offsetWidth ?? 0;
    scroller.scrollTo({
      left: index * (width + 10),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <motion.section
      layout={!reduceMotion}
      transition={{ layout: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } }}
      aria-labelledby="home-cook-now-title"
      className="mb-7"
    >
      <div ref={headerRef} className="flex items-center justify-between gap-3">
        <h2
          id="home-cook-now-title"
          className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-gray-900"
        >
          {t("basic.cookNow.title")}
        </h2>
        {recipes.length > 1 && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            className="inline-flex items-center gap-0.5 rounded-full px-1 py-1 text-[14px] font-bold text-eatrivo-purple active:scale-95 transition-transform"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={expanded ? "less" : "all"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {expanded
                  ? t("basic.cookNow.collapse")
                  : t("basic.cookNow.seeAll")}
              </motion.span>
            </AnimatePresence>
            <ChevronRight
              className={cn(
                "h-4 w-4 stroke-[2.4] transition-transform duration-200",
                expanded && "-rotate-90",
              )}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      <p className="mt-0.5 mb-3 text-[13px] font-medium text-gray-500">
        {t("basic.cookNow.subtitle")}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {expanded ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="grid grid-cols-2 items-stretch gap-2.5 md:grid-cols-3"
          >
            {recipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  delay: reduceMotion ? 0 : index * 0.03,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <RecipeCard
                  // Cookable matches only carry the matched names in
                  // `ingredientPreview`; an empty missing list lets the card
                  // show the full green bar and "have everything".
                  recipe={{
                    ...recipe,
                    missingIngredients: recipe.missingIngredients ?? [],
                  }}
                  onOpen={() => onOpenRecipe(index)}
                  bookmarked={isBookmarked(recipe.id)}
                  bookmarkPending={isBookmarkPending(recipe.id)}
                  onToggleBookmark={() => onToggleBookmark(recipe.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <div
              ref={scrollerRef}
              onScroll={handleScroll}
              className="-mr-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain pr-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {recipes.map((recipe, index) => (
                <div
                  key={recipe.id}
                  className="w-[330px] max-w-[86%] shrink-0 snap-start"
                >
                  <CookNowCard
                    recipe={recipe}
                    onOpen={() => onOpenRecipe(index)}
                    bookmarked={isBookmarked(recipe.id)}
                    bookmarkPending={isBookmarkPending(recipe.id)}
                    onToggleBookmark={() => onToggleBookmark(recipe.id)}
                  />
                </div>
              ))}
            </div>

            {recipes.length > 1 && (
              <div className="mt-3 flex justify-center gap-1.5">
                {recipes.map((recipe, index) => (
                  <button
                    key={recipe.id}
                    type="button"
                    aria-label={t("basic.cookNow.slideLabel", {
                      index: index + 1,
                      count: recipes.length,
                    })}
                    onClick={() => scrollToIndex(index)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-200",
                      activeIndex === index
                        ? "w-[18px] bg-eatrivo-purple"
                        : "w-1.5 bg-gray-200",
                    )}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
