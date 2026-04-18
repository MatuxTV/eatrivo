import { randomUUID } from "node:crypto";

import { db } from "@/index";
import { chatSessions } from "@/db/schema";
import { getAuthenticatedChatContext } from "@/lib/chat-auth";
import { listOwnedChatSessions } from "@/lib/chat-history";

export async function GET() {
  const authResult = await getAuthenticatedChatContext();
  if (!authResult.ok) {
    return authResult.response;
  }

  const sessions = await listOwnedChatSessions(authResult.context.userProfileId);
  return Response.json({ sessions });
}

export async function POST() {
  const authResult = await getAuthenticatedChatContext();
  if (!authResult.ok) {
    return authResult.response;
  }

  const sessionId = randomUUID();
  const now = new Date();

  await db.insert(chatSessions).values({
    id: sessionId,
    userProfileId: authResult.context.userProfileId,
    title: null,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
  });

  return Response.json({
    session: {
      id: sessionId,
      title: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastMessageAt: now.toISOString(),
      messageCount: 0,
      lastMessagePreview: null,
    },
  });
}