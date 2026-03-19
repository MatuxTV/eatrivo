export const CUSTOM_RECIPE_MAX_RETRIES = 3;
export const CUSTOM_RECIPE_AI_TIMEOUT_MS = 25_000;

export const NODE_PROGRESS: Record<
  string,
  { progress: number; label: string }
> = {
  fetch_profile: {
    progress: 10,
    label: "customRecipe.fetchingProfile",
  },
  fetch_pantry: {
    progress: 25,
    label: "customRecipe.fetchingPantry",
  },
  recipe_request: {
    progress: 55,
    label: "customRecipe.requestingRecipe",
  },
  validate_recipe_json: {
    progress: 72,
    label: "customRecipe.validatingRecipe",
  },
  fallback_database_recommendations: {
    progress: 88,
    label: "customRecipe.fetchingFallbacks",
  },
  finalize_result: {
    progress: 95,
    label: "customRecipe.finalizing",
  },
};

export const INITIAL_PROGRESS = NODE_PROGRESS.fetch_profile;
