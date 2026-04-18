import { END, START, StateGraph } from "@langchain/langgraph";

import { CUSTOM_RECIPE_MAX_RETRIES } from "./constants";
import { errorHandler } from "./nodes/errorHandler";
import { fallbackDatabaseRecommendations } from "./nodes/fallbackDatabaseRecommendations";
import { fetchPantry } from "./nodes/fetchPantry";
import { fetchProfile } from "./nodes/fetchProfile";
import { fetchPreviousRecipe } from "./nodes/fetchPreviousRecipe";
import { finalizeResult } from "./nodes/finalizeResult";
import { repairRecipeUnits } from "./nodes/repairRecipeUnits";
import { recipeRequest } from "./nodes/recipeRequest";
import { validateRecipeDiversity } from "./nodes/validateRecipeDiversity";
import { validateRecipeJson } from "./nodes/validateRecipeJson";
import { validateUnitSemantics } from "./nodes/validateUnitSemantics";
import { CustomRecipeState } from "./state";

/* eslint-disable @typescript-eslint/no-explicit-any */

function routeAfterFetchProfile(state: typeof CustomRecipeState.State): string {
  if (state.fatalError) {
    return "error_handler";
  }

  return state.mode === "preferences_only"
    ? "fetch_previous_recipe"
    : "fetch_pantry";
}

function routeAfterFetchPantry(state: typeof CustomRecipeState.State): string {
  return state.fatalError ? "error_handler" : "fetch_previous_recipe";
}

function routeAfterFetchPreviousRecipe(state: typeof CustomRecipeState.State): string {
  return state.fatalError ? "error_handler" : "recipe_request";
}

function routeAfterRecipeRequest(state: typeof CustomRecipeState.State): string {
  if (state.fatalError) {
    return "error_handler";
  }

  if (state.parsedAiOutput) {
    return "fallback_database_recommendations";
  }

  if (state.rawAiOutput) {
    return "validate_recipe_json";
  }

  if (state.requestError && state.retryCount < CUSTOM_RECIPE_MAX_RETRIES) {
    return "recipe_request";
  }

  return "fallback_database_recommendations";
}

function routeAfterValidation(state: typeof CustomRecipeState.State): string {
  if (state.fatalError) {
    return "error_handler";
  }

  if (state.parsedAiOutput) {
    return "validate_unit_semantics";
  }

  if (state.requestError && state.retryCount < CUSTOM_RECIPE_MAX_RETRIES) {
    return "recipe_request";
  }

  return "finalize_result";
}

function routeAfterUnitSemantics(state: typeof CustomRecipeState.State): string {
  if (state.fatalError) {
    return "error_handler";
  }

  if (state.unitSemanticAudit?.passed) {
    return "validate_recipe_diversity";
  }

  if (state.unitSemanticAudit && state.unitSemanticAudit.issues.length > 0) {
    return "repair_recipe_units";
  }

  if (state.requestError && state.retryCount < CUSTOM_RECIPE_MAX_RETRIES) {
    return "recipe_request";
  }

  return "finalize_result";
}

function routeAfterUnitRepair(state: typeof CustomRecipeState.State): string {
  if (state.fatalError) {
    return "error_handler";
  }

  if (state.rawAiOutput) {
    return "validate_recipe_json";
  }

  if (state.requestError && state.retryCount < CUSTOM_RECIPE_MAX_RETRIES) {
    return "recipe_request";
  }

  return "finalize_result";
}

function routeAfterDiversity(state: typeof CustomRecipeState.State): string {
  if (state.fatalError) {
    return "error_handler";
  }

  if (state.requestError && state.retryCount < CUSTOM_RECIPE_MAX_RETRIES) {
    return "recipe_request";
  }

  return "finalize_result";
}

function routeAfterFinalize(state: typeof CustomRecipeState.State): string {
  if (state.fatalError) {
    return "error_handler";
  }

  if (state.finalResult?.meta.fallbackUsed && !state.fallbackSuggestionsFetched) {
    return "fallback_database_recommendations";
  }

  return END;
}

export function buildCustomRecipeGraph() {
  return new StateGraph(CustomRecipeState)
    .addNode("fetch_profile", fetchProfile as any)
    .addNode("fetch_pantry", fetchPantry as any)
    .addNode("fetch_previous_recipe", fetchPreviousRecipe as any)
    .addNode("recipe_request", recipeRequest as any)
    .addNode("validate_recipe_json", validateRecipeJson as any)
    .addNode("validate_unit_semantics", validateUnitSemantics as any)
    .addNode("repair_recipe_units", repairRecipeUnits as any)
    .addNode("validate_recipe_diversity", validateRecipeDiversity as any)
    .addNode(
      "fallback_database_recommendations",
      fallbackDatabaseRecommendations as any,
    )
    .addNode("finalize_result", finalizeResult as any)
    .addNode("error_handler", errorHandler as any)
    .addEdge(START, "fetch_profile")
    .addConditionalEdges("fetch_profile", routeAfterFetchProfile, {
      fetch_pantry: "fetch_pantry",
      fetch_previous_recipe: "fetch_previous_recipe",
      error_handler: "error_handler",
    })
    .addConditionalEdges("fetch_pantry", routeAfterFetchPantry, {
      fetch_previous_recipe: "fetch_previous_recipe",
      error_handler: "error_handler",
    })
    .addConditionalEdges("fetch_previous_recipe", routeAfterFetchPreviousRecipe, {
      recipe_request: "recipe_request",
      error_handler: "error_handler",
    })
    .addConditionalEdges("recipe_request", routeAfterRecipeRequest, {
      validate_recipe_json: "validate_recipe_json",
      recipe_request: "recipe_request",
      fallback_database_recommendations: "fallback_database_recommendations",
      error_handler: "error_handler",
    })
    .addConditionalEdges("validate_recipe_json", routeAfterValidation, {
      validate_unit_semantics: "validate_unit_semantics",
      recipe_request: "recipe_request",
      finalize_result: "finalize_result",
      error_handler: "error_handler",
    })
    .addConditionalEdges("validate_unit_semantics", routeAfterUnitSemantics, {
      repair_recipe_units: "repair_recipe_units",
      validate_recipe_diversity: "validate_recipe_diversity",
      recipe_request: "recipe_request",
      finalize_result: "finalize_result",
      error_handler: "error_handler",
    })
    .addConditionalEdges("repair_recipe_units", routeAfterUnitRepair, {
      validate_recipe_json: "validate_recipe_json",
      recipe_request: "recipe_request",
      finalize_result: "finalize_result",
      error_handler: "error_handler",
    })
    .addConditionalEdges("validate_recipe_diversity", routeAfterDiversity, {
      recipe_request: "recipe_request",
      finalize_result: "finalize_result",
      error_handler: "error_handler",
    })
    .addConditionalEdges("finalize_result", routeAfterFinalize, {
      fallback_database_recommendations: "fallback_database_recommendations",
      [END]: END,
      error_handler: "error_handler",
    })
    .addEdge("fallback_database_recommendations", "finalize_result")
    .addEdge("error_handler", END)
    .compile();
}
