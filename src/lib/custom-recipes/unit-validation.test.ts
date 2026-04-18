import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCustomRecipeUnitExpectation,
  validateCustomRecipeIngredientAmountFormat,
  validateCustomRecipeIngredientUnitSemantics,
} from "./unit-validation";

test("validateCustomRecipeIngredientAmountFormat rejects missing unit", () => {
  const issues = validateCustomRecipeIngredientAmountFormat({
    ingredientName: "Olive oil",
    amount: "0,5",
  });

  assert.equal(issues[0]?.errorType, "unit_format_error");
  assert.match(issues[0]?.message ?? "", /explicit unit/i);
});

test("validateCustomRecipeIngredientUnitSemantics rejects wrong semantic unit", () => {
  const issues = validateCustomRecipeIngredientUnitSemantics({
    ingredientName: "Tomato paste",
    amount: "2 ks",
  });

  assert.equal(issues[0]?.errorType, "unit_semantic_error");
  assert.match(issues[0]?.message ?? "", /should use/i);
});

test("validateCustomRecipeIngredientAmountFormat accepts correct liquid unit", () => {
  const issues = validateCustomRecipeIngredientAmountFormat({
    ingredientName: "Olive oil",
    amount: "30 ml",
  });

  assert.deepEqual(issues, []);
});

test("validateCustomRecipeIngredientUnitSemantics allows processed tomatoes in grams", () => {
  const issues = validateCustomRecipeIngredientUnitSemantics({
    ingredientName: "Lúpaná paradajka",
    amount: "400 g",
  });

  assert.deepEqual(issues, []);
});

test("validateCustomRecipeIngredientUnitSemantics matches accented broth names as liquid", () => {
  const issues = validateCustomRecipeIngredientUnitSemantics({
    ingredientName: "Hovädzí vývar",
    amount: "500 ml",
  });

  assert.deepEqual(issues, []);
});

test("resolveCustomRecipeUnitExpectation uses explicit registry first", () => {
  const expectation = resolveCustomRecipeUnitExpectation({
    ingredientName: "Tomato paste",
  });

  assert.equal(expectation.preferredUnit, "g");
  assert.ok(expectation.allowedUnits.includes("ml"));
});