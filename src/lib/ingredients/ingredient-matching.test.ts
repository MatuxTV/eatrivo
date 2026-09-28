import test from "node:test";
import assert from "node:assert/strict";

import {
  isIngredientAncestor,
  matchPantryIngredient,
  type IngredientGraph,
} from "./ingredient-matching";

function buildGraph(
  parentPairs: [string, string | null][],
): IngredientGraph {
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
  ["oil", null],
  ["olive-oil", "oil"],
  ["sesame-oil", "oil"],
  ["butter", null],
  ["almond-butter", "butter"],
]);

test("matchPantryIngredient matches identical ingredient ids as exact", () => {
  const result = matchPantryIngredient(
    { ingredientId: "id:olive-oil", ingredientKey: "oil", ingredientSpecificKey: "olive-oil" },
    { ingredientId: "id:olive-oil", ingredientKey: "oil", ingredientSpecificKey: "olive-oil" },
    graph,
  );

  assert.deepEqual(result, { matched: true, matchType: "exact" });
});

test("matchPantryIngredient matches a specific pantry item to a family recipe", () => {
  const result = matchPantryIngredient(
    { ingredientId: "id:olive-oil", ingredientKey: "oil", ingredientSpecificKey: "olive-oil" },
    { ingredientId: "id:oil", ingredientKey: "oil", ingredientSpecificKey: null },
    graph,
  );

  assert.deepEqual(result, { matched: true, matchType: "exact" });
});

test("matchPantryIngredient matches a family pantry item to a specific recipe", () => {
  const result = matchPantryIngredient(
    { ingredientId: "id:butter", ingredientKey: "butter", ingredientSpecificKey: null },
    { ingredientId: "id:almond-butter", ingredientKey: "butter", ingredientSpecificKey: "almond-butter" },
    graph,
  );

  assert.deepEqual(result, { matched: true, matchType: "fallback" });
});

test("matchPantryIngredient does not match sibling ingredients in the same family", () => {
  const result = matchPantryIngredient(
    { ingredientId: "id:olive-oil", ingredientKey: "oil", ingredientSpecificKey: "olive-oil" },
    { ingredientId: "id:sesame-oil", ingredientKey: "oil", ingredientSpecificKey: "sesame-oil" },
    graph,
  );

  assert.deepEqual(result, { matched: false, matchType: null });
});

test("matchPantryIngredient matches a classified private ingredient through its parent family", () => {
  const graphWithPrivate = buildGraph([
    ["oil", null],
    ["olive-oil", "oil"],
  ]);
  graphWithPrivate.parentById.set("id:private-truffle-oil", "id:oil");
  graphWithPrivate.keyById.set("id:private-truffle-oil", "truffle-oil");

  const result = matchPantryIngredient(
    { ingredientId: "id:private-truffle-oil", ingredientKey: "oil", ingredientSpecificKey: "truffle-oil" },
    { ingredientId: "id:oil", ingredientKey: "oil", ingredientSpecificKey: null },
    graphWithPrivate,
  );

  assert.deepEqual(result, { matched: true, matchType: "exact" });
});

test("matchPantryIngredient falls back to keys when ids are missing", () => {
  const result = matchPantryIngredient(
    { ingredientId: null, ingredientKey: "oil", ingredientSpecificKey: "olive-oil" },
    { ingredientId: null, ingredientKey: "oil", ingredientSpecificKey: null },
    null,
  );

  assert.equal(result.matched, true);
});

test("matchPantryIngredient does not match unrelated ingredients from different families", () => {
  const result = matchPantryIngredient(
    { ingredientId: "id:almond-butter", ingredientKey: "butter", ingredientSpecificKey: "almond-butter" },
    { ingredientId: "id:olive-oil", ingredientKey: "oil", ingredientSpecificKey: "olive-oil" },
    graph,
  );

  assert.deepEqual(result, { matched: false, matchType: null });
});

test("matchPantryIngredient uses key matching when only one side has an ingredient id", () => {
  const result = matchPantryIngredient(
    { ingredientId: "id:olive-oil", ingredientKey: "oil", ingredientSpecificKey: "olive-oil" },
    { ingredientId: null, ingredientKey: "oil", ingredientSpecificKey: "olive-oil" },
    graph,
  );

  assert.deepEqual(result, { matched: true, matchType: "exact" });
});

test("matchPantryIngredient does not match an unclassified private ingredient", () => {
  const graphWithPrivate = buildGraph([["oil", null]]);
  graphWithPrivate.parentById.set("id:private-chlieb", null);
  graphWithPrivate.keyById.set("id:private-chlieb", "chlieb");

  const result = matchPantryIngredient(
    { ingredientId: "id:private-chlieb", ingredientKey: "chlieb", ingredientSpecificKey: "chlieb" },
    { ingredientId: "id:oil", ingredientKey: "oil", ingredientSpecificKey: null },
    graphWithPrivate,
  );

  assert.deepEqual(result, { matched: false, matchType: null });
});

test("isIngredientAncestor walks multiple levels", () => {
  const deep = buildGraph([
    ["oil", null],
    ["olive-oil", "oil"],
    ["extra-virgin-olive-oil", "olive-oil"],
  ]);

  assert.equal(isIngredientAncestor("id:oil", "id:extra-virgin-olive-oil", deep.parentById), true);
  assert.equal(isIngredientAncestor("id:extra-virgin-olive-oil", "id:oil", deep.parentById), false);
});

test("isIngredientAncestor terminates on a corrupted parent cycle", () => {
  const parentById = new Map<string, string | null>([
    ["id:a", "id:b"],
    ["id:b", "id:a"],
  ]);

  assert.equal(isIngredientAncestor("id:c", "id:a", parentById), false);
});
