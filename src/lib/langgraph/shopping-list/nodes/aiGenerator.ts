import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { apiLogger } from "@/lib/logger";
import type { ShoppingListState } from "../state";
import type { AiShoppingOutput } from "../types";

function extractJSON(content: string): string {
  // Pokus 1: Odstráň markdown wrapper
  let cleaned = content
    .replace(/```(?:json|JSON)?\s*/g, "")
    .replace(/```\s*$/g, "")
    .trim();

  // Pokus 2: Ak stále začína s ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/```$/, "")
      .trim();
  }

  // Pokus 3: Nájdi prvý { a posledný }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

export async function aiGenerator(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  const { systemPrompt } = state;

  if (!systemPrompt) {
    return { error: "aiGenerator: systemPrompt is null" };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { error: "GOOGLE_AI_API_KEY not configured" };
  }

  // LangChain/Gemini SDK adds multiple abort listeners per call — increase limit to suppress warning
  process.setMaxListeners(25);

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3-flash-preview",
    maxOutputTokens: 65536,
    temperature: 0.7,
    apiKey,
  });

  try {
    const response = await model.invoke([new HumanMessage(systemPrompt)]);

    // Extract text content
    let contentText: string;
    if (typeof response.content === "string") {
      contentText = response.content;
    } else if (Array.isArray(response.content)) {
      contentText = response.content
        .filter(
          (part): part is { type: string; text: string } =>
            typeof part === "object" && part !== null && "text" in part,
        )
        .map((part) => part.text)
        .join("");
    } else {
      contentText = JSON.stringify(response.content);
    }

    contentText = extractJSON(contentText);

    try {
      const parsed = JSON.parse(contentText);

      const aiOutput: AiShoppingOutput = {
        title: parsed.title || "Nákupný zoznam",
        description: parsed.description || "Automaticky vygenerovaný zoznam",
        markdown: parsed.markdown || contentText,
        estimatedMacros: {
          totalCalories: parsed.estimatedMacros?.totalCalories ?? 0,
          protein: parsed.estimatedMacros?.protein ?? 0,
          fat: parsed.estimatedMacros?.fat ?? 0,
          carbs: parsed.estimatedMacros?.carbs ?? 0,
        },
      };

      return { aiOutput };
    } catch (parseErr) {
      return {
        error: `AI output parse failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      };
    }
  } catch (err) {
    apiLogger.error("aiGenerator: Gemini call failed", err, {
      metadata: {
        model: "gemini-3-flash-preview",
        hasApiKey: Boolean(process.env.GOOGLE_AI_API_KEY),
      },
    });
    return {
      error: `AI generation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
