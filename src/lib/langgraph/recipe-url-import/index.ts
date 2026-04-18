import { END, START, StateGraph } from "@langchain/langgraph";

import { RecipeUrlImportState } from "./state";
import { buildPrompt } from "./nodes/buildPrompt";
import { fetchRecipePage } from "./nodes/fetchRecipePage";
import { importRecipeFile } from "./nodes/importRecipeFile";
import { normalizeRecipe } from "./nodes/normalizeRecipe";
import { selectRecipeUrl } from "./nodes/selectRecipeUrl";

/* eslint-disable @typescript-eslint/no-explicit-any */

function routeOnError(state: typeof RecipeUrlImportState.State): string {
  return state.error ? "end" : "next";
}

export function buildRecipeUrlImportGraph() {
  return new StateGraph(RecipeUrlImportState)
    .addNode("select_recipe_url", selectRecipeUrl as any)
    .addNode("fetch_recipe_page", fetchRecipePage as any)
    .addNode("build_prompt", buildPrompt as any)
    .addNode("normalize_recipe", normalizeRecipe as any)
    .addNode("import_recipe_file", importRecipeFile as any)
    .addEdge(START, "select_recipe_url")
    .addConditionalEdges("select_recipe_url", routeOnError, {
      next: "fetch_recipe_page",
      end: END,
    })
    .addConditionalEdges("fetch_recipe_page", routeOnError, {
      next: "build_prompt",
      end: END,
    })
    .addConditionalEdges("build_prompt", routeOnError, {
      next: "normalize_recipe",
      end: END,
    })
    .addConditionalEdges("normalize_recipe", routeOnError, {
      next: "import_recipe_file",
      end: END,
    })
    .addEdge("import_recipe_file", END)
    .compile();
}