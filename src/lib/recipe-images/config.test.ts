import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MONTHLY_BUDGET_USD,
  DEFAULT_RECIPE_IMAGE_MODEL,
  RECIPE_IMAGE_PRICE_USD,
  getImagePriceUsd,
  getMonthlyBudgetUsd,
  getRecipeImageModel,
} from "./config";

test("getRecipeImageModel falls back to the default when unset or blank", () => {
  assert.equal(getRecipeImageModel({}), DEFAULT_RECIPE_IMAGE_MODEL);
  assert.equal(getRecipeImageModel({ RECIPE_IMAGE_MODEL: "   " }), DEFAULT_RECIPE_IMAGE_MODEL);
  assert.equal(
    getRecipeImageModel({ RECIPE_IMAGE_MODEL: "custom-image-model" }),
    "custom-image-model",
  );
});

test("getMonthlyBudgetUsd parses valid numbers and rejects invalid ones", () => {
  assert.equal(getMonthlyBudgetUsd({}), DEFAULT_MONTHLY_BUDGET_USD);
  assert.equal(getMonthlyBudgetUsd({ RECIPE_IMAGE_MONTHLY_BUDGET_USD: "25.5" }), 25.5);
  assert.equal(getMonthlyBudgetUsd({ RECIPE_IMAGE_MONTHLY_BUDGET_USD: "0" }), 0);
  assert.equal(getMonthlyBudgetUsd({ RECIPE_IMAGE_MONTHLY_BUDGET_USD: "abc" }), DEFAULT_MONTHLY_BUDGET_USD);
  assert.equal(getMonthlyBudgetUsd({ RECIPE_IMAGE_MONTHLY_BUDGET_USD: "-5" }), DEFAULT_MONTHLY_BUDGET_USD);
  assert.equal(getMonthlyBudgetUsd({ RECIPE_IMAGE_MONTHLY_BUDGET_USD: "" }), DEFAULT_MONTHLY_BUDGET_USD);
});

test("getImagePriceUsd returns known prices and the most expensive fallback", () => {
  assert.equal(
    getImagePriceUsd("gemini-2.5-flash-image", "live"),
    RECIPE_IMAGE_PRICE_USD["gemini-2.5-flash-image"].live,
  );
  assert.equal(
    getImagePriceUsd("gemini-2.5-flash-image", "batch"),
    RECIPE_IMAGE_PRICE_USD["gemini-2.5-flash-image"].batch,
  );

  const mostExpensiveLive = Math.max(
    ...Object.values(RECIPE_IMAGE_PRICE_USD).map((price) => price.live),
  );
  assert.equal(getImagePriceUsd("unknown-model", "live"), mostExpensiveLive);
});
