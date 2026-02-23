# Chat with Rivo — Part 2: LLM Nodes, Graph & Integration

> **Agent 2** — Pracuješ SÚBEŽNE s Agent 1 (`implementation-part1-foundation.md`)
>
> **Závislosť:** Počkaj kým Agent 1 vytvorí `src/lib/langgraph/chat/types.ts` a `state.ts`.
> Potom môžeš ihneď začať Krok 4f — ostatné nody neblokujú seba navzájom.

---

## Čo robíš ty (Agent 2)

```
Krok 4f →  nodes/fetchPantry.ts        ← môžeš začať hneď po types.ts
Krok 4g →  nodes/buildPrompt.ts
Krok 4h →  nodes/rivoLlm.ts
Krok 4i →  nodes/saveAssistantMessage.ts
Krok 4j →  nodes/errorHandler.ts
Krok 5  →  index.ts (graph assembly)   ← počkaj na VŠETKY nody od Agent 1
Krok 6  →  src/app/api/chat/route.ts
Krok 7  →  ChatWithRivoPage.tsx        ← môžeš robiť PARALELNE s Krok 5+6
Krok 8  →  Smoke test
```

## Čo robí Agent 1 (neriešiš)

```
Krok 1  →  npm install
Krok 2  →  DB schema + migrácia
Krok 3  →  types.ts, state.ts, constants.ts
Krok 4a →  nodes/fetchProfile.ts
Krok 4b →  nodes/saveUserMessage.ts
Krok 4c →  nodes/intentRouter.ts
Krok 4d →  nodes/fetchPlan.ts
Krok 4e →  nodes/fetchMacros.ts
```

---

## Krok 4f — `nodes/fetchPantry.ts`

```typescript
// Poznámka: inventoryContext tabuľka príde z shopping-list implementácie.
// Zatiaľ vrátime null — non-blocking pre celý graph flow.

import { ChatState } from "../state";

export async function fetchPantry(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  // TODO: keď bude inventoryContext v schema.ts:
  // const items = await db.select().from(inventoryContext)
  //   .where(eq(inventoryContext.userProfileId, state.userProfileId));
  // return { pantryItems: items.map(i => ({ name: i.name, quantity: i.quantity })) };

  return { pantryItems: null };
}
```

---

## Krok 4g — `nodes/buildPrompt.ts`

```typescript
import { SystemMessage } from "@langchain/core/messages";
import { ChatState } from "../state";

export async function buildPrompt(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const {
    userProfile,
    userInfo,
    intent,
    todaysPlan,
    macroTargets,
    pantryItems,
  } = state;

  const name = userProfile?.fullName?.split(" ")[0] ?? "kamarát";
  const goal = userInfo?.goal?.replace("_", " ") ?? "zdravší životný štýl";
  const diet =
    userInfo?.diet_preferences && userInfo.diet_preferences !== "none"
      ? userInfo.diet_preferences
      : "žiadna špeciálna";
  const allergies = userInfo?.allergies ?? "žiadne";

  let contextBlock = "";

  if ((intent === "meal_swap" || intent === "recipe") && todaysPlan?.meals) {
    // Skrátiť na 1500 znakov — nechceme premíňať tokeny na celý JSON
    contextBlock += `\nDnešný jedálny plán (JSON): ${JSON.stringify(todaysPlan.meals).slice(0, 1500)}`;
  }

  if (intent === "macros" && macroTargets) {
    contextBlock += `\nCieľové makrá: ${macroTargets.dailyCalories} kcal`;
    contextBlock += ` | Bielkoviny: ${macroTargets.protein}g`;
    contextBlock += ` | Tuky: ${macroTargets.fat}g`;
    contextBlock += ` | Sacharidy: ${macroTargets.carbs}g`;
    contextBlock += `\nBMR: ${macroTargets.bmr} kcal | TDEE: ${macroTargets.tdee} kcal`;
  }

  if (intent === "pantry" && pantryItems && pantryItems.length > 0) {
    contextBlock += `\nV špajzi má: ${pantryItems.map((p) => p.name).join(", ")}`;
  }

  const systemPrompt = `Si Rivo — priateľský AI výživový asistent aplikácie EatRivo.
Hovoríš po slovensky (alebo v jazyku, v ktorom sa používateľ pýta).
Si empatický, motivačný a konkrétny. Nikdy nevymýšľaš medicínske diagnózy.
Ak si nie si istý, odporuč konzultáciu s odborníkom.
Odpovedáš stručne (max 3-4 vety) pokiaľ sa nepýtajú na detail.

Kontext používateľa:
- Meno: ${name}
- Cieľ: ${goal}
- Diéta: ${diet}
- Alergény: ${allergies}
${contextBlock}`.trim();

  return {
    messages: [new SystemMessage(systemPrompt)],
  };
}
```

---

## Krok 4h — `nodes/rivoLlm.ts`

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatState } from "../state";

const rivoModel = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  temperature: 0.7,
  maxOutputTokens: 1024,
  apiKey: process.env.GOOGLE_AI_API_KEY,
  streaming: true,
});

export async function rivoLlm(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  try {
    const response = await rivoModel.invoke(state.messages);
    return { messages: [response] };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "rivo_llm failed",
    };
  }
}
```

---

## Krok 4i — `nodes/saveAssistantMessage.ts`

```typescript
import { db } from "@/index";
import { chatMessages } from "@/db/schema";
import { AIMessage } from "@langchain/core/messages";
import { ChatState } from "../state";

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
      intent: state.intent ?? undefined,
      metadata: { model: "gemini-3-flash-preview" },
    });
  } catch {
    // Non-fatal — DB zlyha, ale odpoveď sme už streamovali
  }

  return {};
}
```

---

## Krok 4j — `nodes/errorHandler.ts`

```typescript
import { AIMessage } from "@langchain/core/messages";
import { ChatState } from "../state";
import { RIVO_FALLBACK_MESSAGE } from "../constants";

export async function errorHandler(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  return {
    messages: [new AIMessage(RIVO_FALLBACK_MESSAGE)],
  };
}
```

---

## Krok 5 — Graph Assembly

> ⚠️ **Počkaj** kým Agent 1 dokončí všetky nody (4a-4e). Potom spoj graph.

### `src/lib/langgraph/chat/index.ts`

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatState } from "./state";

// Nody od Agent 1
import { fetchProfile }     from "./nodes/fetchProfile";
import { saveUserMessage }  from "./nodes/saveUserMessage";
import { intentRouter }     from "./nodes/intentRouter";
import { fetchPlan }        from "./nodes/fetchPlan";
import { fetchMacros }      from "./nodes/fetchMacros";

// Nody od Agent 2
import { fetchPantry }           from "./nodes/fetchPantry";
import { buildPrompt }           from "./nodes/buildPrompt";
import { rivoLlm }               from "./nodes/rivoLlm";
import { saveAssistantMessage }  from "./nodes/saveAssistantMessage";
import { errorHandler }          from "./nodes/errorHandler";

import type { Intent } from "./types";

// ─── Routing functions ────────────────────────────────────────────────────────

function routeAfterFetchProfile(state: typeof ChatState.State): string {
  return state.error ? "error_handler" : "save_user_message";
}

function routeByIntent(state: typeof ChatState.State): string {
  if (state.error) return "error_handler";
  switch (state.intent as Intent) {
    case "meal_swap":
    case "recipe":    return "fetch_plan";
    case "macros":    return "fetch_macros";
    case "pantry":    return "fetch_pantry";
    default:          return "build_prompt";
  }
}

function routeAfterLlm(state: typeof ChatState.State): string {
  return state.error ? "error_handler" : "save_assistant_message";
}

// ─── Graph builder ────────────────────────────────────────────────────────────

export function buildChatGraph() {
  const builder = new StateGraph(ChatState);

  // Register nodes
  builder.addNode("fetch_profile",          fetchProfile);
  builder.addNode("save_user_message",      saveUserMessage);
  builder.addNode("intent_router",          intentRouter);
  builder.addNode("fetch_plan",             fetchPlan);
  builder.addNode("fetch_macros",           fetchMacros);
  builder.addNode("fetch_pantry",           fetchPantry);
  builder.addNode("build_prompt",           buildPrompt);
  builder.addNode("rivo_llm",               rivoLlm);
  builder.addNode("save_assistant_message", saveAssistantMessage);
  builder.addNode("error_handler",          errorHandler);

  // Edges
  builder.addEdge(START, "fetch_profile");

  builder.addConditionalEdges("fetch_profile", routeAfterFetchProfile, {
    save_user_message: "save_user_message",
    error_handler:     "error_handler",
  });

  builder.addEdge("save_user_message", "intent_router");

  builder.addConditionalEdges("intent_router", routeByIntent, {
    fetch_plan:    "fetch_plan",
    fetch_macros:  "fetch_macros",
    fetch_pantry:  "fetch_pantry",
    build_prompt:  "build_prompt",
    error_handler: "error_handler",
  });

  builder.addEdge("fetch_plan",   "build_prompt");
  builder.addEdge("fetch_macros", "build_prompt");
  builder.addEdge("fetch_pantry", "build_prompt");
  builder.addEdge("build_prompt", "rivo_llm");

  builder.addConditionalEdges("rivo_llm", routeAfterLlm, {
    save_assistant_message: "save_assistant_message",
    error_handler:          "error_handler",
  });

  builder.addEdge("save_assistant_message", END);
  builder.addEdge("error_handler",          END);

  return builder.compile();
}
```

---

## Krok 6 — API Route

### `src/app/api/chat/route.ts`

```typescript
import type { NextRequest } from "next/server";
import { auth } from "../../../../auth";
import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { HumanMessage } from "@langchain/core/messages";
import { isAIMessageChunk } from "@langchain/core/messages";
import { buildChatGraph } from "@/lib/langgraph/chat";
import { unauthorizedError } from "@/lib/safeError";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // ① Auth
  const session = await auth();
  if (!session?.user?.id) return unauthorizedError();

  // ② Rate limit — "standard" (chat je interaktívny, nie "expensive")
  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(req, session.user.id),
    "standard",
  );
  if (!rateLimitResult.success) return rateLimitResult.response!;

  const { messages, sessionId } = await req.json();

  // ③ Resolve userProfileId z userId
  const [profile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id));

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  // ④ Posledná správa od user-a
  const lastUserMessage = messages?.at(-1)?.content ?? "";

  const graph = buildChatGraph();
  const encoder = new TextEncoder();

  const stream = await graph.stream(
    {
      messages: [new HumanMessage(lastUserMessage)],
      userProfileId: profile.id,
      sessionId: sessionId ?? crypto.randomUUID(),
    },
    { streamMode: "messages" },
  );

  // ⑤ Streaming response
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const [chunk] of stream) {
            if (
              isAIMessageChunk(chunk) &&
              typeof chunk.content === "string"
            ) {
              controller.enqueue(encoder.encode(chunk.content));
            }
          }
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
```

---

## Krok 7 — Frontend

> ⚡ Môžeš robiť **paralelne** s Krokom 5 + 6. API kontrakt je jasný:
> `POST /api/chat` body: `{ messages: [{role, content}], sessionId: string }` → streaming `text/plain`

**Súbor:** `src/app/[locale]/chat-with-rivo/ChatWithRivoPage.tsx`

Nahradí existujúci `<ComingSoonPage>`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWithRivoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionId = useRef(crypto.randomUUID()); // Stabilné per page load
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll na najnovšiu správu
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Placeholder pre streaming efekt
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          sessionId: sessionId.current,
        }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        // Aktualizuj poslednú správu po každom chunku
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: accumulated,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Ups, Rivo práve odpočíva... Skús to znova 😴",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto p-4">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-8">
            <p className="text-lg font-medium">Ahoj! Som Rivo 👋</p>
            <p className="text-sm">
              Spýtaj sa ma čokoľvek o svojom jedálnom pláne alebo výžive.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-eatrivo-purple text-white rounded-br-sm"
                  : "bg-muted rounded-bl-sm"
              }`}
            >
              {msg.content ||
                (isStreaming && i === messages.length - 1 ? "▋" : "")}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex gap-2 pt-2 border-t">
        <input
          className="flex-1 rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eatrivo-purple"
          placeholder="Opýtaj sa Rivo..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={isStreaming}
        />
        <button
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          className="px-4 py-2 bg-eatrivo-purple text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity"
        >
          {isStreaming ? "..." : "Odoslať"}
        </button>
      </div>
    </div>
  );
}
```

---

## Krok 8 — Smoke Test

Po deploymente overiť:

```
✅ POST /api/chat: "Ahoj Rivo"              → intent: general, streaming odpoveď
✅ POST /api/chat: "Koľko kalórií mám dnes" → intent: macros, makrá v odpovedi
✅ POST /api/chat: "Môžem vymeniť ryžu"     → intent: meal_swap, plán v kontexte
✅ DB: chat_messages tabuľka — záznamy role:user + role:assistant
✅ Redis: 2. správa v tom istom okne → cache HIT (žiadny DB dotaz na profil)
✅ Error path: nevalidný userProfileId      → RIVO_FALLBACK_MESSAGE
✅ ComingSoon stránka nahradená chat UI
```

---

## Checklist (Agent 2)

- [ ] `src/lib/langgraph/chat/nodes/fetchPantry.ts`
- [ ] `src/lib/langgraph/chat/nodes/buildPrompt.ts`
- [ ] `src/lib/langgraph/chat/nodes/rivoLlm.ts`
- [ ] `src/lib/langgraph/chat/nodes/saveAssistantMessage.ts`
- [ ] `src/lib/langgraph/chat/nodes/errorHandler.ts`
- [ ] `src/lib/langgraph/chat/index.ts` ← čaká na Agent 1 nody
- [ ] `src/app/api/chat/route.ts`
- [ ] `src/app/[locale]/chat-with-rivo/ChatWithRivoPage.tsx`
- [ ] Smoke test (8 bodov)
