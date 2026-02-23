import { db } from "@/index";
import { chatMessages } from "@/db/schema";
import type { ChatState } from "../state";

export async function saveUserMessage(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const lastMsg = state.messages.at(-1);
  if (!lastMsg || lastMsg.getType() !== "human") return {};

  try {
    await db.insert(chatMessages).values({
      userProfileId: state.userProfileId,
      sessionId: state.sessionId,
      role: "user",
      content:
        typeof lastMsg.content === "string"
          ? lastMsg.content
          : JSON.stringify(lastMsg.content),
    });
  } catch {
    // Non-fatal — pokračujeme aj keď uloženie zlyhá
  }

  return {};
}
