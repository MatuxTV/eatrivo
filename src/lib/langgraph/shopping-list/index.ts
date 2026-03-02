import { StateGraph, START, END } from "@langchain/langgraph";
import { ShoppingListState } from "./state";

// NOTE: LangGraph's StateGraph.addNode() typing doesn't align with Partial<State> return signatures.
// Using `as any` per the established pattern in src/lib/langgraph/chat/index.ts.
/* eslint-disable @typescript-eslint/no-explicit-any */

// Nodes
import { fetchProfile } from "./nodes/fetchProfile";
import { macroCalc } from "./nodes/macroCalc";
import { pantryHealthCheck } from "./nodes/pantryHealthCheck";
import { fetchHistory } from "./nodes/fetchHistory";
import { inventoryScan } from "./nodes/inventoryScan";
import { buildPrompt } from "./nodes/buildPrompt";
import { aiGenerator } from "./nodes/aiGenerator";
import { merger } from "./nodes/merger";
import { macroValidator } from "./nodes/macroValidator";
import { finalFormat } from "./nodes/finalFormat";
import { saveToDb } from "./nodes/saveToDb";
import { notifyUser } from "./nodes/notifyUser";
import { errorHandler } from "./nodes/errorHandler";

// ─── Routing functions ────────────────────────────────────────────────────────

function routeAfterFetchProfile(state: typeof ShoppingListState.State): string {
  return state.error ? "error_handler" : "macro_calc";
}

function routeAfterAiGenerator(state: typeof ShoppingListState.State): string {
  return state.error ? "error_handler" : "merger";
}

function routeAfterMacroValidator(
  state: typeof ShoppingListState.State,
): string {
  // Ak aiOutput bol vymazaný (validácia zlyhala) a máme ešte pokusy → retry
  if (!state.aiOutput && state.retryCount < 3) {
    return "build_prompt";
  }
  return "final_format";
}

// ─── Graph builder ────────────────────────────────────────────────────────────

export function buildShoppingListGraph() {
  const builder = new StateGraph(ShoppingListState)
    // Register nodes
    .addNode("fetch_profile", fetchProfile as any)
    .addNode("macro_calc", macroCalc as any)
    .addNode("pantry_health_check", pantryHealthCheck as any)
    .addNode("fetch_history", fetchHistory as any)
    .addNode("inventory_scan", inventoryScan as any)
    .addNode("build_prompt", buildPrompt as any)
    .addNode("ai_generator", aiGenerator as any)
    .addNode("merger", merger as any)
    .addNode("macro_validator", macroValidator as any)
    .addNode("final_format", finalFormat as any)
    .addNode("save_to_db", saveToDb as any)
    .addNode("notify_user", notifyUser as any)
    .addNode("error_handler", errorHandler as any)

    // Edges
    .addEdge(START, "fetch_profile")

    .addConditionalEdges("fetch_profile", routeAfterFetchProfile, {
      macro_calc: "macro_calc",
      error_handler: "error_handler",
    })

    .addEdge("macro_calc", "pantry_health_check")
    .addEdge("pantry_health_check", "fetch_history")
    .addEdge("fetch_history", "inventory_scan")
    .addEdge("inventory_scan", "build_prompt")
    .addEdge("build_prompt", "ai_generator")

    .addConditionalEdges("ai_generator", routeAfterAiGenerator, {
      merger: "merger",
      error_handler: "error_handler",
    })

    .addEdge("merger", "macro_validator")

    .addConditionalEdges("macro_validator", routeAfterMacroValidator, {
      build_prompt: "build_prompt",
      final_format: "final_format",
    })

    .addEdge("final_format", "save_to_db")
    .addEdge("save_to_db", "notify_user")
    .addEdge("notify_user", END)
    .addEdge("error_handler", END);

  return builder.compile();
}
