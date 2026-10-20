import test from "node:test";
import assert from "node:assert/strict";

import { MAX_ITEM_NAME_LENGTH, MIN_ITEM_CONFIDENCE, type PhotoItemCategory } from "./constants";
import {
  mergePhotoItems,
  normalizeItemKey,
  sanitizeItemName,
  type RecognizedPhotoItem,
} from "./merge";

function item(name: string, category: PhotoItemCategory, confidence: number): RecognizedPhotoItem {
  return { name, category, confidence };
}

test("sanitizeItemName strips control characters and collapses whitespace", () => {
  assert.equal(sanitizeItemName("  Greek   yogurt \t"), "Greek yogurt");
  assert.equal(sanitizeItemName("Milk\u0000Powder"), "Milk Powder");
  assert.equal(sanitizeItemName("line\nbreak\r\nhere"), "line break here");
  assert.equal(sanitizeItemName("\u007fdel\u009f"), "del");
});

test("sanitizeItemName caps the name at MAX_ITEM_NAME_LENGTH characters", () => {
  assert.equal(sanitizeItemName("a".repeat(200)), "a".repeat(MAX_ITEM_NAME_LENGTH));
  assert.equal(sanitizeItemName("a".repeat(200)).length, MAX_ITEM_NAME_LENGTH);
  // the cut can leave a trailing space, which is trimmed away again
  assert.equal(
    sanitizeItemName(`${"a".repeat(MAX_ITEM_NAME_LENGTH - 1)} bcd`),
    "a".repeat(MAX_ITEM_NAME_LENGTH - 1),
  );
});

test("sanitizeItemName returns an empty string for blank input", () => {
  assert.equal(sanitizeItemName(""), "");
  assert.equal(sanitizeItemName("   \t\n  "), "");
  assert.equal(sanitizeItemName("\u0000\u001f"), "");
});

test("normalizeItemKey lowercases, strips diacritics and collapses whitespace", () => {
  assert.equal(normalizeItemKey("  Greek Yogurt  "), "greek yogurt");
  assert.equal(normalizeItemKey("Cibuľa"), "cibula");
  assert.equal(normalizeItemKey("cibula"), "cibula");
  assert.equal(normalizeItemKey("Káva mletá"), "kava mleta");
  assert.equal(normalizeItemKey("MIGNON"), "mignon");
});

test("normalizeItemKey keeps genuinely different items apart", () => {
  assert.notEqual(normalizeItemKey("Mlieko"), normalizeItemKey("Mlieka"));
  assert.notEqual(normalizeItemKey("Ryža"), normalizeItemKey("Ryba"));
  assert.equal(normalizeItemKey(""), "");
  assert.equal(normalizeItemKey("   "), "");
});

test("mergePhotoItems returns an empty array for no results", () => {
  assert.deepEqual(mergePhotoItems([]), []);
});

test("mergePhotoItems returns single-photo items with their photo index", () => {
  assert.deepEqual(mergePhotoItems([{ photoIndex: 0, items: [item("Milk", "dairy", 0.9)] }]), [
    {
      name: "Milk",
      category: "dairy",
      confidence: 0.9,
      seenInPhotos: [0],
      lowConfidence: false,
    },
  ]);
});

test("mergePhotoItems treats case/diacritic/whitespace variants as the same item", () => {
  const merged = mergePhotoItems([
    { photoIndex: 0, items: [item("Cibuľa", "vegetables", 0.55)] },
    { photoIndex: 1, items: [item("cibula", "fruit", 0.92)] },
    { photoIndex: 2, items: [item("  CIBUĽA ", "other", 0.7)] },
  ]);

  assert.deepEqual(merged, [
    {
      name: "cibula",
      category: "fruit",
      confidence: 0.92,
      seenInPhotos: [0, 1, 2],
      lowConfidence: false,
    },
  ]);
});

test("mergePhotoItems keeps the highest confidence and the matching category", () => {
  const merged = mergePhotoItems([
    { photoIndex: 0, items: [item("Bread", "grains", 0.81)] },
    { photoIndex: 1, items: [item("bread", "other", 0.42)] },
    { photoIndex: 2, items: [item("Bread", "condiments", 0.97)] },
  ]);

  assert.deepEqual(merged, [
    {
      name: "Bread",
      category: "condiments",
      confidence: 0.97,
      seenInPhotos: [0, 1, 2],
      lowConfidence: false,
    },
  ]);
});

test("mergePhotoItems keeps the first entry when confidences tie", () => {
  const merged = mergePhotoItems([
    { photoIndex: 0, items: [item("Eggs", "eggs", 0.7)] },
    { photoIndex: 3, items: [item("eggs", "other", 0.7)] },
  ]);

  assert.deepEqual(merged, [
    {
      name: "Eggs",
      category: "eggs",
      confidence: 0.7,
      seenInPhotos: [0, 3],
      lowConfidence: false,
    },
  ]);
});

test("mergePhotoItems records each photo index only once", () => {
  const merged = mergePhotoItems([
    { photoIndex: 4, items: [item("Milk", "dairy", 0.6), item("milk", "other", 0.5)] },
    { photoIndex: 4, items: [item("MILK", "beverages", 0.8)] },
  ]);

  assert.deepEqual(merged, [
    {
      name: "MILK",
      category: "beverages",
      confidence: 0.8,
      seenInPhotos: [4],
      lowConfidence: false,
    },
  ]);
});

test("mergePhotoItems drops items whose name is blank after sanitizing", () => {
  const merged = mergePhotoItems([
    {
      photoIndex: 0,
      items: [
        item("", "other", 0.99),
        item("   ", "other", 0.99),
        item("\u0000\u0001", "other", 0.99),
        item("Salt", "condiments", 0.9),
      ],
    },
  ]);

  assert.deepEqual(merged, [
    {
      name: "Salt",
      category: "condiments",
      confidence: 0.9,
      seenInPhotos: [0],
      lowConfidence: false,
    },
  ]);
});

test("mergePhotoItems flags and clears low confidence around MIN_ITEM_CONFIDENCE", () => {
  const merged = mergePhotoItems([
    {
      photoIndex: 0,
      items: [
        item("Mystery sauce", "condiments", MIN_ITEM_CONFIDENCE - 0.05),
        item("Yoghurt", "dairy", MIN_ITEM_CONFIDENCE),
      ],
    },
    { photoIndex: 1, items: [item("mystery sauce", "condiments", 0.6)] },
    { photoIndex: 2, items: [item("Maybe ham", "meat_fish", 0.1)] },
  ]);

  assert.deepEqual(merged, [
    {
      name: "mystery sauce",
      category: "condiments",
      confidence: 0.6,
      seenInPhotos: [0, 1],
      lowConfidence: false,
    },
    {
      name: "Yoghurt",
      category: "dairy",
      confidence: MIN_ITEM_CONFIDENCE,
      seenInPhotos: [0],
      lowConfidence: false,
    },
    {
      name: "Maybe ham",
      category: "meat_fish",
      confidence: 0.1,
      seenInPhotos: [2],
      lowConfidence: true,
    },
  ]);
});

test("mergePhotoItems sorts confident items first by confidence, unsure ones last", () => {
  const merged = mergePhotoItems([
    {
      photoIndex: 0,
      items: [
        item("Low b", "other", 0.2),
        item("High", "other", 0.95),
        item("Mid", "other", 0.6),
        item("Low a", "other", 0.39),
      ],
    },
  ]);

  assert.deepEqual(
    merged.map((entry) => entry.name),
    ["High", "Mid", "Low a", "Low b"],
  );
});
