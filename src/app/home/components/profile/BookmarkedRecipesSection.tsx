"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Bookmark,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BasicHomeRecipePreview } from "@/app/home/types/data";

interface BookmarkedRecipeItem {
  id: string;
  slug: string;
  externalKey: string;
  name: string;
  categoryKey: string;
  categoryLabel: string;
  mealPrepFriendly: boolean;
  prepTimeMin: number;
  totalTimeMin: number;
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  servings: number;
  servingUnit: string | null;
  dietTags: string[];
  restrictionFlags: string[];
  bookmarkedAt: string;
}

interface BookmarksResponse {
  success: boolean;
  locale: string;
  items: BookmarkedRecipeItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface BookmarkedRecipesSectionProps {
  isProfileLoading: boolean;
  onOpenRecipe: (recipe: BasicHomeRecipePreview) => void;
}

const PAGE_SIZE = 12;

export default function BookmarkedRecipesSection({
  isProfileLoading,
  onOpenRecipe,
}: BookmarkedRecipesSectionProps) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [items, setItems] = useState<BookmarkedRecipeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingRecipeIds, setPendingRecipeIds] = useState<Set<string>>(new Set());
  const [openingRecipeId, setOpeningRecipeId] = useState<string | null>(null);

  const fetchBookmarks = useCallback(
    async (offset = 0, mode: "replace" | "append" = "replace") => {
      if (mode === "replace") {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await fetch(
          `/api/user/bookmarks?locale=${encodeURIComponent(locale)}&limit=${PAGE_SIZE}&offset=${offset}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | BookmarksResponse
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("success" in payload)) {
          throw new Error(
            payload && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Failed to load bookmarks.",
          );
        }

        setItems((current) =>
          mode === "append" ? [...current, ...payload.items] : payload.items,
        );
        setTotal(payload.pagination.total);
      } catch (error) {
        console.error("[Profile] failed to load bookmarks", error);
        toast.error(t("bookmarks.toast.loadError"));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [locale, t],
  );

  useEffect(() => {
    void fetchBookmarks();
  }, [fetchBookmarks]);

  const hasMore = items.length < total;

  const handleOpenRecipe = useCallback(
    async (recipeId: string) => {
      if (openingRecipeId || pendingRecipeIds.has(recipeId)) {
        return;
      }

      setOpeningRecipeId(recipeId);

      try {
        const response = await fetch(
          `/api/recipes/${recipeId}/preview?locale=${encodeURIComponent(locale)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | { success: boolean; recipe: BasicHomeRecipePreview }
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("success" in payload)) {
          throw new Error(
            payload && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Failed to open recipe.",
          );
        }

        onOpenRecipe(payload.recipe);
      } catch (error) {
        console.error("[Profile] failed to open bookmarked recipe", error);
        toast.error(t("bookmarks.toast.loadError"));
      } finally {
        setOpeningRecipeId((current) =>
          current === recipeId ? null : current,
        );
      }
    },
    [locale, onOpenRecipe, openingRecipeId, pendingRecipeIds, t],
  );

  const handleRemoveBookmark = useCallback(
    async (recipeId: string) => {
      setPendingRecipeIds((current) => new Set(current).add(recipeId));

      const previousItems = items;
      const nextItems = items.filter((item) => item.id !== recipeId);
      setItems(nextItems);
      setTotal((current) => Math.max(0, current - 1));

      try {
        const response = await fetch(`/api/recipes/${recipeId}/bookmark`, {
          method: "DELETE",
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload?.error && typeof payload.error === "string"
              ? payload.error
              : "Failed to remove bookmark.",
          );
        }

        toast.success(t("bookmarks.toast.removed"));
      } catch (error) {
        console.error("[Profile] failed to remove bookmark", error);
        setItems(previousItems);
        setTotal(previousItems.length);
        toast.error(t("bookmarks.toast.removeError"));
      } finally {
        setPendingRecipeIds((current) => {
          const next = new Set(current);
          next.delete(recipeId);
          return next;
        });
      }
    },
    [items, t],
  );

  const content = useMemo(() => {
    if (isLoading || isProfileLoading) {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-[1.8rem] bg-[linear-gradient(180deg,#fbf7ff_0%,#f5edff_100%)] ring-1 ring-[#efe3ff]"
            />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="rounded-[1.8rem] border border-dashed border-[#e9dafd] bg-[linear-gradient(180deg,#fffaff_0%,#f8f1ff_100%)] px-6 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-white text-[#7d49cf] shadow-sm ring-1 ring-[#eadcff]">
            <Bookmark className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[#35204f]">
            {t("bookmarks.empty.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#87739f]">
            {t("bookmarks.empty.description")}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const isPending = pendingRecipeIds.has(item.id);
            const isOpening = openingRecipeId === item.id;

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[1.8rem] border border-[#efe3ff] bg-white shadow-[0_18px_40px_rgba(121,78,171,0.08)]"
              >
                <div className="flex items-center gap-3 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      void handleOpenRecipe(item.id);
                    }}
                    disabled={isOpening || isPending}
                    className="group flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fbf7ff_0%,#f4e8ff_100%)] text-[#7d49cf] ring-1 ring-[#eadcff] transition-transform duration-200 group-hover:scale-[1.04]">
                      {isOpening ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-black leading-tight tracking-[-0.04em] text-[#35204f] transition-colors duration-200 group-hover:text-[#5d34a0]">
                        {item.name}
                      </h3>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleRemoveBookmark(item.id);
                    }}
                    disabled={isPending || isOpening}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7efff] text-[#7d49cf] shadow-sm ring-1 ring-[#eadcff] transition-all hover:bg-[#f2e5ff] active:scale-95 disabled:cursor-wait disabled:opacity-70"
                    title={t("bookmarks.card.remove")}
                    aria-label={t("bookmarks.card.remove")}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bookmark className="h-4 w-4 fill-current" />
                    )}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>

        {hasMore ? (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void fetchBookmarks(items.length, "append");
              }}
              disabled={isLoadingMore}
              className="rounded-full border-[#eadcff] bg-white px-6 text-[#7d49cf] hover:bg-[#faf5ff]"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("bookmarks.actions.loadingMore")}
                </>
              ) : (
                t("bookmarks.actions.loadMore")
              )}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }, [
    fetchBookmarks,
    handleRemoveBookmark,
    handleOpenRecipe,
    hasMore,
    isLoading,
    isLoadingMore,
    isProfileLoading,
    items,
    openingRecipeId,
    pendingRecipeIds,
    t,
  ]);

  return (
    <section className="space-y-5">
      <div className="rounded-[1.8rem] border border-[#efe2fb] bg-white p-6 shadow-[0_18px_40px_rgba(121,78,171,0.08)] sm:p-8">
        <div className="space-y-3 rounded-[1.5rem] bg-[linear-gradient(180deg,#fdf8ff_0%,#f7eeff_100%)] p-5 ring-1 ring-[#eedfff]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#7d49cf] ring-1 ring-[#eadcff]">
            <Bookmark className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[#35204f]">
              {t("bookmarks.title")}
            </h2>
            <p className="max-w-2xl text-sm font-medium leading-6 text-[#87739f]">
              {t("bookmarks.description")}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#6f6184] ring-1 ring-[#ece2f8]">
            {t("bookmarks.helper", { count: total })}
          </div>
        </div>
      </div>

      {content}
    </section>
  );
}