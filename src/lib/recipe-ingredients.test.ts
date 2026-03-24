import test from "node:test";
import assert from "node:assert/strict";

import { formatRecipeIngredientAmount } from "./recipe-ingredients";
import { localizeUnitLabel } from "./unit-localization";

test("localizeUnitLabel returns Slovak unit labels", () => {
  assert.equal(localizeUnitLabel("tbsp", "sk"), "pl");
  assert.equal(localizeUnitLabel("pc", "sk"), "ks");
});

test("localizeUnitLabel falls back to English labels for unknown locales", () => {
  assert.equal(localizeUnitLabel("tbsp", "fr"), "tbsp");
  assert.equal(localizeUnitLabel("pc", "fr"), "pc");
});

test("formatRecipeIngredientAmount localizes units for Slovak UI", () => {
  assert.equal(formatRecipeIngredientAmount(2, "tbsp", "sk"), "2 pl");
  assert.equal(formatRecipeIngredientAmount(2, "pc", "sk"), "2 ks");
});

test("formatRecipeIngredientAmount preserves canonical units for English UI", () => {
  assert.equal(formatRecipeIngredientAmount(2, "tbsp", "en"), "2 tbsp");
  assert.equal(formatRecipeIngredientAmount(2, "pc", "en"), "2 pc");
});

test("formatRecipeIngredientAmount reuses shared localized amount workflow", () => {
  assert.equal(formatRecipeIngredientAmount(1.125, "tbsp", "sk"), "1,125 pl");
  assert.equal(formatRecipeIngredientAmount(2, "pieces", "sk"), "2 ks");
});