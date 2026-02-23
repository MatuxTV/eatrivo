import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import type { ChatState } from "../state";
import { NUTRITION_KEYWORDS, INTENT_CLASSIFY_PROMPT } from "../constants";
import type { Intent } from "../types";
import { logger } from "@/lib/logger";

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
