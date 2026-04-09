import { getOwnedChatSession, getAuthenticatedChatContext } from "@/lib/chat-auth";
import { getOwnedChatMessages } from "@/lib/chat-history";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const authResult = await getAuthenticatedChatContext();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { sessionId } = await params;
  const ownedSession = await getOwnedChatSession(
    sessionId,
    authResult.context.userProfileId,
  );

  if (!ownedSession) {
    return Response.json({ error: "Chat session not found" }, { status: 404 });
  }

  const messages = await getOwnedChatMessages(
    sessionId,
    authResult.context.userProfileId,
  );

  return Response.json({
    session: {
      id: ownedSession.id,
      title: ownedSession.title,
      createdAt: ownedSession.createdAt.toISOString(),
      updatedAt: ownedSession.updatedAt.toISOString(),
      lastMessageAt: ownedSession.lastMessageAt.toISOString(),
    },
    messages,
  });
}