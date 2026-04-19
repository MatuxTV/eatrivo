import type { NextRequest } from "next/server";
import { db } from "@/index";
import { chatMessages } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";
import { buildChatGraph } from "@/lib/langgraph/chat";
import { trackEvent } from "@/lib/analytics/analytics";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  getAuthenticatedChatContext,
  getOwnedChatSession,
} from "@/lib/chat/chat-auth";
import { getRecentOwnedChatMessages } from "@/lib/chat/chat-history";

const MAX_INPUT_CHARS = 600;  // ~4 vety / ~100 slov
const MAX_HISTORY = 10;       // posledných 10 správ
const DAILY_MESSAGE_LIMIT_BASIC = 10; // basic users: 10 messages/day

export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedChatContext();
  if (!authResult.ok) return authResult.response;
  const { context } = authResult;

  // ② Rate limit — "expensive" (AI volanie stojí peniaze, 10/min)
  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(req, context.userId),
    "expensive",
  );
  if (!rateLimitResult.success) return rateLimitResult.response!;

  // ②b Daily message limit for basic users
  if (context.membership === "basic") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ count: todayCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userProfileId, context.userProfileId),
          eq(chatMessages.role, "user"),
          gte(chatMessages.createdAt, todayStart),
        ),
      );

    if (todayCount >= DAILY_MESSAGE_LIMIT_BASIC) {
      await trackEvent({
        userId: context.userId,
        eventName: "chat_limit_reached",
        metadata: {
          limit: DAILY_MESSAGE_LIMIT_BASIC,
          used: todayCount,
          membership: context.membership,
          source: "chat_api",
        },
      });

      return new Response(
        JSON.stringify({
          error: "daily_limit_reached",
          message: "Dosiahol si denný limit správ. Prejdi na Plus pre neobmedzeny chat.",
          limit: DAILY_MESSAGE_LIMIT_BASIC,
          used: todayCount,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ③ Parse body bezpečne
  let messages: { role: string; content: string }[] = [];
  let sessionId: string | undefined;
  let message: string | undefined;
  try {
    const body = await req.json();
    messages = body.messages ?? [];
    sessionId = body.sessionId;
    message = body.message;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!sessionId || typeof sessionId !== "string") {
    return Response.json({ error: "Chat session is required" }, { status: 400 });
  }

  const ownedSession = await getOwnedChatSession(sessionId, context.userProfileId);
  if (!ownedSession) {
    return Response.json({ error: "Chat session not found" }, { status: 404 });
  }

  // ④ Filtrovať system správy z klienta (prompt injection ochrana)
  //    + obmedziť históriu na posledných MAX_HISTORY správ
  const safeMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY);

  // ⑤ Validovať dĺžku poslednej user správy
  const lastUserMsg = message && typeof message === "string"
    ? { role: "user", content: message }
    : [...safeMessages].reverse().find((m) => m.role === "user");

  if (!lastUserMsg?.content.trim()) {
    return Response.json({ error: "Správa je povinná." }, { status: 400 });
  }

  if (lastUserMsg.content.length > MAX_INPUT_CHARS) {
    return new Response(
      JSON.stringify({ error: "Správa je príliš dlhá. Maximálne 600 znakov." }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  const persistedHistory = await getRecentOwnedChatMessages(
    ownedSession.id,
    context.userProfileId,
    MAX_HISTORY,
  );

  await trackEvent({
    userId: context.userId,
    eventName: "chat_message_sent",
    metadata: {
      sessionId: ownedSession.id,
      membership: context.membership,
      messageLength: lastUserMsg?.content.length ?? 0,
      historyCount: persistedHistory.length + 1,
      source: "chat_api",
    },
  });

  // ⑦ Map frontend messages to LangChain message classes
  const langchainMessages = persistedHistory.map((m) =>
    m.role === "assistant" ? new AIMessage(m.content) : new HumanMessage(m.content),
  );
  langchainMessages.push(new HumanMessage(lastUserMsg.content));

  const graph = buildChatGraph();
  const encoder = new TextEncoder();

  const stream = await graph.stream(
    {
      messages: langchainMessages,
      userProfileId: context.userProfileId,
      sessionId: ownedSession.id,
    },
    { streamMode: "messages" },
  );

  // ⑧ Streaming response
  return new Response(
    new ReadableStream({
      async start(controller) {
        let accumulated = "";

        try {
          for await (const [chunk, metadata] of stream) {
            if (
              metadata?.langgraph_node === "rivo_llm" &&
              (chunk as { getType?: () => string }).getType?.() === "ai" &&
              typeof chunk.content === "string"
            ) {
              accumulated += chunk.content;
              controller.enqueue(encoder.encode(chunk.content));
            }
          }

          if (accumulated.length > 0) {
            await trackEvent({
              userId: context.userId,
              eventName: "chat_response_received",
              metadata: {
                sessionId: ownedSession.id,
                responseLength: accumulated.length,
                source: "chat_api",
              },
            });
          }
        } catch (err) {
          console.error("🚨 [Chat API Stream Error]:", err);
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
