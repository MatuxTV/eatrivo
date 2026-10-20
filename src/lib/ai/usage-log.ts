import type { LLMResult } from "@langchain/core/outputs";

import { apiLogger } from "@/lib/logger";

import type { ResolvedModelConfig } from "./model-config";

const ABNORMAL_STOP_REASONS = new Set(["max_tokens", "refusal", "length", "MAX_TOKENS", "SAFETY"]);

interface GenerationLike {
  message?: {
    usage_metadata?: { input_tokens?: number; output_tokens?: number };
    response_metadata?: { stop_reason?: string; finish_reason?: string; finishReason?: string };
  };
  generationInfo?: { finish_reason?: string; finishReason?: string };
}

/** Callback handler that logs token usage per model call and warns on truncated or refused replies. */
export function createUsageLogger(config: ResolvedModelConfig, startedAt: () => number = Date.now) {
  const startTimes: number[] = [];
  return {
    handleLLMStart() {
      startTimes.push(startedAt());
    },
    handleLLMEnd(output: LLMResult) {
      const generation = output.generations?.[0]?.[0] as GenerationLike | undefined;
      const usage = generation?.message?.usage_metadata;
      const meta = generation?.message?.response_metadata;
      const stopReason =
        meta?.stop_reason ??
        meta?.finish_reason ??
        meta?.finishReason ??
        generation?.generationInfo?.finish_reason ??
        generation?.generationInfo?.finishReason ??
        null;
      const started = startTimes.shift();
      const metadata = {
        feature: config.feature,
        provider: config.provider,
        model: config.model,
        inputTokens: usage?.input_tokens ?? null,
        outputTokens: usage?.output_tokens ?? null,
        stopReason,
        latencyMs: started === undefined ? null : startedAt() - started,
      };
      if (stopReason && ABNORMAL_STOP_REASONS.has(stopReason)) {
        apiLogger.warn("[ai] model call ended abnormally", { metadata });
        return;
      }
      apiLogger.info("[ai] model call completed", { metadata });
    },
  };
}