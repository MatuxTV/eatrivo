import { RECIPE_IMAGE_SIZES, type RecipeImageSize } from "./config";

const WEBP_EXTENSION = ".webp";
const THUMB_SUFFIX = `_${RECIPE_IMAGE_SIZES.thumb}${WEBP_EXTENSION}`;

export function buildRecipeImageKey(
  recipeId: string,
  imageId: string,
  size: RecipeImageSize,
): string {
  if (size === "thumb") {
    return `recipes/${recipeId}/${imageId}${THUMB_SUFFIX}`;
  }

  return `recipes/${recipeId}/${imageId}${WEBP_EXTENSION}`;
}

function applySize(storageKey: string, size: RecipeImageSize): string {
  if (size === "full") {
    return storageKey;
  }

  // Already a thumbnail.
  if (storageKey.endsWith(THUMB_SUFFIX)) {
    return storageKey;
  }

  // Convert a generated full-size key into its thumbnail sibling. Keys that are
  // not `.webp` (legacy admin uploads) have no thumbnail variant and are kept.
  if (storageKey.endsWith(WEBP_EXTENSION)) {
    return `${storageKey.slice(0, -WEBP_EXTENSION.length)}${THUMB_SUFFIX}`;
  }

  return storageKey;
}

export function getRecipeImageUrl(
  storageKey: string | null | undefined,
  size: RecipeImageSize = "full",
  baseUrl: string | null | undefined = process.env.NEXT_PUBLIC_RECIPE_IMAGE_BASE_URL,
): string | null {
  if (!storageKey || !baseUrl) {
    return null;
  }

  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/${applySize(storageKey, size)}`;
}
