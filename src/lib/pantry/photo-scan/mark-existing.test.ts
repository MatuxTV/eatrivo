import test from "node:test";
import assert from "node:assert/strict";

import { type MergedPhotoItem } from "./merge";
import { markExistingItems, type ExistingPantryName } from "./mark-existing";

function item(name: string): MergedPhotoItem {
  return {
    name,
    category: "other",
    confidence: 0.9,
    seenInPhotos: [0],
    lowConfidence: false,
  };
}

test("empty items returns an empty array", () => {
  assert.deepEqual(markExistingItems([], []), []);
  assert.deepEqual(markExistingItems([], [{ name: "Mäso", ingredientName: null }]), []);
});

test("empty existing pantry leaves every item unflagged", () => {
  const result = markExistingItems([item("mlieko"), item("maso")], []);

  assert.equal(result.length, 2);
  assert.equal(result[0]?.alreadyInPantry, false);
  assert.equal(result[1]?.alreadyInPantry, false);
});

test("assigns photo-0, photo-1, ... ids in order", () => {
  const result = markExistingItems([item("mlieko"), item("maso"), item("chlieb")], []);

  assert.deepEqual(
    result.map((entry) => entry.id),
    ["photo-0", "photo-1", "photo-2"],
  );
});

test("matches by pantry row name, ignoring case, diacritics and extra spaces", () => {
  const existing: ExistingPantryName[] = [{ name: " Mäso  ", ingredientName: null }];

  const result = markExistingItems([item("maso")], existing);

  assert.equal(result[0]?.alreadyInPantry, true);
});

test("matches by ingredientName", () => {
  const existing: ExistingPantryName[] = [{ name: "Bio mlieko 1l", ingredientName: "Mlieko" }];

  const result = markExistingItems([item("mlieko")], existing);

  assert.equal(result[0]?.alreadyInPantry, true);
});

test("non-matching items stay false and original fields are preserved", () => {
  const original = item("jablko");
  const existing: ExistingPantryName[] = [{ name: "Mäso", ingredientName: "Mlieko" }];

  const [result] = markExistingItems([original], existing);

  assert.ok(result);
  assert.equal(result.alreadyInPantry, false);
  assert.equal(result.name, original.name);
  assert.equal(result.category, original.category);
  assert.equal(result.confidence, original.confidence);
  assert.deepEqual(result.seenInPhotos, original.seenInPhotos);
  assert.equal(result.lowConfidence, original.lowConfidence);
  assert.equal(result.id, "photo-0");
});

test("an existing row with a blank name and no ingredient does not flag everything", () => {
  const existing: ExistingPantryName[] = [
    { name: "", ingredientName: null },
    { name: "   ", ingredientName: null },
  ];

  const result = markExistingItems([item("mlieko"), item("maso")], existing);

  assert.equal(result[0]?.alreadyInPantry, false);
  assert.equal(result[1]?.alreadyInPantry, false);
});