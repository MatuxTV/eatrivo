import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_ITEM_NAME_LENGTH,
  MAX_PHOTOS_PER_REQUEST,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_PHOTO_BYTES,
  MIN_ITEM_CONFIDENCE,
  PHOTO_DAILY_QUOTA,
  PHOTO_ITEM_CATEGORIES,
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_EDGE_PX,
  PHOTO_RECOGNITION_CONCURRENCY,
  PHOTO_RECOGNITION_MAX_RETRIES,
} from "./constants";

test("constants: limits match the spec", () => {
  assert.equal(MAX_PHOTOS_PER_REQUEST, 15);
  assert.equal(MAX_PHOTO_BYTES, 1_500_000);
  assert.equal(MAX_TOTAL_PHOTO_BYTES, 4_000_000);
  assert.equal(PHOTO_RECOGNITION_CONCURRENCY, 4);
  assert.equal(PHOTO_RECOGNITION_MAX_RETRIES, 1);
  assert.equal(MIN_ITEM_CONFIDENCE, 0.4);
  assert.equal(MAX_ITEM_NAME_LENGTH, 80);
});

test("constants: photo budgets stay inside the Vercel body limit", () => {
  // the batch budget is reachable by more than one photo...
  assert.ok(MAX_TOTAL_PHOTO_BYTES > MAX_PHOTO_BYTES);
  // ...but a full request of max-size photos would never fit
  assert.ok(MAX_TOTAL_PHOTO_BYTES < MAX_PHOTO_BYTES * MAX_PHOTOS_PER_REQUEST);
});

test("constants: allowed MIME types are exactly jpeg, png and webp", () => {
  assert.deepEqual([...ALLOWED_PHOTO_MIME_TYPES], ["image/jpeg", "image/png", "image/webp"]);
});

test("constants: daily photo quota is 5 free / 60 paid", () => {
  assert.deepEqual({ ...PHOTO_DAILY_QUOTA }, { free: 5, paid: 60 });
});

test("constants: item categories cover the ten spec categories without duplicates", () => {
  assert.deepEqual(
    [...PHOTO_ITEM_CATEGORIES],
    [
      "dairy",
      "meat_fish",
      "fruit",
      "vegetables",
      "grains",
      "eggs",
      "condiments",
      "beverages",
      "nuts_seeds",
      "other",
    ],
  );
  assert.equal(new Set(PHOTO_ITEM_CATEGORIES).size, PHOTO_ITEM_CATEGORIES.length);
});

test("constants: client-side resize targets match the spec", () => {
  assert.equal(PHOTO_MAX_EDGE_PX, 1568);
  assert.equal(PHOTO_JPEG_QUALITY, 0.82);
});
