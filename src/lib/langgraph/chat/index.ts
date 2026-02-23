import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatState } from "./state";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Nody od Agent 1
import { fetchProfile } from "./nodes/fetchProfile";
import { saveUserMessage } from "./nodes/saveUserMessage";
import { intentRouter } from "./nodes/intentRouter";
import { fetchPlan } from "./nodes/fetchPlan";
import { fetchMacros } from "./nodes/fetchMacros";

// Nody od Agent 2
import { fetchPantry } from "./nodes/fetchPantry";
import { buildPrompt } from "./nodes/buildPrompt";
import { rivoLlm } from "./nodes/rivoLlm";
import { saveAssistantMessage } from "./nodes/saveAssistantMessage";
import { errorHandler } from "./nodes/errorHandler";

import type { Intent } from "./types";

// ─── Routing functions ────────────────────────────────────────────────────────

function routeAfterFetchProfile(state: typeof ChatState.State): string {
  return state.error ? "error_handler" : "save_user_message";
}

function routeByIntent(state: typeof ChatState.State): string {
  if (state.error) return "error_handler";
  switch (state.intent as Intent) {
    case "meal_swap":
    case "recipe":
      return "fetch_plan";
    case "macros":
      return "fetch_macros";
    case "pantry":
      return "fetch_pantry";
    default:
      return "build_prompt";
  }
}

function routeAfterLlm(state: typeof ChatState.State): string {
  return state.error ? "error_handler" : "save_assistant_message";
}

// ─── Graph builder ────────────────────────────────────────────────────────────

export function buildChatGraph() {
  const builder = new StateGraph(ChatState)
    // Register nodes
    .addNode("fetch_profile", fetchProfile as any)
    .addNode("save_user_message", saveUserMessage as any)
    .addNode("intent_router", intentRouter as any)
    .addNode("fetch_plan", fetchPlan as any)
    .addNode("fetch_macros", fetchMacros as any)
    .addNode("fetch_pantry", fetchPantry as any)
    .addNode("build_prompt", buildPrompt as any)
    .addNode("rivo_llm", rivoLlm as any)
    .addNode("save_assistant_message", saveAssistantMessage as any)
    .addNode("error_handler", errorHandler as any)

    // Edges
    .addEdge(START, "fetch_profile")

    .addConditionalEdges("fetch_profile", routeAfterFetchProfile, {
      save_user_message: "save_user_message",
      error_handler: "error_handler",
    })

    .addEdge("save_user_message", "intent_router")

    .addConditionalEdges("intent_router", routeByIntent, {
      fetch_plan: "fetch_plan",
      fetch_macros: "fetch_macros",
      fetch_pantry: "fetch_pantry",
      build_prompt: "build_prompt",
      error_handler: "error_handler",
    })

    .addEdge("fetch_plan", "build_prompt")
    .addEdge("fetch_macros", "build_prompt")
    .addEdge("fetch_pantry", "build_prompt")
    .addEdge("build_prompt", "rivo_llm")

    .addConditionalEdges("rivo_llm", routeAfterLlm, {
      save_assistant_message: "save_assistant_message",
      error_handler: "error_handler",
    })

    .addEdge("save_assistant_message", END)
    .addEdge("error_handler", END);

  return builder.compile();
}
