# LangGraph Chat with Rivo — Implementation Plan

## Context

`/chat-with-rivo` je momentálne "Coming Soon" stránka (`ChatWithRivoPage.tsx`). 
Cieľom je implementovať plnohodnotného AI asistenta Rivo ako LangGraph.js StateGraph — 
so správnou intent klasifikáciou, lazy-loading kontextu, streamingom a perzistenciou chatu.

Diagram: `diagrams/chat-w-rivo/chat.mmd`

---

## 1. Install dependency

```bash
npm install @langchain/langgraph
```

---

## 2. New file structure

```
src/lib/langgraph/chat/
  index.ts              # buildChatGraph() — definícia grafu, compile, export
  state.ts              # ChatState Annotation (LangGraph.js štýl)
  types.ts              # TypeScript interfaces (UserProfile, MealPlan, etc.)
  constants.ts          # Intent typy, Rivo systémový prompt, fallback správy
  nodes/
    fetchProfile.ts     # Načíta userProfile + userInfo z DB
    classifyIntent.ts   # Gemini Flash — klasifikuje intent správy (rýchle, lacné)
    fetchPlan.ts        # Načíta dnešný meal plan (pre meal_swap, recipe)
    fetchMacros.ts      # Deterministický výpočet BMR/TDEE/makrá (bez DB)
    fetchPantry.ts      # Načíta inventoryContext (pre pantry)
    buildPrompt.ts      # Zostaví systémový prompt s Rivo osobnosťou + kontextom
    rivoLlm.ts          # Gemini 3 Flash — streaming LLM volanie
    saveMessage.ts      # Uloží správu do chatMessages (async side-effect)
    errorHandler.ts     # Graceful fallback správa pre UI

src/app/api/chat/
  route.ts              # POST — Auth check, spustí graf, streamuje odpoveď
```

---

## 3. Graph State

```typescript
// src/lib/langgraph/chat/state.ts
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { messagesStateReducer } from "@langchain/langgraph";

export const ChatState = Annotation.Root({
  // === CORE — konverzačná história ===
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,   // append, nie overwrite
    default: () => [],
  }),

  // === IDENTITY ===
  userProfileId: Annotation<string>(),
  sessionId: Annotation<string>(),           // UUID per konverzácia (checkpointer key)
  userProfile: Annotation<UserProfile | null>({ default: () => null }),
  userInfo: Annotation<UserInfo | null>({ default: () => null }),

  // === INTENT — klasifikovaný v classify_intent node ===
  intent: Annotation<Intent | null>({ default: () => null }),

  // === LAZY-LOADED KONTEXT (len to čo treba) ===
  todaysPlan: Annotation<MealPlan | null>({ default: () => null }),
  macroTargets: Annotation<MacroTargets | null>({ default: () => null }),
  pantryItems: Annotation<PantryItem[] | null>({ default: () => null }),

  // === ERROR HANDLING ===
  error: Annotation<string | null>({ default: () => null }),
  retryCount: Annotation<number>({ default: () => 0 }),
});

export type Intent =
  | "meal_swap"   // "Môžem vymeniť ryžu za quinoa?"
  | "macros"      // "Koľko kalórií mám dnes?"
  | "pantry"      // "Čo mám v špajzi?"
  | "recipe"      // "Daj mi recept na kurací vývar"
  | "general";    // Všeobecná otázka o výžive
```

---

## 4. Graph Topology a edges

```
START
  └─> fetch_profile           ← Redis cache guard (TTL 5min), DB fallback
        └─> save_user_message  ← okamžite uloží USER správu do chatMessages
              └─> intent_router
                    ├─(meal_swap, recipe)──> fetch_plan ──> build_prompt
                    ├─(macros)────────────> fetch_macros ─> build_prompt
                    ├─(pantry)────────────> fetch_pantry ─> build_prompt
                    └─(general / small talk)─> build_prompt (bez DB, bez LLM)
                                                   └─> rivo_llm
                                                         └─> save_assistant_message ──> END
fetch_profile / intent_router / rivo_llm
  └─(error)──> error_handler ──> END   ← nie späť do API_ROUTE!
```

**`intent_router` — dvojstupňová logika:**

```typescript
const NUTRITION_KEYWORDS = [
  "kalóri", "jedl", "jedál", "diét", "proteín", "bielkovin", "tuk", "sacharid",
  "makr", "vymeni", "recept", "špajz", "nákup", "plán", "jedál", "raňajk",
  "obed", "večer", "snack"
];

function routeByIntent(state: typeof ChatState.State): string {
  const lastMsg = state.messages.at(-1)?.content?.toLowerCase() ?? "";

  // ① rule-based pre-filter — bez LLM
  const hasNutritionKeyword = NUTRITION_KEYWORDS.some(kw => lastMsg.includes(kw));
  if (!hasNutritionKeyword) return "build_prompt"; // general / small talk

  // ② LLM klasifikácia (len ak treba)
  switch (state.intent) {
    case "meal_swap":
    case "recipe":  return "fetch_plan";
    case "macros":  return "fetch_macros";
    case "pantry":  return "fetch_pantry";
    default:        return "build_prompt";
  }
}
```

---

## 5. Node Details

| Node | Reads | Writes | Side effects |
|------|-------|--------|-------------|
> **Zmeny oproti prvému návrhu:** (1) `error_handler → END`, (2) split na `save_user_message` + `save_assistant_message`, (3) Redis cache v `fetch_profile`, (4) rule-based pre-filter v `intent_router`

| Node | Reads | Writes | Side effects |
| `fetch_profile` | `userProfileId` | `userProfile`, `userInfo` | **① Redis GET** `user:{id}` → HIT: skip DB / MISS: Neon DB + **Redis SET TTL 5min** |
| `save_user_message` | `messages[-1]`, `userProfileId`, `sessionId` | — | DB insert: `chatMessages` (role: user) |
| `intent_router` | `messages[-1]` | `intent` | ① rule-based keyword check (bez LLM) → ak žiadne kľúčové slovo: `general`. ② inak LLM call — `gemini-2.0-flash-lite` |
| `fetch_plan` | `userProfileId` | `todaysPlan` | DB query: `mealPlans` ORDER BY created_at DESC LIMIT 1 |
| `fetch_macros` | `userProfile`, `userInfo` | `macroTargets` | Deterministický výpočet (Mifflin-St Jeor) — reuse z `langchain.ts:302-372` |
| `fetch_pantry` | `userProfileId` | `pantryItems` | DB query: `inventoryContext` (ak existuje) |
| `build_prompt` | `userProfile`, `userInfo`, `intent`, context keys | `messages` (system msg) | Žiadne |
| `rivo_llm` | `messages` | `messages` (AI odpoveď) | LLM streaming — `gemini-3-flash-preview` |
| `save_assistant_message` | `messages` (celý diff), `userProfileId`, `sessionId`, `intent` | — | DB insert: `chatMessages` (role: assistant) — ukladá aj `intent` pre analytics |
| `error_handler` | `error` | `messages` (fallback) | Žiadne — prechod na **END** (nie späť do API_ROUTE) |

### build_prompt — Rivo osobnosť (základ):

```typescript
const RIVO_SYSTEM_PROMPT = `
Si Rivo — priateľský AI výživový asistent aplikácie EatRivo.
Hovoríš po slovensky, si empatický, motivačný a konkrétny.
NIKDY nevymýšľaš medicínske diagnózy.
Odpovedáš stručne (max 3-4 vety) pokiaľ sa nepýtajú na detail.

Kontext používateľa:
- Meno: {{name}}
- Cieľ: {{goal}}
- Diéta: {{diet}}
- Alergény: {{allergies}}
{{#if todaysPlan}}
Dnešný jedálny plán: {{todaysPlan}}
{{/if}}
{{#if macroTargets}}
Cieľové makrá: {{dailyCalories}} kcal | B: {{protein}}g | T: {{fat}}g | S: {{carbs}}g
{{/if}}
{{#if pantryItems}}
V špajzi má: {{pantryItems}}
{{/if}}
`;
```

---

## 6. Database Changes

**Súbor:** `src/db/schema.ts`

### Nová tabuľka: `chatMessages`

```typescript
export const chatMessageRoleEnum = pgEnum("chat_message_role", [
  "user",
  "assistant",
  "system",
]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("user_profile_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull(),   // Zoskupuje správy jednej konverzácie
  role: chatMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  intent: text("intent"),                    // Klasifikovaný intent (pre analytics)
  metadata: jsonb("metadata"),               // retryCount, model, latency, atď.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Po zmene: `npm run db:push`

---

## 7. API Route

**Súbor:** `src/app/api/chat/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorizedError();

  const { messages, sessionId } = await req.json();

  const userProfile = await getUserProfile(session.user.id);

  const graph = buildChatGraph();

  const stream = await graph.stream(
    {
      messages: messages.map(toBaseMessage),
      userProfileId: userProfile.id,
      sessionId: sessionId ?? crypto.randomUUID(),
    },
    {
      configurable: { thread_id: sessionId },  // checkpointer key
      streamMode: "messages",                   // token-by-token streaming
    }
  );

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const [message, _metadata] of stream) {
          if (isAIMessageChunk(message)) {
            controller.enqueue(encoder.encode(message.content));
          }
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
```

---

## 8. Frontend Changes

**Zmeniť:** `src/app/[locale]/chat-with-rivo/ChatWithRivoPage.tsx`

Nahradiť `<ComingSoonPage>` plnohodnotným chat UI:

- Zoznam správ (`messages` state) s auto-scroll
- Input + tlačidlo Odoslať
- Streaming — `fetch POST /api/chat` s `ReadableStream` čítaním
- `sessionId` generovaný na klientovi (uUID, persistovaný v `sessionStorage`)
- Rivo avatar pri každej AI správe
- Loading skeleton počas streamu

---

## 9. Checkpointing (Perzistentná pamäť)

Na zachovanie histórie chatu naprieč page refreshmi:

```typescript
// src/lib/langgraph/chat/index.ts
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);

export function buildChatGraph() {
  // ...builder setup...
  return builder.compile({ checkpointer });
}
```

`thread_id` = `sessionId` — každá konverzácia má vlastný "vlákno" v checkpointere.

Pri novom sessione: nový UUID → čistá história.
Pri refreshi stránky: rovnaký `sessionId` zo `sessionStorage` → história zachovaná.

---

## 10. Key files to modify / reference

| Súbor | Akcia |
|-------|-------|
| `src/db/schema.ts` | Pridať `chatMessages` tabuľku + `chatMessageRoleEnum` (pole `intent` pre analytics) |
| `src/lib/redis.ts` | Reuse existujúci `CacheService` — `GET`/`SET` `user:{id}` s TTL 5min |
| `src/lib/langchain.ts` | Extrahovať makro výpočty (riadky 302-372) do `langgraph/chat/nodes/fetchMacros.ts` |
| `src/app/[locale]/chat-with-rivo/ChatWithRivoPage.tsx` | Nahradiť ComingSoon plným chat UI |
| `src/app/api/chat/route.ts` | Nový súbor — streaming API endpoint |
| `src/lib/langgraph/chat/` | Celý nový priečinok |
| `src/lib/redis.ts` | Referencia pre `RequestLock` pattern (ochrana pred duplicitnými volaniami) |
| `src/app/api/meal-plans/route.ts` | Referencia pre established auth + error handling pattern |

---

## 11. Testing Plan

- [ ] Unit test: `classifyIntent` node — správna klasifikácia pre rôzne otázky
- [ ] Unit test: `fetchMacros` node — správny výpočet BMR/TDEE
- [ ] Unit test: `buildPrompt` node — prompt obsahuje správny kontext podľa intentu
- [ ] Integration test: celý graph flow `general` intent (bez DB kontextu)
- [ ] Integration test: `meal_swap` intent → správne načíta todaysPlan
- [ ] Edge case: prázdna história správ
- [ ] Edge case: LLM timeout / API chyba → error_handler odpovie
- [ ] Edge case: user bez meal planu → `fetch_plan` vráti null, prompt to zvládne

---

## 12. Estimated Effort

| Fáza | Odhadovaný čas |
|------|---------------|
| DB schema + migrácia | 0.5 hod |
| State + types + constants | 1 hod |
| Nodes (8×) | 3 hod |
| Graph assembly + conditional edges | 1 hod |
| API route (streaming) | 1 hod |
| Frontend chat UI | 3 hod |
| Checkpointing setup | 0.5 hod |
| Testing | 2 hod |
| **Celkom** | **~12 hod** |
