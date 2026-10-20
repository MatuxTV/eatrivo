import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AiConfigError,
  PROVIDER_CAPABILITIES,
  parseAiProvider,
  resolveModelConfig,
  resolveProvider,
  type AiFeature,
} from "./model-config";

const ALL_FEATURES: AiFeature[] = [
  "chat",
  "intent",
  "customRecipe",
  "unitAudit",
  "recipeImport",
  "pantryNormalize",
  "ingredientClassify",
  "receiptScan",
  "shoppingList",
  "photoRecognition",
  "photoMerge",
];

const ANTHROPIC_CAP = PROVIDER_CAPABILITIES.anthropic.maxOutputTokens;

function isAiConfigError(error: unknown, code: string): boolean {
  return error instanceof AiConfigError && error.code === code;
}

test("resolveProvider picks the provider from an explicit env", () => {
  assert.equal(resolveProvider({}), "google");
  assert.equal(resolveProvider({ ANTHROPIC_API_KEY: "k" }), "anthropic");
  assert.equal(resolveProvider({ ANTHROPIC_API_KEY: "  " }), "google");
  assert.equal(resolveProvider({ AI_PROVIDER: "google", ANTHROPIC_API_KEY: "k" }), "google");
  assert.equal(resolveProvider({ AI_PROVIDER: " Anthropic " }), "anthropic");
});

test("resolveProvider rejects an unsupported AI_PROVIDER", () => {
  assert.throws(
    () => resolveProvider({ AI_PROVIDER: "openai" }),
    (error: unknown) => isAiConfigError(error, "INVALID_PROVIDER"),
  );
  assert.throws(
    () => parseAiProvider(undefined),
    (error: unknown) => isAiConfigError(error, "INVALID_PROVIDER"),
  );
});

test("google defaults: photoRecognition and photoMerge", () => {
  const recognition = resolveModelConfig("photoRecognition", {}, {});
  assert.equal(recognition.provider, "google");
  assert.equal(recognition.model, "gemini-2.5-flash");
  assert.equal(recognition.temperature, 0);
  assert.equal(recognition.maxOutputTokens, 4096);

  const merge = resolveModelConfig("photoMerge", {}, {});
  assert.equal(merge.provider, "google");
  assert.equal(merge.maxOutputTokens, 2048);
});

test("google defaults: chat and receiptScan", () => {
  const chat = resolveModelConfig("chat", {}, {});
  assert.equal(chat.model, "gemini-3.1-flash-lite");
  assert.equal(chat.temperature, 0.7);
  assert.equal(chat.streaming, true);

  assert.equal(resolveModelConfig("receiptScan", {}, {}).model, "gemini-2.5-pro");
});

test("no google default model id contains the shut-down -lite-preview suffix", () => {
  for (const feature of ALL_FEATURES) {
    const { model } = resolveModelConfig(feature, {}, {});
    assert.ok(!model.includes("-lite-preview"), `${feature} resolved to ${model}`);
  }
});

test("anthropic resolves every feature to claude-haiku-5-5 without temperature", () => {
  const env = { AI_PROVIDER: "anthropic" };
  for (const feature of ALL_FEATURES) {
    const config = resolveModelConfig(feature, {}, env);
    assert.equal(config.provider, "anthropic");
    assert.equal(config.model, "claude-haiku-5-5");
    assert.equal(config.temperature, undefined);
    assert.ok(config.maxOutputTokens > 0);
    assert.ok(config.maxOutputTokens <= ANTHROPIC_CAP);
  }
});

test("anthropic drops temperature even when overridden", () => {
  const env = { AI_PROVIDER: "anthropic" };
  for (const feature of ALL_FEATURES) {
    const config = resolveModelConfig(feature, { temperature: 0.7 }, env);
    assert.equal(config.temperature, undefined);
  }
});

test("anthropic effort and streaming follow the feature settings", () => {
  const env = { AI_PROVIDER: "anthropic" };
  assert.equal(resolveModelConfig("customRecipe", {}, env).effort, "medium");
  assert.equal(resolveModelConfig("pantryNormalize", {}, env).effort, "low");

  for (const feature of ALL_FEATURES) {
    assert.equal(
      resolveModelConfig(feature, {}, env).streaming,
      feature === "chat",
      `${feature} streaming`,
    );
  }
});

test("openrouter keeps temperature and uses the openrouter default model", () => {
  const env = { AI_PROVIDER: "openrouter" };
  const overridden = resolveModelConfig("photoRecognition", { temperature: 0.3 }, env);
  assert.equal(overridden.provider, "openrouter");
  assert.equal(overridden.model, "anthropic/claude-haiku-5.5");
  assert.equal(overridden.temperature, 0.3);

  assert.equal(resolveModelConfig("photoRecognition", {}, env).temperature, 0);
});

test("AI_MODEL_<FEATURE> overrides the default and loses to overrides.model", () => {
  const fromEnv = resolveModelConfig(
    "photoRecognition",
    {},
    { AI_MODEL_PHOTO_RECOGNITION: "my-model" },
  );
  assert.equal(fromEnv.model, "my-model");

  const fromOverride = resolveModelConfig(
    "photoRecognition",
    { model: "override-model" },
    { AI_MODEL_PHOTO_RECOGNITION: "my-model" },
  );
  assert.equal(fromOverride.model, "override-model");
});

test("AI_MODEL_CUSTOM_RECIPE only overrides customRecipe", () => {
  const env = { AI_MODEL_CUSTOM_RECIPE: "claude-sonnet-5-5", AI_PROVIDER: "anthropic" };
  assert.equal(resolveModelConfig("customRecipe", {}, env).model, "claude-sonnet-5-5");
  assert.equal(resolveModelConfig("chat", {}, env).model, "claude-haiku-5-5");
});

test("AI_MODEL_PHOTO_MERGE is read by photoMerge only", () => {
  const env = { AI_MODEL_PHOTO_MERGE: "x" };
  assert.equal(resolveModelConfig("photoMerge", {}, env).model, "x");
  assert.notEqual(resolveModelConfig("photoRecognition", {}, env).model, "x");
});

test("maxOutputTokens is clamped to the provider cap", () => {
  assert.equal(
    resolveModelConfig("photoRecognition", { maxOutputTokens: 999999 }, {}).maxOutputTokens,
    65536,
  );
  assert.equal(
    resolveModelConfig("photoRecognition", { maxOutputTokens: 999999 }, { AI_PROVIDER: "anthropic" })
      .maxOutputTokens,
    128000,
  );
  assert.equal(
    resolveModelConfig("photoRecognition", { maxOutputTokens: 999999 }, { AI_PROVIDER: "openrouter" })
      .maxOutputTokens,
    32768,
  );
});

test("effort override wins over the feature setting", () => {
  assert.equal(
    resolveModelConfig("customRecipe", { effort: "high" }, { AI_PROVIDER: "anthropic" }).effort,
    "high",
  );
});

test("ANTHROPIC_API_KEY without AI_PROVIDER resolves anthropic", () => {
  const config = resolveModelConfig("chat", {}, { ANTHROPIC_API_KEY: "k" });
  assert.equal(config.provider, "anthropic");
});
