# Chat with Rivo — Implementation Index

> Referencia: `diagrams/chat-w-rivo/chat.mmd` + `diagrams/chat-w-rivo/langgraph-plan.md`
>
> ⚡ **Implementácia je rozdelená do 2 paralelných súborov pre 2 agentov:**
>
> | Súbor | Agent | Obsah |
> |-------|-------|-------|
> | [implementation-part1-foundation.md](implementation-part1-foundation.md) | Agent 1 | npm install, DB schema, types/state/constants, nody 4a–4e |
> | [implementation-part2-llm-integration.md](implementation-part2-llm-integration.md) | Agent 2 | Nody 4f–4j, graph index.ts, API route, frontend, smoke test |
>
> **Sync bod:** Agent 2 čaká kým Agent 1 vytvorí `types.ts` (Krok 3). Potom môžu bežať súbežne.

---

## Prehľad krokov

```
[Agent 1]                          [Agent 2]
──────────────────────────────     ──────────────────────────────────
Krok 1 → npm install
Krok 2 → DB schema + migrácia
Krok 3 → types.ts ─────────────── SYNC ──→ Agent 2 môže začať
          state.ts
          constants.ts
Krok 4a → fetchProfile             Krok 4f → fetchPantry
Krok 4b → saveUserMessage          Krok 4g → buildPrompt
Krok 4c → intentRouter             Krok 4h → rivoLlm
Krok 4d → fetchPlan                Krok 4i → saveAssistantMessage
Krok 4e → fetchMacros              Krok 4j → errorHandler
                   ↘               ↙
                    Krok 5 → index.ts (graph)
                    Krok 6 → /api/chat/route.ts
                    Krok 7 → ChatWithRivoPage.tsx  ← paralelne s 5+6
                    Krok 8 → Smoke test
```

---

## Krok 1 — Dependencies

```bash
npm install @langchain/langgraph @langchain/google-genai @langchain/core
```

> `@langchain/google-genai` je už pravdepodobne nainštalovaný (používa `langchain.ts`).
> Skontroluj `package.json` pred inštaláciou.

---

## Krok 2 — DB schema

**Súbor:** `src/db/schema.ts`

Pridaj na koniec súboru (pred posledný export ak existuje):

```typescript
// ─── Chat Messages ────────────────────────────────────────────────────────────

export const chatMessageRoleEnum = pgEnum("chat_message_role", [
  "user",
  "assistant",
]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("user_profile_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull(),
  role: chatMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  intent: text("intent"),             // pre analytics — "meal_swap" | "macros" | atď.
  metadata: jsonb("metadata"),        // model, latencyMs, tokenCount
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Potom spusti migráciu:

```bash
npm run db:push
```

---

## Krok 3 — State, Types, Constants

### 3a. `src/lib/langgraph/chat/types.ts`

```typescript
export type Intent =
  | "meal_swap"
  | "macros"
  | "pantry"
  | "recipe"
  | "general";

export interface ChatUserProfile {
  id: string;
  fullName: string;
}

export interface ChatUserInfo {
  sex: "man" | "woman";
  goal: string;
  diet_preferences: string | null;
  allergies: string | null;
  likes: string | null;
  dislikes: string | null;
  weight: string;
  height: number;
  dateOfBirth: Date | null;
  activity_level: string;
  meal_per_day: number | null;
}

export interface MacroTargets {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface MealPlanData {
  id: string;
  meals: unknown;
  weekStartDate: Date;
}

export interface PantryItem {
  name: string;
  quantity?: string;
}
```

### 3b. `src/lib/langgraph/chat/state.ts`

```typescript
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { messagesStateReducer } from "@langchain/langgraph";
import type { Intent, ChatUserProfile, ChatUserInfo, MacroTargets, MealPlanData, PantryItem } from "./types";

export const ChatState = Annotation.Root({
  // Konverzačná história — append reducer
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Identity
  userProfileId: Annotation<string>({ default: () => "" }),
  sessionId:     Annotation<string>({ default: () => "" }),
  userProfile:   Annotation<ChatUserProfile | null>({ default: () => null }),
  userInfo:      Annotation<ChatUserInfo | null>({ default: () => null }),

  // Intent
  intent: Annotation<Intent | null>({ default: () => null }),

  // Lazy-loaded kontext
  todaysPlan:   Annotation<MealPlanData | null>({ default: () => null }),
  macroTargets: Annotation<MacroTargets | null>({ default: () => null }),
  pantryItems:  Annotation<PantryItem[] | null>({ default: () => null }),

  // Error handling
  error: Annotation<string | null>({ default: () => null }),
});
```

### 3c. `src/lib/langgraph/chat/constants.ts`

```typescript
export const NUTRITION_KEYWORDS = [
  "kalóri", "jedl", "jedál", "diét", "proteín", "bielkovin", "tuk", "sacharid",
  "makr", "vymeni", "recept", "špajz", "nákup", "plán", "raňajk",
  "obed", "večer", "snack", "jedlo", "jesť", "zjesť", "gram", "porci",
  "hmotnost", "váh", "schudnút", "pribrat", "kalori",
];

export const RIVO_FALLBACK_MESSAGE =
  "Ups, Rivo práve odpočíva... 😴 Skús to znova o chvíľu!";

export const INTENT_CLASSIFY_PROMPT = `
Klasifikuj nasledujúcu správu do jednej z kategórií:
- meal_swap: používateľ chce vymeniť jedlo alebo ingredienciu v pláne
- macros: pýta sa na kalórie, makrá, výživové hodnoty
- pantry: pýta sa na obsah špajze alebo čo má doma
- recipe: chce recept alebo postup prípravy
- general: všeobecná otázka o výžive alebo zdraví

Odpovedz LEN jedným slovom (jednou z kategórií vyššie).
Správa: "{{message}}"
`;
```

---

## Krok 4 — Nodes

Vytvor súbory v `src/lib/langgraph/chat/nodes/`:

### 4a. `fetchProfile.ts`

```typescript
import { db } from "@/index";
import { userProfiles, userInfoTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CacheService } from "@/lib/redis";
import { ChatState } from "../state";

const CACHE_TTL = 300; // 5 min

export async function fetchProfile(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const { userProfileId } = state;

  // ① Redis cache
  const cacheKey = `chat-profile:${userProfileId}`;
  const cached = await CacheService.get<{ userProfile: unknown; userInfo: unknown }>(cacheKey);
  if (cached) {
    return { userProfile: cached.userProfile as any, userInfo: cached.userInfo as any };
  }

  // ② DB fallback
  try {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userProfileId));

    const [info] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfileId));

    if (!profile) throw new Error(`Profile not found: ${userProfileId}`);

    await CacheService.set(cacheKey, { userProfile: profile, userInfo: info }, CACHE_TTL);

    return { userProfile: profile as any, userInfo: info as any };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "fetch_profile failed" };
  }
}
```

### 4b. `saveUserMessage.ts`

```typescript
import { db } from "@/index";
import { chatMessages } from "@/db/schema";
import { ChatState } from "../state";

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
      content: typeof lastMsg.content === "string"
        ? lastMsg.content
        : JSON.stringify(lastMsg.content),
    });
  } catch {
    // Non-fatal — pokračujeme aj keď uloženie zlyhá
  }

  return {};
}
```

### 4c. `intentRouter.ts`

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { ChatState } from "../state";
import { NUTRITION_KEYWORDS, INTENT_CLASSIFY_PROMPT } from "../constants";
import type { Intent } from "../types";

const intentModel = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  temperature: 0,
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

export async function intentRouter(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const lastMsg = state.messages.at(-1);
  const text = (typeof lastMsg?.content === "string" ? lastMsg.content : "").toLowerCase();

  // ① Rule-based pre-filter — bez LLM
  const hasKeyword = NUTRITION_KEYWORDS.some((kw) => text.includes(kw));
  if (!hasKeyword) {
    return { intent: "general" };
  }

  // ② LLM klasifikácia
  try {
    const prompt = INTENT_CLASSIFY_PROMPT.replace("{{message}}", text);
    const response = await intentModel.invoke([new HumanMessage(prompt)]);
    const raw = (typeof response.content === "string" ? response.content : "").trim().toLowerCase();

    const validIntents: Intent[] = ["meal_swap", "macros", "pantry", "recipe", "general"];
    const intent: Intent = validIntents.includes(raw as Intent)
      ? (raw as Intent)
      : "general";

    return { intent };
  } catch {
    return { intent: "general" }; // fallback na general
  }
}
```

### 4d. `fetchPlan.ts`

```typescript
import { db } from "@/index";
import { mealPlans } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ChatState } from "../state";

export async function fetchPlan(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  try {
    const [plan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.userProfileId, state.userProfileId))
      .orderBy(desc(mealPlans.created_at))
      .limit(1);

    return { todaysPlan: plan ? { id: plan.id, meals: plan.meals, weekStartDate: plan.weekStartDate } : null };
  } catch {
    return { todaysPlan: null };
  }
}
```

### 4e. `fetchMacros.ts`

```typescript
// Deterministický výpočet — bez DB, bez LLM
// Reuse logiky z src/lib/langchain.ts:302-372

import { ChatState } from "../state";
import type { MacroTargets } from "../types";

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.0,
  lightly_active: 1.175,
  moderately_active: 1.35,
  very_active: 1.52,
  athlete: 1.7,
};

export async function fetchMacros(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const { userInfo } = state;
  if (!userInfo || !userInfo.dateOfBirth) return { macroTargets: null };

  const age = new Date().getFullYear() - new Date(userInfo.dateOfBirth).getFullYear();
  const weight = Number(userInfo.weight);
  const { height, sex, activity_level, goal } = userInfo;

  // Mifflin-St Jeor BMR
  const bmr = sex === "man"
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] ?? 1.2;
  const tdee = Math.round(bmr * multiplier);

  const dailyCalories =
    goal === "lose_weight"   ? Math.round(tdee - 300) :
    goal === "gain_muscle"   ? Math.round(tdee * 1.15) :
    tdee;

  const protein = goal === "gain_muscle"
    ? Math.round(weight * 2.0)
    : Math.round(weight * 1.2);

  const fat = Math.round((dailyCalories * 0.25) / 9);
  const carbs = Math.round((dailyCalories - protein * 4 - fat * 9) / 4);

  const macroTargets: MacroTargets = {
    bmr: Math.round(bmr),
    tdee,
    dailyCalories,
    protein,
    fat,
    carbs,
  };

  return { macroTargets };
}
```

### 4f. `fetchPantry.ts`

```typescript
// Pozn.: inventoryContext tabuľka nie je ešte v schema.ts
// Ak neexistuje, jednoducho vrátime null — bez chyby

import { ChatState } from "../state";

export async function fetchPantry(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  // TODO: Keď bude inventoryContext v schema z shopping-list implementácie,
  // sem príde DB query. Zatiaľ null.
  return { pantryItems: null };
}
```

### 4g. `buildPrompt.ts`

```typescript
import { SystemMessage } from "@langchain/core/messages";
import { ChatState } from "../state";

export async function buildPrompt(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const { userProfile, userInfo, intent, todaysPlan, macroTargets, pantryItems } = state;

  const name = userProfile?.fullName?.split(" ")[0] ?? "kamarát";
  const goal = userInfo?.goal?.replace("_", " ") ?? "zdravší životný štýl";
  const diet = userInfo?.diet_preferences && userInfo.diet_preferences !== "none"
    ? userInfo.diet_preferences : "žiadna špeciálna";
  const allergies = userInfo?.allergies ?? "žiadne";

  let contextBlock = "";

  if (intent === "meal_swap" || intent === "recipe") {
    if (todaysPlan?.meals) {
      contextBlock += `\nDnešný jedálny plán (JSON): ${JSON.stringify(todaysPlan.meals).slice(0, 1500)}`;
    }
  }

  if (intent === "macros" && macroTargets) {
    contextBlock += `\nCieľové makrá: ${macroTargets.dailyCalories} kcal | Bielkoviny: ${macroTargets.protein}g | Tuky: ${macroTargets.fat}g | Sacharidy: ${macroTargets.carbs}g`;
    contextBlock += `\nBMR: ${macroTargets.bmr} kcal | TDEE: ${macroTargets.tdee} kcal`;
  }

  if (intent === "pantry" && pantryItems && pantryItems.length > 0) {
    contextBlock += `\nV špajzi má: ${pantryItems.map(p => p.name).join(", ")}`;
  }

  const systemPrompt = `Si Rivo — priateľský AI výživový asistent aplikácie EatRivo.
Hovoríš po slovensky (alebo v jazyku, v ktorom sa používateľ pýta), si empatický, motivačný a konkrétny.
NIKDY nevymýšľaš medicínske diagnózy. Ak si nie si istý, odporuč konzultáciu s odborníkom.
Odpovedáš stručne (max 3-4 vety) pokiaľ sa nepýtajú na detail.

Kontext používateľa:
- Meno: ${name}
- Cieľ: ${goal}
- Diéta: ${diet}
- Alergény: ${allergies}
${contextBlock}`;

  return {
    messages: [new SystemMessage(systemPrompt)],
  };
}
```

### 4h. `rivoLlm.ts`

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage } from "@langchain/core/messages";
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
    return { error: err instanceof Error ? err.message : "rivo_llm failed" };
  }
}
```

### 4i. `saveAssistantMessage.ts`

```typescript
import { db } from "@/index";
import { chatMessages } from "@/db/schema";
import { AIMessage } from "@langchain/core/messages";
import { ChatState } from "../state";

export async function saveAssistantMessage(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  // Nájdi poslednú AI správu
  const lastAI = [...state.messages].reverse().find(
    (m) => m instanceof AIMessage || m.getType() === "ai",
  );

  if (!lastAI) return {};

  try {
    await db.insert(chatMessages).values({
      userProfileId: state.userProfileId,
      sessionId: state.sessionId,
      role: "assistant",
      content: typeof lastAI.content === "string"
        ? lastAI.content
        : JSON.stringify(lastAI.content),
      intent: state.intent ?? undefined,
      metadata: { model: "gemini-3-flash-preview" },
    });
  } catch {
    // Non-fatal
  }

  return {};
}
```

### 4j. `errorHandler.ts`

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

### `src/lib/langgraph/chat/index.ts`

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatState } from "./state";
import { fetchProfile } from "./nodes/fetchProfile";
import { saveUserMessage } from "./nodes/saveUserMessage";
import { intentRouter } from "./nodes/intentRouter";
import { fetchPlan } from "./nodes/fetchPlan";
import { fetchMacros } from "./nodes/fetchMacros";
import { fetchPantry } from "./nodes/fetchPantry";
import { buildPrompt } from "./nodes/buildPrompt";
import { rivoLlm } from "./nodes/rivoLlm";
import { saveAssistantMessage } from "./nodes/saveAssistantMessage";
import { errorHandler } from "./nodes/errorHandler";
import type { Intent } from "./types";

function routeAfterFetchProfile(state: typeof ChatState.State): string {
  return state.error ? "error_handler" : "save_user_message";
}

function routeByIntent(state: typeof ChatState.State): string {
  if (state.error) return "error_handler";
  switch (state.intent as Intent) {
    case "meal_swap":
    case "recipe":  return "fetch_plan";
    case "macros":  return "fetch_macros";
    case "pantry":  return "fetch_pantry";
    default:        return "build_prompt";
  }
}

function routeAfterLlm(state: typeof ChatState.State): string {
  return state.error ? "error_handler" : "save_assistant_message";
}

export function buildChatGraph() {
  const builder = new StateGraph(ChatState);

  // Nodes
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
  builder.addEdge("fetch_plan",    "build_prompt");
  builder.addEdge("fetch_macros",  "build_prompt");
  builder.addEdge("fetch_pantry",  "build_prompt");
  builder.addEdge("build_prompt",  "rivo_llm");
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
  const session = await auth();
  if (!session?.user?.id) return unauthorizedError();

  // Rate limit: 30 req/min per user (chat je interaktívny)
  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(req, session.user.id),
    "standard",
  );
  if (!rateLimitResult.success) return rateLimitResult.response!;

  const { messages, sessionId } = await req.json();

  // Zisti userProfileId
  const [profile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id));

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  const graph = buildChatGraph();
  const encoder = new TextEncoder();

  // Posledná správa od user-a
  const lastUserMessage = messages?.at(-1)?.content ?? "";

  const stream = await graph.stream(
    {
      messages: [new HumanMessage(lastUserMessage)],
      userProfileId: profile.id,
      sessionId: sessionId ?? crypto.randomUUID(),
    },
    { streamMode: "messages" },
  );

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const [chunk] of stream) {
            if (isAIMessageChunk(chunk) && typeof chunk.content === "string") {
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

**Súbor:** `src/app/[locale]/chat-with-rivo/ChatWithRivoPage.tsx`

Nahradiť `<ComingSoonPage>` chat UI. Kľúčové časti:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWithRivoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionId = useRef(crypto.randomUUID());  // Stabilné per page load
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Placeholder pre streaming
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

        // Aktualizuj poslednú správu (streaming efekt)
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
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-8">
            <p className="text-lg font-medium">Ahoj! Som Rivo 👋</p>
            <p className="text-sm">Spýtaj sa ma čokoľvek o svojom jedálnom pláne alebo výžive.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === "user"
                ? "bg-eatrivo-purple text-white rounded-br-sm"
                : "bg-muted rounded-bl-sm"
            }`}>
              {msg.content || (isStreaming && i === messages.length - 1 ? "▋" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
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
          className="px-4 py-2 bg-eatrivo-purple text-white rounded-xl text-sm font-medium disabled:opacity-50"
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
✅ POST /api/chat s "Ahoj Rivo" → intent: general, streaming odpoveď
✅ POST /api/chat s "Koľko kalórií mám dnes?" → intent: macros, makrá v odpovedi
✅ POST /api/chat s "Môžem vymeniť ryžu?" → intent: meal_swap, plán v kontexte
✅ DB: chatMessages tabuľka má záznamy (user + assistant)
✅ Redis: cache hit na druhé volanie v tom istom 5min okne
✅ Error path: nevalidný userProfileId → RIVO_FALLBACK_MESSAGE
```

---

## Checklist

- [ ] **Krok 1** — `npm install @langchain/langgraph`
- [ ] **Krok 2** — `chatMessages` tabuľka + `npm run db:push`
- [ ] **Krok 3a** — `types.ts`
- [ ] **Krok 3b** — `state.ts`
- [ ] **Krok 3c** — `constants.ts`
- [ ] **Krok 4a** — `nodes/fetchProfile.ts`
- [ ] **Krok 4b** — `nodes/saveUserMessage.ts`
- [ ] **Krok 4c** — `nodes/intentRouter.ts`
- [ ] **Krok 4d** — `nodes/fetchPlan.ts`
- [ ] **Krok 4e** — `nodes/fetchMacros.ts`
- [ ] **Krok 4f** — `nodes/fetchPantry.ts`
- [ ] **Krok 4g** — `nodes/buildPrompt.ts`
- [ ] **Krok 4h** — `nodes/rivoLlm.ts`
- [ ] **Krok 4i** — `nodes/saveAssistantMessage.ts`
- [ ] **Krok 4j** — `nodes/errorHandler.ts`
- [ ] **Krok 5** — `index.ts` (graph assembly)
- [ ] **Krok 6** — `src/app/api/chat/route.ts`
- [ ] **Krok 7** — `ChatWithRivoPage.tsx` (nahradiť ComingSoon)
- [ ] **Krok 8** — Smoke test
