"use client";

import { useState } from "react";
import { Bookmark, Clock3, Loader2, PlayCircle } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import RecipeBrowserDialog from "@/app/home/components/RecipeBrowserDialog";
import type { RecipeCreationResultMessageMetadata } from "@/lib/chat/message-metadata";
import type { BasicHomeRecipePreview } from "@/app/home/types/data";

const KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY = "kitchenCounter:selectedRecipe";

export default function RecipeCreationResultCard({
  metadata,
  message,
  onCookRecipe,
}: {
  metadata: RecipeCreationResultMessageMetadata;
  message?: string;
  onCookRecipe?: (recipe: BasicHomeRecipePreview) => void;
}) {
  const router = useRouter();
  const locale = useLocale() as "en" | "sk";
  const [open, setOpen] = useState(false);
  const [persistedRecipeId, setPersistedRecipeId] = useState<string | null>(null);
  const [isBookmarkPending, setIsBookmarkPending] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const recipe = metadata.recipe;
  const preview = metadata.preview;
  const ingredientCount = preview.ingredientItems.length;

  const ensurePersistedRecipe = async () => {
    if (persistedRecipeId) {
      return persistedRecipeId;
    }

    const response = await fetch("/api/recipes/custom/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        recipe,
        waitForPersist: true,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { accepted?: boolean; recipeId?: string; error?: string }
      | null;

    if (!response.ok || !payload?.accepted || !payload.recipeId) {
      throw new Error(payload?.error ?? "Recipe persistence failed");
    }

    setPersistedRecipeId(payload.recipeId);
    return payload.recipeId;
  };

  const handleCook = () => {
    if (onCookRecipe) {
      onCookRecipe(preview);
      return;
    }

    window.sessionStorage.setItem(
      KITCHEN_COUNTER_SELECTED_RECIPE_STORAGE_KEY,
      JSON.stringify(preview),
    );
    router.push("/home?section=kitchenCounter");
  };

  const handleBookmark = async () => {
    if (isBookmarkPending) {
      return;
    }

    setIsBookmarkPending(true);
    try {
      const recipeId = await ensurePersistedRecipe();
      const response = await fetch(`/api/recipes/${recipeId}/bookmark`, {
        method: isBookmarked ? "DELETE" : "POST",
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Bookmark request failed");
      }

      setIsBookmarked((value) => !value);
      toast.success(isBookmarked ? "Recept bol odobratý zo záložiek." : "Recept bol uložený do záložiek.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bookmark request failed");
    } finally {
      setIsBookmarkPending(false);
    }
  };

  return (
    <>
      <div className="mt-3 w-full max-w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white p-3 shadow-lg shadow-eatrivo-purple/5 ring-1 ring-eatrivo-purple/5">
        {message?.trim() ? (
          <div className="px-3 pb-2 pt-1 text-sm font-medium leading-6 text-eatrivo-black-secondary sm:px-4">
            {message}
          </div>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(true)}
          className="h-auto w-full max-w-full justify-start rounded-[1.25rem] bg-white p-3 text-left hover:bg-gray-50 sm:p-4"
        >
          <div className="flex min-w-0 w-full flex-col gap-3">
            <p className="line-clamp-2 text-base font-bold leading-tight text-gray-900">
              {preview.title}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-gray-500">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1">
                <Clock3 className="h-3.5 w-3.5 text-gray-400" />
                {preview.totalTimeMin} min
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1">
                {ingredientCount} ingredients
              </span>
            </div>
          </div>
        </Button>

        <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={handleCook} className="h-auto w-full min-w-0 whitespace-normal break-words rounded-2xl bg-eatrivo-purple px-4 py-3 text-sm leading-5 text-white hover:bg-eatrivo-purple/90 sm:w-auto sm:flex-1 sm:whitespace-nowrap">
            <PlayCircle className="mr-2 h-4 w-4" />
            Cook in Kitchen Counter
          </Button>
          <Button type="button" onClick={handleBookmark} disabled={isBookmarkPending} className="h-auto w-full min-w-0 whitespace-normal break-words rounded-2xl border-1 border-eatrivo-purple/10 bg-eatrivo-purple/5 px-4 py-3 text-sm leading-5 text-eatrivo-black-primary hover:bg-eatrivo-purple/5 sm:w-auto sm:flex-1 sm:whitespace-nowrap">
            {isBookmarkPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bookmark className="mr-2 h-4 w-4" />}
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </Button>
        </div>
      </div>

      <RecipeBrowserDialog
        open={open}
        onOpenChange={setOpen}
        recipes={[
          persistedRecipeId
            ? { ...preview, id: persistedRecipeId }
            : preview,
        ]}
        initialIndex={0}
        bookmarkRecipeId={persistedRecipeId}
        onEnsureBookmarkRecipeId={ensurePersistedRecipe}
        onCookRecipe={onCookRecipe}
      />
    </>
  );
}