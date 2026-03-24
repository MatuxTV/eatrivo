import { END, START, StateGraph } from "@langchain/langgraph";

import { CUSTOM_RECIPE_MAX_RETRIES } from "./constants";
import { errorHandler } from "./nodes/errorHandler";
import { fallbackDatabaseRecommendations } from "./nodes/fallbackDatabaseRecommendations";
import { fetchPantry } from "./nodes/fetchPantry";
import { fetchProfile } from "./nodes/fetchProfile";
import { finalizeResult } from "./nodes/finalizeResult";
import { recipeRequest } from "./nodes/recipeRequest";
import { validateRecipeJson } from "./nodes/validateRecipeJson";
import { CustomRecipeState } from "./state";

/* eslint-disable @typescript-eslint/no-explicit-any */

function routeAfterFetchProfile(state: typeof CustomRecipeState.State): string {
  return state.fatalError ? "error_handler" : "fetch_pantry";
}

function routeAfterFetchPantry(state: typeof CustomRecipeState.State): string {
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
    return "fallback_database_recommendations";
  }

  if (state.requestError && state.retryCount < CUSTOM_RECIPE_MAX_RETRIES) {
    return "recipe_request";
  }

  return "fallback_database_recommendations";
}

export function buildCustomRecipeGraph() {
  return new StateGraph(CustomRecipeState)
    .addNode("fetch_profile", fetchProfile as any)
    .addNode("fetch_pantry", fetchPantry as any)
    .addNode("recipe_request", recipeRequest as any)
    .addNode("validate_recipe_json", validateRecipeJson as any)
    .addNode(
      "fallback_database_recommendations",
      fallbackDatabaseRecommendations as any,
    )
    .addNode("finalize_result", finalizeResult as any)
    .addNode("error_handler", errorHandler as any)
    .addEdge(START, "fetch_profile")
    .addConditionalEdges("fetch_profile", routeAfterFetchProfile, {
      fetch_pantry: "fetch_pantry",
      error_handler: "error_handler",
    })
    .addConditionalEdges("fetch_pantry", routeAfterFetchPantry, {
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
      recipe_request: "recipe_request",
      fallback_database_recommendations: "fallback_database_recommendations",
      error_handler: "error_handler",
    })
    .addEdge("fallback_database_recommendations", "finalize_result")
    .addEdge("finalize_result", END)
    .addEdge("error_handler", END)
    .compile();
}
