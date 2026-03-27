import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { ChatState } from "../state";

const rivoModel = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-preview", // stable & capable model
  temperature: 0.7,
  maxOutputTokens: 2048,
  apiKey: process.env.GOOGLE_AI_API_KEY,
  streaming: true,
});

export async function rivoLlm(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  try {
    const messagesToSen = state.systemPrompt
      ? [{ role: "system", content: state.systemPrompt }, ...state.messages]
      : state.messages;

    const response = await rivoModel.invoke(messagesToSen);
    return { messages: [response] };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "rivo_llm failed",
    };
  }
}
