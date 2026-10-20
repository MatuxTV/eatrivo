import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import {
  AiConfigError,
  PROVIDER_API_KEY_ENV,
  resolveModelConfig,
  type AiFeature,
  type ModelOverrides,
  type ResolvedModelConfig,
} from "./model-config";
import { createUsageLogger } from "./usage-log";

export interface ChatModelHandle {
  model: BaseChatModel;
  config: ResolvedModelConfig;
}

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

/**
 * Single place that builds chat models. Build lazily (inside a function), never at module load.
 * Entry point for CLI scripts and tests. App code imports "@/lib/ai/models" (server-only).
 * - anthropic: Haiku 5.5 with thinking disabled (plain text / forced-tool output) and an explicit
 *   maxTokens (the library default would be 4096). No temperature: Claude 5.x rejects it.
 * - google: rollback path.
 * `openrouter` is not wired up yet.
 */
export function getChatModel(feature: AiFeature, overrides: ModelOverrides = {}): ChatModelHandle {
  const config = resolveModelConfig(feature, overrides);
  const apiKey = process.env[PROVIDER_API_KEY_ENV[config.provider]]?.trim();
  if (!apiKey) {
    throw new AiConfigError(
      `${PROVIDER_API_KEY_ENV[config.provider]} is not configured.`,
      "MISSING_API_KEY",
    );
  }

  if (config.provider === "anthropic") {
    const model = new ChatAnthropic({
      model: config.model,
      apiKey,
      maxTokens: config.maxOutputTokens,
      thinking: { type: "disabled" },
      outputConfig: { effort: config.effort },
      streaming: config.streaming,
      maxRetries: MAX_RETRIES,
      callbacks: [createUsageLogger(config)],
      clientOptions: { timeout: REQUEST_TIMEOUT_MS },
    });
    return { model, config };
  }

  if (config.provider === "google") {
    const model = new ChatGoogleGenerativeAI({
      model: config.model,
      apiKey,
      ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
      maxOutputTokens: config.maxOutputTokens,
      streaming: config.streaming,
      maxRetries: MAX_RETRIES,
      callbacks: [createUsageLogger(config)],
    });
    return { model, config };
  }

  throw new AiConfigError(
    `AI provider "${config.provider}" is not available yet.`,
    "PROVIDER_NOT_AVAILABLE",
  );
}