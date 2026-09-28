import test from "node:test";
import assert from "node:assert/strict";

import type { IngredientGraph } from "@/lib/ingredients/ingredient-matching";
import {
  buildClassificationPrompt,
  getPrivateDuplicateLookupKey,
  parseClassification,
  planClassification,
  resolveReviewState,
  toCatalogSlug,
  type ClassificationResult,
} from "./ingredient-classification-core";

function buildGraph(parentPairs: [string, string | null][]): IngredientGraph {
  const parentById = new Map<string, string | null>();
  const keyById = new Map<string, string>();
  const idByKey = new Map<string, string>();

  for (const [key, parentKey] of parentPairs) {
    const id = `id:${key}`;
    keyById.set(id, key);
    idByKey.set(key, id);
    parentById.set(id, parentKey ? `id:${parentKey}` : null);
  }

  return { parentById, keyById, idByKey };
}

const graph = buildGraph([
  ["butter", null],
  ["oil", null],
  ["olive-oil", "oil"],
  ["bakery", null],
]);

function result(overrides: Partial<ClassificationResult> = {}): ClassificationResult {
  return {
    isFoodIngredient: true,
    canonicalKey: null,
    familyKey: null,
    englishName: null,
    localizedName: null,
    confidence: 0.9,
    reason: null,
    ...overrides,
  };
}

// ── parseClassification ─────────────────────────────────────────────────────

test("parseClassification reads a plain JSON object", () => {
  const parsed = parseClassification(
    '{"isFoodIngredient": true, "canonicalKey": "bread", "familyKey": null, "englishName": "Bread", "localizedName": "Chlieb", "confidence": 0.92, "reason": "staple"}',
  );

  assert.deepEqual(parsed, {
    isFoodIngredient: true,
    canonicalKey: "bread",
    familyKey: null,
    englishName: "Bread",
    localizedName: "Chlieb",
    confidence: 0.92,
    reason: "staple",
  });
});

test("parseClassification strips markdown fences and surrounding prose", () => {
  const parsed = parseClassification(
    'Here you go:\n```json\n{"isFoodIngredient": true, "canonicalKey": "butter"}\n```',
  );

  assert.equal(parsed?.canonicalKey, "butter");
  assert.equal(parsed?.isFoodIngredient, true);
});

test("parseClassification returns null for unparseable output", () => {
  assert.equal(parseClassification("not json at all"), null);
  assert.equal(parseClassification("{broken"), null);
});

test("parseClassification drops fields with the wrong type", () => {
  const parsed = parseClassification(
    '{"isFoodIngredient": "yes", "canonicalKey": 42, "familyKey": ["oil"], "confidence": "high"}',
  );

  assert.equal(parsed?.isFoodIngredient, true);
  assert.equal(parsed?.canonicalKey, null);
  assert.equal(parsed?.familyKey, null);
  assert.equal(parsed?.confidence, null);
  assert.equal(parsed?.englishName, null);
});

test("parseClassification treats a missing isFoodIngredient as false", () => {
  assert.equal(parseClassification('{"canonicalKey": "bread"}')?.isFoodIngredient, false);
});

// ── toCatalogSlug ───────────────────────────────────────────────────────────

test("toCatalogSlug accepts English kebab-case keys and normalizes case and whitespace", () => {
  assert.equal(toCatalogSlug("bread"), "bread");
  assert.equal(toCatalogSlug("  Green-Asparagus "), "green-asparagus");
  assert.equal(toCatalogSlug("7up"), "7up");
});

test("toCatalogSlug rejects anything that is not a clean slug", () => {
  for (const value of [
    "olive oil",
    "údený-syr",
    "olive_oil",
    "-oil",
    "oil-",
    "olive--oil",
    "",
    "   ",
    null,
    undefined,
  ]) {
    assert.equal(toCatalogSlug(value), null, `expected ${JSON.stringify(value)} to be rejected`);
  }
});

// ── resolveReviewState ──────────────────────────────────────────────────────

test("resolveReviewState flags non-food items regardless of confidence", () => {
  assert.equal(resolveReviewState(result({ isFoodIngredient: false, confidence: 1 })), "flagged");
});

test("resolveReviewState trusts food at or above the confidence threshold", () => {
  assert.equal(resolveReviewState(result({ confidence: 0.6 })), "trusted");
  assert.equal(resolveReviewState(result({ confidence: 0.99 })), "trusted");
});

test("resolveReviewState keeps low-confidence or unknown-confidence food unverified", () => {
  assert.equal(resolveReviewState(result({ confidence: 0.59 })), "unverified");
  assert.equal(resolveReviewState(result({ confidence: null })), "unverified");
});

// ── getPrivateDuplicateLookupKey ────────────────────────────────────────────

test("getPrivateDuplicateLookupKey skips the lookup when the key is a global ingredient", () => {
  assert.equal(getPrivateDuplicateLookupKey(result({ canonicalKey: "butter" }), graph), null);
});

test("getPrivateDuplicateLookupKey skips the lookup for non-food or invalid keys", () => {
  assert.equal(
    getPrivateDuplicateLookupKey(result({ isFoodIngredient: false, canonicalKey: "bread" }), graph),
    null,
  );
  assert.equal(getPrivateDuplicateLookupKey(result({ canonicalKey: "biely chlieb" }), graph), null);
});

test("getPrivateDuplicateLookupKey returns the normalized key for unknown ingredients", () => {
  assert.equal(getPrivateDuplicateLookupKey(result({ canonicalKey: " Bread " }), graph), "bread");
});

// ── planClassification ──────────────────────────────────────────────────────

test("planClassification merges into a known global ingredient", () => {
  const plan = planClassification({
    ingredientId: "private:1",
    rawName: "Maslíčko",
    result: result({ canonicalKey: "butter", localizedName: "Maslo" }),
    graph,
    privateDuplicate: null,
  });

  assert.deepEqual(plan.action, {
    type: "merge",
    reason: "global",
    target: { id: "id:butter", key: "butter", familyKey: "butter" },
  });
  assert.deepEqual(plan.learnedNames, ["Maslíčko", "Maslo"]);
});

test("planClassification uses the global ingredient's parent as the family key", () => {
  const plan = planClassification({
    ingredientId: "private:1",
    rawName: "extra panenský olej",
    result: result({ canonicalKey: "olive-oil" }),
    graph,
    privateDuplicate: null,
  });

  assert.equal(plan.action.type, "merge");
  assert.deepEqual(plan.action.type === "merge" && plan.action.target, {
    id: "id:olive-oil",
    key: "olive-oil",
    familyKey: "oil",
  });
});

test("planClassification prefers a global match over the user's private duplicate", () => {
  const plan = planClassification({
    ingredientId: "private:2",
    rawName: "maslo",
    result: result({ canonicalKey: "butter" }),
    graph,
    privateDuplicate: { id: "private:1", key: "butter" },
  });

  assert.equal(plan.action.type === "merge" && plan.action.reason, "global");
});

test("planClassification merges into the user's existing private ingredient with the same key", () => {
  const plan = planClassification({
    ingredientId: "private:2",
    rawName: "chleba",
    result: result({ canonicalKey: "bread", localizedName: "Chlieb" }),
    graph,
    privateDuplicate: { id: "private:1", key: "bread" },
  });

  assert.deepEqual(plan.action, {
    type: "merge",
    reason: "private-duplicate",
    target: { id: "private:1", key: "bread", familyKey: "bread" },
  });
  assert.deepEqual(plan.learnedNames, ["chleba", "Chlieb"]);
});

test("planClassification keeps a known AI family on a private-duplicate merge", () => {
  const plan = planClassification({
    ingredientId: "private:2",
    rawName: "celozrnný chlieb",
    result: result({ canonicalKey: "wholegrain-bread", familyKey: "bakery" }),
    graph,
    privateDuplicate: { id: "private:1", key: "wholegrain-bread" },
  });

  assert.equal(plan.action.type === "merge" && plan.action.target.familyKey, "bakery");
  assert.equal(plan.parentId, "id:bakery");
});

test("planClassification does nothing when the private ingredient already has the key", () => {
  const plan = planClassification({
    ingredientId: "private:1",
    rawName: "bread",
    result: result({ canonicalKey: "bread" }),
    graph,
    privateDuplicate: { id: "private:1", key: "bread" },
  });

  assert.deepEqual(plan.action, { type: "none" });
});

test("planClassification renames an unknown private ingredient to the English key", () => {
  const plan = planClassification({
    ingredientId: "private:1",
    rawName: "chlieb",
    result: result({ canonicalKey: "bread", familyKey: "bakery" }),
    graph,
    privateDuplicate: null,
  });

  assert.deepEqual(plan.action, { type: "rekey", key: "bread", familyKey: "bakery" });
  assert.equal(plan.parentId, "id:bakery");
  assert.equal(plan.reviewState, "trusted");
});

test("planClassification ignores an AI family that is not in the catalog", () => {
  const plan = planClassification({
    ingredientId: "private:1",
    rawName: "chlieb",
    result: result({ canonicalKey: "bread", familyKey: "baked-goods" }),
    graph,
    privateDuplicate: null,
  });

  assert.deepEqual(plan.action, { type: "rekey", key: "bread", familyKey: "bread" });
  assert.equal(plan.parentId, null);
});

test("planClassification leaves non-food items in place and flags them", () => {
  const plan = planClassification({
    ingredientId: "private:1",
    rawName: "toaletný papier",
    result: result({ isFoodIngredient: false, canonicalKey: null }),
    graph,
    privateDuplicate: null,
  });

  assert.deepEqual(plan.action, { type: "none" });
  assert.equal(plan.reviewState, "flagged");
});

test("planClassification ignores a non-slug canonical key from the AI", () => {
  const plan = planClassification({
    ingredientId: "private:1",
    rawName: "chlieb",
    result: result({ canonicalKey: "biely chlieb" }),
    graph,
    privateDuplicate: null,
  });

  assert.deepEqual(plan.action, { type: "none" });
});

test("planClassification never merges into a flagged-as-non-food global match", () => {
  const plan = planClassification({
    ingredientId: "private:1",
    rawName: "butter knife",
    result: result({ isFoodIngredient: false, canonicalKey: "butter" }),
    graph,
    privateDuplicate: null,
  });

  assert.deepEqual(plan.action, { type: "none" });
  assert.equal(plan.reviewState, "flagged");
});

test("planClassification trims learned names and drops empty ones", () => {
  const plan = planClassification({
    ingredientId: "private:1",
    rawName: "  Maslíčko ",
    result: result({ canonicalKey: "butter", localizedName: "   " }),
    graph,
    privateDuplicate: null,
  });

  assert.deepEqual(plan.learnedNames, ["Maslíčko"]);
});

// ── buildClassificationPrompt ───────────────────────────────────────────────

test("buildClassificationPrompt includes the input, locale and known catalog keys", () => {
  const prompt = buildClassificationPrompt({
    rawName: "Chlieb",
    locale: "sk",
    knownKeys: ["butter", "oil"],
  });

  assert.match(prompt, /Primary locale: sk/);
  assert.match(prompt, /Raw user input: "Chlieb"/);
  assert.match(prompt, /butter, oil/);
});

test("buildClassificationPrompt marks an empty catalog explicitly", () => {
  const prompt = buildClassificationPrompt({ rawName: "x", locale: "en", knownKeys: [] });

  assert.match(prompt, /\(none\)/);
});
