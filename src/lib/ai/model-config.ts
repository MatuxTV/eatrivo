export type AiProvider = "google" | "anthropic" | "openrouter";

export type AiFeature =
  | "chat"
  | "intent"
  | "customRecipe"
  | "unitAudit"
  | "recipeImport"
  | "pantryNormalize"
  | "ingredientClassify"
  | "receiptScan"
  | "shoppingList"
  | "photoRecognition"
  | "photoMerge";

/** Anthropic effort. With thinking disabled Haiku 5.5 accepts low | medium | high only. */
export type AiEffort = "low" | "medium" | "high";

export interface ProviderCapabilities {
  /** Claude 5.x rejects non-default temperature/top_p/top_k with HTTP 400 */
  supportsTemperature: boolean;
  maxOutputTokens: number;
}

export const PROVIDER_CAPABILITIES: Record<AiProvider, ProviderCapabilities> = {
  google: { supportsTemperature: true, maxOutputTokens: 65536 },
  anthropic: { supportsTemperature: false, maxOutputTokens: 128000 },
  openrouter: { supportsTemperature: true, maxOutputTokens: 32768 },
};

export const PROVIDER_API_KEY_ENV: Record<AiProvider, string> = {
  google: "GOOGLE_AI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

interface FeatureSettings {
  maxOutputTokens: number;
  effort: AiEffort;
  streaming: boolean;
  /** only used by providers that accept a temperature (google, openrouter) */
  temperature: number;
}

const FEATURE_SETTINGS: Record<AiFeature, FeatureSettings> = {
  chat: { maxOutputTokens: 2048, effort: "low", streaming: true, temperature: 0.7 },
  // Gemini thinking tokens count against this cap, so it must not be tiny even though the answer is one word
  intent: { maxOutputTokens: 1024, effort: "low", streaming: false, temperature: 0 },
  customRecipe: { maxOutputTokens: 6000, effort: "medium", streaming: false, temperature: 0.3 },
  unitAudit: { maxOutputTokens: 2000, effort: "low", streaming: false, temperature: 0 },
  recipeImport: { maxOutputTokens: 12288, effort: "medium", streaming: false, temperature: 0 },
  pantryNormalize: { maxOutputTokens: 8192, effort: "low", streaming: false, temperature: 0 },
  ingredientClassify: { maxOutputTokens: 2048, effort: "low", streaming: false, temperature: 0 },
  receiptScan: { maxOutputTokens: 8192, effort: "medium", streaming: false, temperature: 0 },
  shoppingList: { maxOutputTokens: 16000, effort: "low", streaming: false, temperature: 0.7 },
  photoRecognition: { maxOutputTokens: 4096, effort: "low", streaming: false, temperature: 0 },
  photoMerge: { maxOutputTokens: 2048, effort: "low", streaming: false, temperature: 0 },
};

const ANTHROPIC_DEFAULT_MODEL = "claude-haiku-5-5";

/** Gemini ids are the rollback path (`AI_PROVIDER=google`). gemini-3.1-flash-lite replaced the shut-down -preview id. */
const GOOGLE_DEFAULT_MODELS: Record<AiFeature, string> = {
  chat: "gemini-3.1-flash-lite",
  intent: "gemini-3-flash-preview",
  customRecipe: "gemini-3.1-flash-lite",
  unitAudit: "gemini-3.1-flash-lite",
  recipeImport: "gemini-3-flash-preview",
  pantryNormalize: "gemini-2.5-flash",
  ingredientClassify: "gemini-2.5-flash",
  receiptScan: "gemini-2.5-pro",
  shoppingList: "gemini-3-flash-preview",
  photoRecognition: "gemini-2.5-flash",
  photoMerge: "gemini-2.5-flash",
};

const OPENROUTER_DEFAULT_MODEL = "anthropic/claude-haiku-5.5";

function defaultModel(feature: AiFeature, provider: AiProvider): string {
  if (provider === "anthropic") return ANTHROPIC_DEFAULT_MODEL;
  if (provider === "openrouter") return OPENROUTER_DEFAULT_MODEL;
  return GOOGLE_DEFAULT_MODELS[feature];
}

export interface ModelOverrides {
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
  effort?: AiEffort;
}

export interface ResolvedModelConfig {
  feature: AiFeature;
  provider: AiProvider;
  model: string;
  /** undefined when the provider does not accept a temperature */
  temperature: number | undefined;
  maxOutputTokens: number;
  effort: AiEffort;
  streaming: boolean;
}

export class AiConfigError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_PROVIDER" | "MISSING_API_KEY" | "PROVIDER_NOT_AVAILABLE",
  ) {
    super(message);
    this.name = "AiConfigError";
  }
}

export function parseAiProvider(value: string | undefined): AiProvider {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "google" || normalized === "anthropic" || normalized === "openrouter") {
    return normalized;
  }
  throw new AiConfigError(`Unsupported AI_PROVIDER "${value}".`, "INVALID_PROVIDER");
}

/**
 * An explicit `AI_PROVIDER` always wins. Without it the provider is `anthropic` when
 * `ANTHROPIC_API_KEY` is set and `google` otherwise (so an environment without the new key keeps working).
 */
export function resolveProvider(env: Record<string, string | undefined> = process.env): AiProvider {
  const explicit = env.AI_PROVIDER?.trim();
  if (explicit) return parseAiProvider(explicit);
  return env.ANTHROPIC_API_KEY?.trim() ? "anthropic" : "google";
}

function featureEnvSuffix(feature: AiFeature): string {
  return feature.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
}

/**
 * Resolves provider, model and sampling parameters for a feature from env
 * (`AI_PROVIDER`, `AI_MODEL_<FEATURE>`), clamping parameters the provider rejects.
 */
export function resolveModelConfig(
  feature: AiFeature,
  overrides: ModelOverrides = {},
  env: Record<string, string | undefined> = process.env,
): ResolvedModelConfig {
  const provider = resolveProvider(env);
  const capabilities = PROVIDER_CAPABILITIES[provider];
  const settings = FEATURE_SETTINGS[feature];
  const envModel = env[`AI_MODEL_${featureEnvSuffix(feature)}`]?.trim();
  const model = overrides.model?.trim() || envModel || defaultModel(feature, provider);
  const requestedTokens = overrides.maxOutputTokens ?? settings.maxOutputTokens;

  return {
    feature,
    provider,
    model,
    temperature: capabilities.supportsTemperature
      ? overrides.temperature ?? settings.temperature
      : undefined,
    maxOutputTokens: Math.min(requestedTokens, capabilities.maxOutputTokens),
    effort: overrides.effort ?? settings.effort,
    streaming: settings.streaming,
  };
}