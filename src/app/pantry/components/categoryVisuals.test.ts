import test from "node:test";
import assert from "node:assert/strict";

import { getCategoryTint, splitCategoryLabel } from "./categoryVisuals";

test("splitCategoryLabel separates the leading emoji from the category name", () => {
  assert.deepEqual(splitCategoryLabel("🌾 Obilniny & pečivo"), {
    emoji: "🌾",
    name: "Obilniny & pečivo",
  });
  assert.deepEqual(splitCategoryLabel("🥛 Mliečne výrobky"), {
    emoji: "🥛",
    name: "Mliečne výrobky",
  });
});

test("splitCategoryLabel keeps a label without emoji as the name", () => {
  assert.deepEqual(splitCategoryLabel("Fresh herbs"), {
    emoji: null,
    name: "Fresh herbs",
  });
  assert.deepEqual(splitCategoryLabel("  Ostatné "), {
    emoji: null,
    name: "Ostatné",
  });
});

test("getCategoryTint returns a tint per known category and a fallback otherwise", () => {
  assert.equal(getCategoryTint("dairy"), "bg-[#EFE3FF]");
  assert.equal(getCategoryTint("unknown_category"), "bg-[#F6EDFF]");
});
