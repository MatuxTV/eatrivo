// Server-side URL resolution for recipe cover photos. The base URL lives in a
// server env var, so URLs are built here and sent to the client ready to use.

import { getRecipeImageUrl } from "./storage-keys";

export interface RecipeImageUrls {
  imageUrl: string | null;
  imageThumbUrl: string | null;
}

export function resolveRecipeImageUrls(
  storageKey: string | null | undefined,
  baseUrl: string | null | undefined = process.env.RECIPE_IMAGE_BASE_URL,
): RecipeImageUrls {
  return {
    imageUrl: getRecipeImageUrl(storageKey, "full", baseUrl),
    imageThumbUrl: getRecipeImageUrl(storageKey, "thumb", baseUrl),
  };
}
