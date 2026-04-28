import { db } from "@/index";
import { chatMessages, chatSessions } from "@/db/schema";
import { buildChatSessionTitle } from "@/lib/chat/chat-history";
import { eq } from "drizzle-orm";
import type { ChatState } from "../state";

export async function saveUserMessage(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const lastMsg = state.messages.at(-1);
  if (!lastMsg || lastMsg.getType() !== "human") return {};

  const content =
    typeof lastMsg.content === "string"
      ? lastMsg.content
      : JSON.stringify(lastMsg.content);
  const now = new Date();

  try {
    await db.insert(chatMessages).values({
      userProfileId: state.userProfileId,
      sessionId: state.sessionId,
      role: "user",
      content,
    });

    const [currentSession] = await db
      .select({ title: chatSessions.title })
      .from(chatSessions)
      .where(eq(chatSessions.id, state.sessionId));

    await db
      .update(chatSessions)
      .set({
        title: currentSession?.title ?? buildChatSessionTitle(content),
        updatedAt: now,
        lastMessageAt: now,
      })
      .where(eq(chatSessions.id, state.sessionId));
  } catch {
    // Non-fatal — pokračujeme aj keď uloženie zlyhá
  }

  return {};
}
