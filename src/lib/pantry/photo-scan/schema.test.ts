import test from "node:test";
import assert from "node:assert/strict";

import { MAX_ITEM_NAME_LENGTH, PHOTO_ITEM_CATEGORIES } from "./constants";
import { photoRecognitionOutputSchema } from "./schema";

test("photoRecognitionOutputSchema accepts an unreadable photo with no items", () => {
  assert.deepEqual(photoRecognitionOutputSchema.parse({ unreadable: true, items: [] }), {
    unreadable: true,
    items: [],
  });
});

test("photoRecognitionOutputSchema accepts every category", () => {
  for (const category of PHOTO_ITEM_CATEGORIES) {
    const parsed = photoRecognitionOutputSchema.parse({
      unreadable: false,
      items: [{ name: "Item", category, confidence: 0.5 }],
    });
    assert.equal(parsed.items[0].category, category);
  }
});

test("photoRecognitionOutputSchema accepts the name and confidence boundaries", () => {
  const parsed = photoRecognitionOutputSchema.parse({
    unreadable: false,
    items: [
      { name: "a", category: "other", confidence: 0 },
      { name: "x".repeat(MAX_ITEM_NAME_LENGTH * 2), category: "other", confidence: 1 },
    ],
  });

  assert.equal(parsed.items[0].confidence, 0);
  assert.equal(parsed.items[1].name.length, MAX_ITEM_NAME_LENGTH * 2);
  assert.equal(parsed.items[1].confidence, 1);
});

test("photoRecognitionOutputSchema strips unknown model fields", () => {
  assert.deepEqual(
    photoRecognitionOutputSchema.parse({
      unreadable: false,
      note: "ignore me",
      items: [{ name: "Milk", category: "dairy", confidence: 0.9, boundingBox: [1, 2, 3, 4] }],
    }),
    {
      unreadable: false,
      items: [{ name: "Milk", category: "dairy", confidence: 0.9 }],
    },
  );
});

test("photoRecognitionOutputSchema rejects malformed model output", () => {
  const invalid: unknown[] = [
    {},
    { unreadable: false },
    { items: [] },
    { unreadable: "no", items: [] },
    { unreadable: false, items: [{ name: "", category: "other", confidence: 0.5 }] },
    {
      unreadable: false,
      items: [
        {
          name: "x".repeat(MAX_ITEM_NAME_LENGTH * 2 + 1),
          category: "other",
          confidence: 0.5,
        },
      ],
    },
    { unreadable: false, items: [{ name: "Item", category: "snacks", confidence: 0.5 }] },
    { unreadable: false, items: [{ name: "Item", category: "other", confidence: -0.01 }] },
    { unreadable: false, items: [{ name: "Item", category: "other", confidence: 1.01 }] },
    { unreadable: false, items: [{ name: "Item", category: "other", confidence: "0.5" }] },
    { unreadable: false, items: [{ name: "Item", category: "other" }] },
    { unreadable: false, items: {} },
    { unreadable: false, items: [{ name: "Item", category: "other", confidence: Number.NaN }] },
  ];

  for (const value of invalid) {
    const result = photoRecognitionOutputSchema.safeParse(value);
    assert.equal(result.success, false, `expected rejection for ${JSON.stringify(value)}`);
  }
});
