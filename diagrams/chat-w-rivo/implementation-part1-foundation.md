# Chat with Rivo — Part 1: Foundation & Data Nodes

> **Agent 1** — Pracuješ SÚBEŽNE s Agent 2 (`implementation-part2-llm-integration.md`)
>
> **Sync bod:** Po dokončení Krok 3 (types.ts + state.ts) odblokuješ Agent 2 — môže začať Krok 4f.
> Agent 2 NEPOTREBUJE nič iné z tohto filu aby mohol pracovať od Kroku 4f ďalej.

---

## Čo robíš ty (Agent 1)

```
Krok 1  →  npm install
Krok 2  →  DB schema + migrácia
Krok 3  →  types.ts  ←── SYNC BOD pre Agent 2
            state.ts
            constants.ts
Krok 4a →  nodes/fetchProfile.ts
Krok 4b →  nodes/saveUserMessage.ts
Krok 4c →  nodes/intentRouter.ts
Krok 4d →  nodes/fetchPlan.ts
Krok 4e →  nodes/fetchMacros.ts
```

## Čo robí Agent 2 (neriešiš)

```
Krok 4f →  nodes/fetchPantry.ts
Krok 4g →  nodes/buildPrompt.ts
Krok 4h →  nodes/rivoLlm.ts
Krok 4i →  nodes/saveAssistantMessage.ts
Krok 4j →  nodes/errorHandler.ts
Krok 5  →  index.ts (graph assembly)
Krok 6  →  src/app/api/chat/route.ts
Krok 7  →  ChatWithRivoPage.tsx
Krok 8  →  Smoke test
```

---

## Krok 1 — Dependencies

```bash
npm install @langchain/langgraph @langchain/google-genai @langchain/core
```

> Skontroluj `package.json` — `@langchain/google-genai` môže byť už nainštalovaný.

---

## Krok 2 — DB schema

**Súbor:** `src/db/schema.ts` — pridaj na koniec:

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
  intent: text("intent"),         // "meal_swap" | "macros" | "pantry" | "recipe" | "general"
  metadata: jsonb("metadata"),    // { model, latencyMs, tokenCount }
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Spusti migráciu:

```bash
npm run db:push
```

---

## Krok 3 — State, Types, Constants

> ⚡ **SYNC BOD** — Agent 2 čaká na tieto 3 súbory. Vytvor ich ako prvé.

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
import type {
  Intent,
  ChatUserProfile,
  ChatUserInfo,
  MacroTargets,
  MealPlanData,
  PantryItem,
} from "./types";

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

  // Lazy-loaded kontext (plní sa len ak potrebný intent)
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
`.trim();
```

---

## Krok 4a — `nodes/fetchProfile.ts`

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

  // ① Redis cache — HIT: preskočíme DB
  const cacheKey = `chat-profile:${userProfileId}`;
  const cached = await CacheService.get<{ userProfile: unknown; userInfo: unknown }>(cacheKey);
  if (cached) {
    return {
      userProfile: cached.userProfile as any,
      userInfo: cached.userInfo as any,
    };
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

    // ③ Uložiť do cache pre ďalšie správy v tom istom okne
    await CacheService.set(cacheKey, { userProfile: profile, userInfo: info }, CACHE_TTL);

    return { userProfile: profile as any, userInfo: info as any };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "fetch_profile failed",
    };
  }
}
```

---

## Krok 4b — `nodes/saveUserMessage.ts`

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
```

---

## Krok 4c — `nodes/intentRouter.ts`

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
  const text = (
    typeof lastMsg?.content === "string" ? lastMsg.content : ""
  ).toLowerCase();

  // ① Rule-based pre-filter — bez LLM (lacné správy: "ahoj", "ďakujem", "ok")
  const hasKeyword = NUTRITION_KEYWORDS.some((kw) => text.includes(kw));
  if (!hasKeyword) {
    return { intent: "general" };
  }

  // ② LLM klasifikácia (iba ak obsahuje kľúčové slovo)
  try {
    const prompt = INTENT_CLASSIFY_PROMPT.replace("{{message}}", text);
    const response = await intentModel.invoke([new HumanMessage(prompt)]);
    const raw = (
      typeof response.content === "string" ? response.content : ""
    )
      .trim()
      .toLowerCase();

    const validIntents: Intent[] = [
      "meal_swap",
      "macros",
      "pantry",
      "recipe",
      "general",
    ];
    const intent: Intent = validIntents.includes(raw as Intent)
      ? (raw as Intent)
      : "general";

    return { intent };
  } catch {
    return { intent: "general" }; // fallback — neprerušíme flow
  }
}
```

---

## Krok 4d — `nodes/fetchPlan.ts`

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

    return {
      todaysPlan: plan
        ? { id: plan.id, meals: plan.meals, weekStartDate: plan.weekStartDate }
        : null,
    };
  } catch {
    return { todaysPlan: null };
  }
}
```

---

## Krok 4e — `nodes/fetchMacros.ts`

```typescript
// Deterministický výpočet (Mifflin-St Jeor) — bez DB, bez LLM
// Logika prevzatá z src/lib/langchain.ts:302-372

import { ChatState } from "../state";
import type { MacroTargets } from "../types";

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:          1.0,
  lightly_active:     1.175,
  moderately_active:  1.35,
  very_active:        1.52,
  athlete:            1.7,
};

export async function fetchMacros(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const { userInfo } = state;
  if (!userInfo?.dateOfBirth) return { macroTargets: null };

  const age =
    new Date().getFullYear() - new Date(userInfo.dateOfBirth).getFullYear();
  const weight = Number(userInfo.weight);
  const { height, sex, activity_level, goal } = userInfo;

  // Mifflin-St Jeor BMR
  const bmr =
    sex === "man"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] ?? 1.2;
  const tdee = Math.round(bmr * multiplier);

  const dailyCalories =
    goal === "lose_weight"
      ? Math.round(tdee - 300)
      : goal === "gain_muscle"
        ? Math.round(tdee * 1.15)
        : tdee;

  const protein =
    goal === "gain_muscle"
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

---

## Checklist (Agent 1)

- [ ] `npm install @langchain/langgraph @langchain/google-genai @langchain/core`
- [ ] `src/db/schema.ts` — pridať `chatMessageRoleEnum` + `chatMessages`
- [ ] `npm run db:push`
- [ ] `src/lib/langgraph/chat/types.ts` ← **odblokuje Agent 2**
- [ ] `src/lib/langgraph/chat/state.ts`
- [ ] `src/lib/langgraph/chat/constants.ts`
- [ ] `src/lib/langgraph/chat/nodes/fetchProfile.ts`
- [ ] `src/lib/langgraph/chat/nodes/saveUserMessage.ts`
- [ ] `src/lib/langgraph/chat/nodes/intentRouter.ts`
- [ ] `src/lib/langgraph/chat/nodes/fetchPlan.ts`
- [ ] `src/lib/langgraph/chat/nodes/fetchMacros.ts`
