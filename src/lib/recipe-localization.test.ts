import test from "node:test";
import assert from "node:assert/strict";

import { resolveIngredientDisplayName } from "./recipe-localization";

test("resolveIngredientDisplayName prefers localized displayName", () => {
  assert.equal(
    resolveIngredientDisplayName(
      {
        displayName: "tofu",
      },
      "firm tofu",
    ),
    "tofu",
  );
});

test("resolveIngredientDisplayName keeps normalized upstream displayName as-is", () => {
  assert.equal(
    resolveIngredientDisplayName(
      {
        displayName: "čedar",
      },
      "cheddar",
    ),
    "čedar",
  );
});

test("resolveIngredientDisplayName falls back to provided fallback name", () => {
  assert.equal(resolveIngredientDisplayName(null, "egg"), "egg");
});