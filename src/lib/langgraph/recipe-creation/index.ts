import { END, START, StateGraph } from "@langchain/langgraph";

import { generateRecipe } from "./nodes/generateRecipe";
import { RecipeCreationState } from "./state";

/* eslint-disable @typescript-eslint/no-explicit-any */

function routeAfterGeneration(state: typeof RecipeCreationState.State): string {
  return state.fatalError ? END : END;
}

export function buildRecipeCreationGraph() {
  return new StateGraph(RecipeCreationState)
    .addNode("generate_recipe", generateRecipe as any)
    .addEdge(START, "generate_recipe")
    .addConditionalEdges("generate_recipe", routeAfterGeneration, {
      [END]: END,
    })
    .compile();
}