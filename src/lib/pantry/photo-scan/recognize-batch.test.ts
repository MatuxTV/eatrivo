import test from "node:test";
import assert from "node:assert/strict";

import type { PhotoRecognitionOutput } from "./schema";
import { recognizePhotos, type PhotoToRecognize } from "./recognize-batch";

function photo(index: number): PhotoToRecognize {
  return { index, mimeType: "image/jpeg", base64: "x" };
}

function output(itemCount: number, unreadable = false): PhotoRecognitionOutput {
  return {
    unreadable,
    items: Array.from({ length: itemCount }, (_, item) => ({
      name: `Item ${item}`,
      category: "other" as const,
      confidence: 0.9,
    })),
  };
}

test("recognizePhotos reports one item per photo and sorts results by photoIndex", async () => {
  const result = await recognizePhotos({
    photos: [photo(0), photo(1), photo(2)],
    recognizeOne: async () => output(1),
    concurrency: 2,
    maxRetries: 0,
  });

  assert.deepEqual(result.outcomes, [
    { index: 0, status: "ok", itemCount: 1 },
    { index: 1, status: "ok", itemCount: 1 },
    { index: 2, status: "ok", itemCount: 1 },
  ]);
  assert.equal(result.results.length, 3);
  assert.deepEqual(result.results.map((entry) => entry.photoIndex), [0, 1, 2]);
});

test("recognizePhotos separates unreadable photos from empty ones", async () => {
  const result = await recognizePhotos({
    photos: [photo(0), photo(1), photo(2)],
    recognizeOne: async (target) => {
      if (target.index === 1) return { unreadable: true, items: [] };
      if (target.index === 2) return { unreadable: false, items: [] };
      return output(1);
    },
    concurrency: 3,
    maxRetries: 0,
  });

  assert.deepEqual(result.outcomes, [
    { index: 0, status: "ok", itemCount: 1 },
    { index: 1, status: "unreadable", itemCount: 0 },
    { index: 2, status: "empty", itemCount: 0 },
  ]);
  assert.deepEqual(result.results.map((entry) => entry.photoIndex), [0]);
});

test("recognizePhotos retries a photo that fails once and reports the first attempt", async () => {
  let calls = 0;
  const errors: Array<{ index: number; attempt: number }> = [];

  const result = await recognizePhotos({
    photos: [photo(0)],
    recognizeOne: async () => {
      calls += 1;
      if (calls === 1) throw new Error("boom");
      return output(1);
    },
    concurrency: 1,
    maxRetries: 1,
    onPhotoError: (target, _error, attempt) => {
      errors.push({ index: target.index, attempt });
    },
  });

  assert.equal(calls, 2);
  assert.deepEqual(result.outcomes, [{ index: 0, status: "ok", itemCount: 1 }]);
  assert.deepEqual(errors, [{ index: 0, attempt: 0 }]);
});

test("recognizePhotos reports a permanently failing photo without failing the batch", async () => {
  let failingCalls = 0;

  const result = await recognizePhotos({
    photos: [photo(0), photo(1)],
    recognizeOne: async (target) => {
      if (target.index === 0) {
        failingCalls += 1;
        throw new Error("always fails");
      }
      return output(1);
    },
    concurrency: 2,
    maxRetries: 1,
  });

  assert.equal(failingCalls, 2);
  assert.deepEqual(result.outcomes, [
    { index: 0, status: "failed", itemCount: 0 },
    { index: 1, status: "ok", itemCount: 1 },
  ]);
  assert.deepEqual(result.results.map((entry) => entry.photoIndex), [1]);
});

test("recognizePhotos never exceeds the concurrency cap", async () => {
  let running = 0;
  let maxRunning = 0;

  const result = await recognizePhotos({
    photos: Array.from({ length: 6 }, (_, index) => photo(index)),
    recognizeOne: async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return output(1);
    },
    concurrency: 2,
    maxRetries: 0,
  });

  assert.ok(maxRunning <= 2, `expected max concurrency <= 2, saw ${maxRunning}`);
  assert.ok(maxRunning > 1, `expected max concurrency > 1, saw ${maxRunning}`);
  assert.equal(result.outcomes.length, 6);
});

test("recognizePhotos handles concurrency above the photo count", async () => {
  const result = await recognizePhotos({
    photos: [photo(0), photo(1)],
    recognizeOne: async () => output(1),
    concurrency: 10,
    maxRetries: 0,
  });

  assert.deepEqual(result.outcomes, [
    { index: 0, status: "ok", itemCount: 1 },
    { index: 1, status: "ok", itemCount: 1 },
  ]);
  assert.equal(result.results.length, 2);
});

test("recognizePhotos returns empty arrays when there are no photos", async () => {
  let calls = 0;

  const result = await recognizePhotos({
    photos: [],
    recognizeOne: async () => {
      calls += 1;
      return output(1);
    },
    concurrency: 3,
    maxRetries: 1,
  });

  assert.equal(calls, 0);
  assert.deepEqual(result, { results: [], outcomes: [] });
});

test("recognizePhotos sorts outcomes by index regardless of the input order", async () => {
  const result = await recognizePhotos({
    photos: [photo(2), photo(0), photo(1)],
    recognizeOne: async (target) => output(target.index + 1),
    concurrency: 3,
    maxRetries: 0,
  });

  assert.deepEqual(result.outcomes.map((entry) => entry.index), [0, 1, 2]);
  assert.deepEqual(
    result.outcomes.map((entry) => entry.itemCount),
    [1, 2, 3],
  );
  assert.deepEqual(result.results.map((entry) => entry.photoIndex), [0, 1, 2]);
});
