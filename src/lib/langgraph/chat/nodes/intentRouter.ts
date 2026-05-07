import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import type { ChatState } from "../state";
import { NUTRITION_KEYWORDS, INTENT_CLASSIFY_PROMPT } from "../constants";
import type { Intent } from "../types";
import { logger } from "@/lib/logger";

const RECIPE_CREATION_PATTERNS = [
  "vytvor recept",
  "vymysli recept",
  "navrhni recept",
  "sprav recept",
  "daj mi recept",
  "das mi recept",
  "daj recept",
  "recept na",
  "chcem recept na",
  "prosím recept na",
  "prosim recept na",
  "create recipe",
  "invent recipe",
  "new recipe",
  "vlastny recept",
  "recept na mieru",
];

const RECIPE_TEXT_REPLY_PATTERNS = [
  "postup",
  "ako urobiť",
  "ako urobit",
  "ako pripraviť",
  "ako pripravit",
  "instructions",
  "recipe steps",
];

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
    logger.info(`[intentRouter] No keywords found. Returning general intent.`);
    return { intent: "general" };
  }

  if (
    RECIPE_CREATION_PATTERNS.some((pattern) => text.includes(pattern)) &&
    !RECIPE_TEXT_REPLY_PATTERNS.some((pattern) => text.includes(pattern))
  ) {
    logger.info(`[intentRouter] Matched recipe creation rule.`);
    return { intent: "recipe_creation" };
  }

  // ② LLM klasifikácia (iba ak obsahuje kľúčové slovo)
  try {
    const prompt = INTENT_CLASSIFY_PROMPT.replace("{{message}}", text);
    const response = await intentModel.invoke([new HumanMessage(prompt)]);
    const raw = (typeof response.content === "string" ? response.content : "")
      .trim()
      .toLowerCase();

    const validIntents: Intent[] = [
      "meal_swap",
      "macros",
      "pantry",
      "recipe",
      "recipe_creation",
      "general",
    ];
    const intent: Intent = validIntents.includes(raw as Intent)
      ? (raw as Intent)
      : "general";

    logger.info(
      `[intentRouter] LLM classified intent as: ${intent} (raw: ${raw})`,
    );

    return { intent };
  } catch (error) {
    logger.error(`[intentRouter] Error classifying intent`, error);
    return { intent: "general" }; // fallback — neprerušíme flow
  }
}
