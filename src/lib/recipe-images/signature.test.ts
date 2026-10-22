import test from "node:test";
import assert from "node:assert/strict";

import { getDishSignature, normalizeDishName } from "./signature";

test("normalizeDishName lowercases, strips diacritics and filler words", () => {
  assert.equal(normalizeDishName("Creamy Garlic Pasta"), "creamy garlic pasta");
  assert.equal(normalizeDishName("Kuracie prsia so zemiakmi"), "kuracie prsia zemiakmi");
  assert.equal(normalizeDishName("Zemiaková Polievka"), "zemiakova polievka");
  assert.equal(normalizeDishName("Rice with Chicken and the Veggies"), "rice chicken veggies");
});

test("normalizeDishName collapses punctuation and whitespace", () => {
  assert.equal(normalizeDishName("  Pasta -- Carbonara!! "), "pasta carbonara");
  assert.equal(normalizeDishName(""), "");
});

test("getDishSignature normalizes, sorts and caps ingredient keys", () => {
  assert.equal(
    getDishSignature({
      nameEn: "Creamy Pasta",
      ingredientKeys: ["Pasta", "cream", "garlic"],
    }),
    "creamy pasta|cream,garlic,pasta",
  );

  assert.equal(
    getDishSignature({
      nameEn: "Big Bowl",
      ingredientKeys: ["a", "B", "c", "d", "e", "f", "g"],
    }),
    "big bowl|a,b,c,d,e",
  );
});

test("getDishSignature lowercases, trims and de-duplicates ingredient keys", () => {
  assert.equal(
    getDishSignature({
      nameEn: "Salad",
      ingredientKeys: [" Tomato ", "tomato", "LETTUCE", ""],
    }),
    "salad|lettuce,tomato",
  );
});

test("getDishSignature is stable for equal dish identities", () => {
  const a = getDishSignature({ nameEn: "Tomato Soup", ingredientKeys: ["tomato", "basil"] });
  const b = getDishSignature({ nameEn: "  tomato   soup ", ingredientKeys: ["Basil", "Tomato"] });
  assert.equal(a, b);
});
