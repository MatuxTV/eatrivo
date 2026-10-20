import { getChatModel } from "@/lib/ai/models";
import type { ChatState } from "../state";

export async function rivoLlm(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  try {
    const { model } = getChatModel("chat");

    const messagesToSen = state.systemPrompt
      ? [{ role: "system", content: state.systemPrompt }, ...state.messages]
      : state.messages;

    const response = await model.invoke(messagesToSen);
    return { messages: [response] };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "rivo_llm failed",
    };
  }
}
