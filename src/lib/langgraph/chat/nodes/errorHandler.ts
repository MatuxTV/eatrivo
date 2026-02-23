import { AIMessage } from "@langchain/core/messages";
import type { ChatState } from "../state";
import { RIVO_FALLBACK_MESSAGE } from "../constants";

export async function errorHandler(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  console.error(
    "🚨 [LangGraph Error Handler] Triggered because of error:",
    state.error,
  );

  return {
    messages: [new AIMessage(RIVO_FALLBACK_MESSAGE)],
  };
}
