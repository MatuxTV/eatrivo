import { HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { apiLogger } from "@/lib/logger";
import type { PantryReceiptScanState } from "../state";
import type { ReceiptScanAiOutput } from "../types";

function extractJSONObject(raw: string): string {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function buildPrompt(
  locale: string,
  repairHint: string | null,
  pantryItemNames: string[],
): string {
  return [
    "You extract grocery line items from a store receipt image.",
    `Preferred locale for item naming: ${locale}`,
    "Return ONLY valid JSON object.",
    'Schema: {"vendor": string | null, "currency": string | null, "ignoredLineCount": number, "unknownLineCount": number, "items": [{"name": string, "quantity": number | null, "unit": string | null, "category": string | null, "confidence": number | null}]}',
    "Rules:",
    "- Extract only grocery-like items that may belong in a home pantry.",
    "- Ignore totals, VAT, loyalty IDs, cashback, payment rows, QR references, card data, and promo lines.",
    "- If quantity is unclear, return null instead of inventing a number.",
    "- If unit is unclear, return null.",
    "- confidence must be between 0 and 1.",
    "- Keep item names short and practical for pantry use.",
    "- If a line looks non-grocery, count it as ignored rather than inventing an item.",
    pantryItemNames.length > 0
      ? `Current pantry examples for reference only: ${pantryItemNames.join(", ")}`
      : "Current pantry examples: none",
    repairHint ? `Repair hint from previous validation: ${repairHint}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function normalizeAiOutput(value: unknown): ReceiptScanAiOutput {
  if (!value || typeof value !== "object") {
    throw new Error("Receipt AI output is invalid.");
  }

  const payload = value as Record<string, unknown>;
  const items = Array.isArray(payload.items) ? payload.items : [];

  return {
    vendor: typeof payload.vendor === "string" ? payload.vendor.trim() || null : null,
    currency:
      typeof payload.currency === "string" ? payload.currency.trim() || null : null,
    ignoredLineCount:
      typeof payload.ignoredLineCount === "number" && Number.isFinite(payload.ignoredLineCount)
        ? payload.ignoredLineCount
        : 0,
    unknownLineCount:
      typeof payload.unknownLineCount === "number" && Number.isFinite(payload.unknownLineCount)
        ? payload.unknownLineCount
        : 0,
    items: items
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        name: typeof item.name === "string" ? item.name.trim() : "",
        quantity:
          typeof item.quantity === "number" && Number.isFinite(item.quantity)
            ? item.quantity
            : null,
        unit: typeof item.unit === "string" ? item.unit.trim() || null : null,
        category:
          typeof item.category === "string" ? item.category.trim() || null : null,
        confidence:
          typeof item.confidence === "number" && Number.isFinite(item.confidence)
            ? Math.max(0, Math.min(1, item.confidence))
            : null,
      }))
      .filter((item) => item.name.length > 0),
  };
}

export async function extractReceipt(
  state: typeof PantryReceiptScanState.State,
): Promise<Partial<typeof PantryReceiptScanState.State>> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return {
      fatalError: "GOOGLE_AI_API_KEY is not configured.",
      fatalErrorCode: "MISSING_GOOGLE_AI_API_KEY",
    };
  }

  try {
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-pro",
      apiKey,
      temperature: 0,
      maxOutputTokens: 8192,
    });

    const prompt = buildPrompt(
      state.locale,
      state.repairHint,
      state.currentPantry.slice(0, 20).map((item) => item.name),
    );

    const response = await model.invoke([
      new HumanMessage({
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: `data:${state.mimeType};base64,${state.imageBase64}`,
          },
        ],
      }),
    ]);

    const contentText =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
    const parsedReceipt = normalizeAiOutput(
      JSON.parse(extractJSONObject(contentText)),
    );

    return {
      rawAiOutput: contentText,
      parsedReceipt,
      requestError: null,
      fatalError: null,
      fatalErrorCode: null,
    };
  } catch (error) {
    apiLogger.error("[pantryReceiptScan.extractReceipt] AI extraction failed", error, {
      metadata: {
        userProfileId: state.userProfileId,
        retryCount: state.retryCount,
      },
    });

    return {
      requestError: "Receipt extraction failed.",
      rawAiOutput: null,
      parsedReceipt: null,
    };
  }
}