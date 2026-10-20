import { db } from "@/index";
import { chatMessages, chatSessions } from "@/db/schema";
import { AIMessage } from "@langchain/core/messages";
import { eq } from "drizzle-orm";
import type { ChatState } from "../state";
import { messageText } from "@/lib/ai/message-text";
import { resolveModelConfig } from "@/lib/ai/model-config";

export async function saveAssistantMessage(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  // Nájdi poslednú AI správu v messages
  const lastAI = [...state.messages]
    .reverse()
    .find((m) => m instanceof AIMessage || m.getType() === "ai");

  if (!lastAI) return {};

  const content = messageText(lastAI);
  const now = new Date();

  try {
    await db.insert(chatMessages).values({
      userProfileId: state.userProfileId,
      sessionId: state.sessionId,
      role: "assistant",
      content,
      intent: state.intent ?? null,
      metadata: {
        model: resolveModelConfig("chat").model,
        payload: state.assistantMessageMetadata,
      },
    });

    await db
      .update(chatSessions)
      .set({
        updatedAt: now,
        lastMessageAt: now,
      })
      .where(eq(chatSessions.id, state.sessionId));
  } catch {
    // Non-fatal — DB zlyha, ale odpoveď sme už streamovali
  }

  return {};
}
