import { join, resolve } from "node:path";

import type { RecipeUrlImportState } from "../state";

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildDefaultOutputPath(recipeUrl: URL): string {
  const hostname = slugify(recipeUrl.hostname);
  const pathname = slugify(recipeUrl.pathname.replace(/\/$/, "") || "recipe");
  return resolve(
    join("receipes/generated", `${hostname}-${pathname || "recipe"}.json`),
  );
}

export async function selectRecipeUrl(
  state: typeof RecipeUrlImportState.State,
): Promise<Partial<typeof RecipeUrlImportState.State>> {
  const selectedRecipeUrl = state.recipeUrls[0] ?? null;

  if (!selectedRecipeUrl) {
    return { error: "No recipe URLs configured for processing." };
  }

  let outputPath: string;

  try {
    outputPath = buildDefaultOutputPath(new URL(selectedRecipeUrl));
  } catch {
    return { error: `Invalid recipe URL: ${selectedRecipeUrl}` };
  }

  return {
    selectedRecipeUrl,
    outputPath,
  };
}