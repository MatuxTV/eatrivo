import { db } from "@/index";
import { chatMessages } from "@/db/schema";
import { AIMessage } from "@langchain/core/messages";
import type { ChatState } from "../state";

export async function saveAssistantMessage(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  // Nájdi poslednú AI správu v messages
  const lastAI = [...state.messages]
    .reverse()
    .find((m) => m instanceof AIMessage || m.getType() === "ai");

  if (!lastAI) return {};

  try {
    await db.insert(chatMessages).values({
      userProfileId: state.userProfileId,
      sessionId: state.sessionId,
      role: "assistant",
      content:
        typeof lastAI.content === "string"
          ? lastAI.content
          : JSON.stringify(lastAI.content),
      intent: state.intent ?? null,
      metadata: { model: "gemini-3-flash-preview" },
    });
  } catch {
    // Non-fatal — DB zlyha, ale odpoveď sme už streamovali
  }

  return {};
}
