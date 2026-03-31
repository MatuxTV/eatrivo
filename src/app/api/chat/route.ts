import type { NextRequest } from "next/server";
import { auth } from "../../../../auth";
import { db } from "@/index";
import { userProfiles, users, chatMessages } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import {
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";
import { buildChatGraph } from "@/lib/langgraph/chat";
import { trackEvent } from "@/lib/analytics";
import { unauthorizedError } from "@/lib/safeError";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

const MAX_INPUT_CHARS = 600;  // ~4 vety / ~100 slov
const MAX_HISTORY = 10;       // posledných 10 správ
const DAILY_MESSAGE_LIMIT_BASIC = 10; // basic users: 10 messages/day

export async function POST(req: NextRequest) {
  // ① Auth
  const session = await auth();
  if (!session?.user?.id) return unauthorizedError();

  // ② Rate limit — "expensive" (AI volanie stojí peniaze, 10/min)
  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(req, session.user.id),
    "expensive",
  );
  if (!rateLimitResult.success) return rateLimitResult.response!;

  // ②b Daily message limit for basic users
  const [user] = await db
    .select({ membership: users.membership })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (user?.membership === "basic") {
    const [profile] = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

    if (profile) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [{ count: todayCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.userProfileId, profile.id),
            eq(chatMessages.role, "user"),
            gte(chatMessages.createdAt, todayStart),
          ),
        );

      if (todayCount >= DAILY_MESSAGE_LIMIT_BASIC) {
        await trackEvent({
          userId: session.user.id,
          eventName: "chat_limit_reached",
          metadata: {
            limit: DAILY_MESSAGE_LIMIT_BASIC,
            used: todayCount,
            membership: user.membership,
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
  }

  // ③ Parse body bezpečne
  let messages: { role: string; content: string }[];
  let sessionId: string | undefined;
  try {
    const body = await req.json();
    messages = body.messages ?? [];
    sessionId = body.sessionId;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // ④ Filtrovať system správy z klienta (prompt injection ochrana)
  //    + obmedziť históriu na posledných MAX_HISTORY správ
  const safeMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY);

  // ⑤ Validovať dĺžku poslednej user správy
  const lastUserMsg = [...safeMessages].reverse().find((m) => m.role === "user");
  if (lastUserMsg && lastUserMsg.content.length > MAX_INPUT_CHARS) {
    return new Response(
      JSON.stringify({ error: "Správa je príliš dlhá. Maximálne 600 znakov." }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  // ⑥ Resolve userProfileId
  const [profile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id));

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  await trackEvent({
    userId: session.user.id,
    eventName: "chat_message_sent",
    metadata: {
      sessionId: sessionId ?? null,
      membership: user?.membership ?? null,
      messageLength: lastUserMsg?.content.length ?? 0,
      historyCount: safeMessages.length,
      source: "chat_api",
    },
  });

  // ⑦ Map frontend messages to LangChain message classes
  const langchainMessages = safeMessages.map((m) =>
    m.role === "assistant" ? new AIMessage(m.content) : new HumanMessage(m.content),
  );

  const graph = buildChatGraph();
  const encoder = new TextEncoder();

  const stream = await graph.stream(
    {
      messages: langchainMessages,
      userProfileId: profile.id,
      sessionId: sessionId ?? crypto.randomUUID(),
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
              userId: session.user.id,
              eventName: "chat_response_received",
              metadata: {
                sessionId: sessionId ?? null,
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
