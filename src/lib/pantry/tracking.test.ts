import test from "node:test";
import assert from "node:assert/strict";

import {
  isDefaultAvailabilityStaple,
  resolvePantryTrackingMode,
} from "./tracking";

test("resolvePantryTrackingMode treats common spices as availability staples", () => {
  assert.equal(
    resolvePantryTrackingMode({
      name: "Paprika",
      ingredientKey: "paprika",
      ingredientSpecificKey: "smoked-paprika",
      quantity: 50,
      unit: "g",
    }),
    "availability",
  );

  assert.equal(
    resolvePantryTrackingMode({
      name: "Kurkuma",
      ingredientKey: "turmeric",
      ingredientSpecificKey: "turmeric",
    }),
    "availability",
  );

  assert.equal(
    resolvePantryTrackingMode({
      name: "Dried basil",
      ingredientKey: "basil",
      ingredientSpecificKey: "dried-basil",
      quantity: 1,
      unit: "tbsp",
    }),
    "availability",
  );

  assert.equal(
    resolvePantryTrackingMode({
      name: "Chili flake",
      ingredientKey: "chili-flake",
      ingredientSpecificKey: "chili-flake",
      quantity: 0.5,
      unit: "tsp",
    }),
    "availability",
  );

  assert.equal(
    resolvePantryTrackingMode({
      name: "Onion powder",
      ingredientKey: "onion-powder",
      ingredientSpecificKey: "onion-powder",
      quantity: 1,
      unit: "tsp",
    }),
    "availability",
  );
});

test("resolvePantryTrackingMode treats condiments and oils as availability staples", () => {
  assert.equal(
    resolvePantryTrackingMode({
      name: "Tamari",
      ingredientKey: "tamari",
      ingredientSpecificKey: "tamari",
    }),
    "availability",
  );

  assert.equal(
    resolvePantryTrackingMode({
      name: "Sunflower oil",
      ingredientKey: "oil",
      ingredientSpecificKey: "sunflower-oil",
    }),
    "availability",
  );
});

test("isDefaultAvailabilityStaple rejects fresh produce and herb false positives", () => {
  assert.equal(
    isDefaultAvailabilityStaple({
      name: "Bell pepper",
      ingredientKey: "pepper",
      ingredientSpecificKey: "bell-pepper",
    }),
    false,
  );

  assert.equal(
    isDefaultAvailabilityStaple({
      name: "Fresh basil",
      ingredientKey: "basil",
      ingredientSpecificKey: "fresh-basil",
    }),
    false,
  );
});

test("resolvePantryTrackingMode keeps non-staple ingredients quantity-tracked", () => {
  assert.equal(
    resolvePantryTrackingMode({
      name: "Chicken breast",
      ingredientKey: "chicken",
      ingredientSpecificKey: "chicken-breast",
      quantity: 500,
      unit: "g",
    }),
    "quantity",
  );
});