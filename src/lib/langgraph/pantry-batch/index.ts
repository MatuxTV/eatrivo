import { END, START, StateGraph } from "@langchain/langgraph";

import { PantryBatchState } from "./state";
import { aiNormalize } from "./nodes/aiNormalize";
import { buildPrompt } from "./nodes/buildPrompt";
import { fetchContext } from "./nodes/fetchContext";
import { upsertPantry } from "./nodes/upsertPantry";

/* eslint-disable @typescript-eslint/no-explicit-any */

function routeAfterFetchContext(
  state: typeof PantryBatchState.State,
): string {
  return state.error ? "end" : "build_prompt";
}

export function buildPantryBatchGraph() {
  return new StateGraph(PantryBatchState)
    .addNode("fetch_context", fetchContext as any)
    .addNode("build_prompt", buildPrompt as any)
    .addNode("ai_normalize", aiNormalize as any)
    .addNode("upsert_pantry", upsertPantry as any)
    .addEdge(START, "fetch_context")
    .addConditionalEdges("fetch_context", routeAfterFetchContext, {
      build_prompt: "build_prompt",
      end: END,
    })
    .addEdge("build_prompt", "ai_normalize")
    .addEdge("ai_normalize", "upsert_pantry")
    .addEdge("upsert_pantry", END)
    .compile();
}
