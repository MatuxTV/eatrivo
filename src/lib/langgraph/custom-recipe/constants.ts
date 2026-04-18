export const CUSTOM_RECIPE_MAX_RETRIES = 3;
export const CUSTOM_RECIPE_AI_TIMEOUT_MS = 35_000; // Increased to 35s to reduce interruptions
export const CUSTOM_RECIPE_MIN_VALID_OUTPUT_LENGTH = 600; // Minimum chars for valid recipe JSON

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
  fetch_previous_recipe: {
    progress: 38,
    label: "customRecipe.fetchingPreviousRecipe",
  },
  recipe_request: {
    progress: 55,
    label: "customRecipe.requestingRecipe",
  },
  validate_recipe_json: {
    progress: 72,
    label: "customRecipe.validatingRecipe",
  },
  validate_unit_semantics: {
    progress: 78,
    label: "customRecipe.validatingUnits",
  },
  repair_recipe_units: {
    progress: 84,
    label: "customRecipe.repairingUnits",
  },
  validate_recipe_diversity: {
    progress: 88,
    label: "customRecipe.validatingDiversity",
  },
  fallback_database_recommendations: {
    progress: 90,
    label: "customRecipe.fetchingFallbacks",
  },
  finalize_result: {
    progress: 96,
    label: "customRecipe.finalizing",
  },
};

export const INITIAL_PROGRESS = NODE_PROGRESS.fetch_profile;
