"use client";

import { useEffect, useState } from "react";

const IMAGE_ENDPOINT = "/api/recipes/custom/image";
const POLL_INTERVAL_MS = 3000;
/** Generation takes ~10s; give up after ~36s and fall back to the emoji tile. */
const MAX_POLLS = 12;

export interface GeneratedRecipeImageSource {
  /** Stable client key of the generated recipe (e.g. "generated-pantry-recipe"). */
  key: string;
  /** The generated recipe exactly as returned by the generation API. */
  recipe: unknown;
}

export type GeneratedRecipeImage =
  | { status: "pending"; recipeId: string | null }
  | { status: "ready"; recipeId: string; imageUrl: string | null; imageThumbUrl: string | null }
  | { status: "none" };

type ImageStatusEntry = GeneratedRecipeImage & { key: string };

interface RecipeWithImage {
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
  imagePending?: boolean;
}

/** Applies a tracked photo state to a recipe: the photo once ready, a skeleton flag while pending. */
export function applyGeneratedRecipeImage<T extends RecipeWithImage>(
  recipe: T,
  image: GeneratedRecipeImage | undefined,
): T {
  if (image?.status === "ready") {
    return {
      ...recipe,
      imageUrl: image.imageUrl,
      imageThumbUrl: image.imageThumbUrl,
      imagePending: false,
    };
  }

  return image?.status === "pending" ? { ...recipe, imagePending: true } : recipe;
}

/** Photo states keyed by database recipe id, for lists that load recipes from the DB. */
export function indexGeneratedImagesByRecipeId(
  images: Record<string, GeneratedRecipeImage>,
): Record<string, GeneratedRecipeImage> {
  const byRecipeId: Record<string, GeneratedRecipeImage> = {};
  for (const image of Object.values(images)) {
    if (image.status !== "none" && image.recipeId) {
      byRecipeId[image.recipeId] = image;
    }
  }
  return byRecipeId;
}

function isImageStatusEntry(value: unknown): value is ImageStatusEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.key === "string" &&
    (entry.status === "pending" || entry.status === "ready" || entry.status === "none")
  );
}

/**
 * Cover photos for freshly generated Rivo recipes. The server saves them and
 * generates the photo in the background, so this polls until each photo is
 * ready. Users without the photo perk (free plan) get no entries at all, so
 * callers never show a loading skeleton for them.
 */
export function useGeneratedRecipeImages({
  locale,
  sources,
}: {
  locale: "en" | "sk";
  /** Memoize: a new array restarts polling. */
  sources: GeneratedRecipeImageSource[] | null;
}): Record<string, GeneratedRecipeImage> {
  // null = not known yet; asked once up front so the skeleton is right on first render.
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [images, setImages] = useState<Record<string, GeneratedRecipeImage>>({});

  useEffect(() => {
    let cancelled = false;

    fetch(IMAGE_ENDPOINT, { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { enabled?: unknown } | null) => {
        if (!cancelled) {
          setEnabled(payload?.enabled === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !sources?.length) {
      setImages({});
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const state: Record<string, GeneratedRecipeImage> = Object.fromEntries(
      sources.map((source) => [source.key, { status: "pending", recipeId: null }]),
    );
    setImages({ ...state });

    const poll = async () => {
      attempts += 1;
      const waiting = sources.filter((source) => state[source.key]?.status === "pending");

      try {
        const response = await fetch(IMAGE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ locale, recipes: waiting }),
        });
        const payload: { recipes?: unknown[] } | null = response.ok
          ? await response.json().catch(() => null)
          : null;

        for (const entry of payload?.recipes ?? []) {
          if (isImageStatusEntry(entry) && entry.key in state) {
            const { key, ...image } = entry;
            state[key] = image;
          }
        }
      } catch {
        // Network hiccup: keep waiting until the attempts run out.
      }

      if (cancelled) {
        return;
      }

      const stillPending = sources.some((source) => state[source.key]?.status === "pending");
      if (stillPending && attempts >= MAX_POLLS) {
        for (const source of sources) {
          if (state[source.key]?.status === "pending") {
            state[source.key] = { status: "none" };
          }
        }
      }

      setImages({ ...state });

      if (stillPending && attempts < MAX_POLLS) {
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [enabled, locale, sources]);

  return images;
}
