import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTOS_PER_REQUEST,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_PHOTO_BYTES,
  PHOTO_MAX_EDGE_PX,
} from "./constants";
import {
  fitWithinEdge,
  planPhotoBatches,
  validatePhotoBatch,
  type PhotoFileMeta,
} from "./validate-batch";

function photo(size: number, type = "image/jpeg"): PhotoFileMeta {
  return { size, type };
}

test("validatePhotoBatch reports NO_PHOTOS for an empty batch", () => {
  assert.deepEqual(validatePhotoBatch([]), { code: "NO_PHOTOS" });
});

test("validatePhotoBatch accepts the largest single photo and the biggest fitting batch", () => {
  assert.equal(validatePhotoBatch([photo(MAX_PHOTO_BYTES)]), null);

  const files = Array.from({ length: MAX_PHOTOS_PER_REQUEST }, () => photo(250_000));
  assert.equal(files.length, 15);
  assert.equal(
    files.reduce((sum, file) => sum + file.size, 0),
    3_750_000,
  );
  assert.equal(validatePhotoBatch(files), null);
});

test("validatePhotoBatch rejects more than MAX_PHOTOS_PER_REQUEST photos", () => {
  const files = Array.from({ length: MAX_PHOTOS_PER_REQUEST + 1 }, () => photo(1_000));
  assert.deepEqual(validatePhotoBatch(files), { code: "TOO_MANY_PHOTOS" });
});

test("validatePhotoBatch rejects unsupported MIME types with the offending index", () => {
  assert.deepEqual(validatePhotoBatch([photo(1_000, "image/gif")]), {
    code: "UNSUPPORTED_TYPE",
    index: 0,
  });
  assert.deepEqual(validatePhotoBatch([photo(1_000), photo(1_000, "image/heic"), photo(1_000)]), {
    code: "UNSUPPORTED_TYPE",
    index: 1,
  });
  assert.deepEqual(validatePhotoBatch([photo(1_000, "IMAGE/JPEG")]), {
    code: "UNSUPPORTED_TYPE",
    index: 0,
  });
  assert.deepEqual(validatePhotoBatch([photo(1_000, "")]), {
    code: "UNSUPPORTED_TYPE",
    index: 0,
  });
});

test("validatePhotoBatch accepts every allowed MIME type", () => {
  for (const type of ALLOWED_PHOTO_MIME_TYPES) {
    assert.equal(validatePhotoBatch([photo(1_000, type)]), null, `${type} should be allowed`);
  }
});

test("validatePhotoBatch rejects empty and oversized photos by index", () => {
  assert.deepEqual(validatePhotoBatch([photo(1_000), photo(0)]), {
    code: "EMPTY_PHOTO",
    index: 1,
  });
  assert.deepEqual(validatePhotoBatch([photo(-5)]), { code: "EMPTY_PHOTO", index: 0 });
  assert.deepEqual(validatePhotoBatch([photo(MAX_PHOTO_BYTES + 1)]), {
    code: "PHOTO_TOO_LARGE",
    index: 0,
  });
});

test("validatePhotoBatch checks the type before the size of the same file", () => {
  assert.deepEqual(validatePhotoBatch([photo(MAX_PHOTO_BYTES + 1, "image/gif")]), {
    code: "UNSUPPORTED_TYPE",
    index: 0,
  });
  assert.deepEqual(validatePhotoBatch([photo(0, "image/bmp")]), {
    code: "UNSUPPORTED_TYPE",
    index: 0,
  });
});

test("validatePhotoBatch rejects a batch over the total byte budget", () => {
  const files = [photo(1_400_000), photo(1_400_000), photo(1_400_000)];
  assert.equal(
    files.reduce((sum, file) => sum + file.size, 0),
    4_200_000,
  );
  assert.deepEqual(validatePhotoBatch(files), { code: "BATCH_TOO_LARGE" });
});

test("validatePhotoBatch accepts a batch exactly at the total byte budget", () => {
  const files = [photo(1_500_000), photo(1_500_000), photo(1_000_000)];
  assert.equal(
    files.reduce((sum, file) => sum + file.size, 0),
    MAX_TOTAL_PHOTO_BYTES,
  );
  assert.equal(validatePhotoBatch(files), null);
});

test("validatePhotoBatch reports per-file problems before the batch total", () => {
  assert.deepEqual(
    validatePhotoBatch([photo(1_400_000), photo(1_400_000), photo(1_400_000, "image/gif")]),
    { code: "UNSUPPORTED_TYPE", index: 2 },
  );
});

test("planPhotoBatches keeps small batches in a single batch", () => {
  assert.deepEqual(planPhotoBatches([]), []);
  assert.deepEqual(planPhotoBatches([10, 20, 30]), [[0, 1, 2]]);
});

test("planPhotoBatches splits when the byte budget would overflow", () => {
  assert.deepEqual(
    planPhotoBatches([60, 60, 30], 100, 100),
    [[0], [1, 2]],
  );
});

test("planPhotoBatches does not split a single size over the budget", () => {
  assert.deepEqual(
    planPhotoBatches([1_000], 100, 100),
    [[0]],
  );
  assert.deepEqual(
    planPhotoBatches([1_000, 1_000], 100, 100),
    [[0], [1]],
  );
});

test("planPhotoBatches splits at the exact byte boundary", () => {
  assert.deepEqual(
    planPhotoBatches([50, 50], 100, 10),
    [[0, 1]],
  );
  assert.deepEqual(
    planPhotoBatches([50, 51], 100, 10),
    [[0], [1]],
  );
});

test("planPhotoBatches honours the per-batch photo cap", () => {
  assert.deepEqual(
    planPhotoBatches([1, 1, 1, 1, 1], 1_000, 2),
    [[0, 1], [2, 3], [4]],
  );
  assert.deepEqual(
    planPhotoBatches([1, 1], 1_000, 2),
    [[0, 1]],
  );
});

test("planPhotoBatches fills a batch up to the photo cap when bytes allow", () => {
  const batches = planPhotoBatches(
    Array.from({ length: 16 }, () => 1),
    MAX_TOTAL_PHOTO_BYTES,
    MAX_PHOTOS_PER_REQUEST,
  );
  assert.equal(batches.length, 2);
  assert.equal(batches[0].length, MAX_PHOTOS_PER_REQUEST);
  assert.deepEqual(batches[1], [15]);
});

test("planPhotoBatches uses the default byte budget", () => {
  const sizes = Array.from({ length: 20 }, () => 300_000);
  const batches = planPhotoBatches(sizes);

  assert.deepEqual(batches, [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    [13, 14, 15, 16, 17, 18, 19],
  ]);
  // every index appears exactly once, in order
  assert.deepEqual(
    batches.flat(),
    sizes.map((_, index) => index),
  );
});

test("fitWithinEdge leaves images that already fit untouched", () => {
  assert.deepEqual(fitWithinEdge(800, 600, PHOTO_MAX_EDGE_PX), { width: 800, height: 600 });
  assert.deepEqual(fitWithinEdge(PHOTO_MAX_EDGE_PX, 1_000, PHOTO_MAX_EDGE_PX), {
    width: PHOTO_MAX_EDGE_PX,
    height: 1_000,
  });
  assert.deepEqual(fitWithinEdge(0, 0, PHOTO_MAX_EDGE_PX), { width: 0, height: 0 });
});

test("fitWithinEdge scales the long edge down for landscape and portrait", () => {
  assert.deepEqual(fitWithinEdge(3_000, 2_000, PHOTO_MAX_EDGE_PX), { width: 1_568, height: 1_045 });
  assert.deepEqual(fitWithinEdge(1_000, 4_000, PHOTO_MAX_EDGE_PX), { width: 392, height: 1_568 });
});

test("fitWithinEdge never upscales", () => {
  assert.deepEqual(fitWithinEdge(100, 50, PHOTO_MAX_EDGE_PX), { width: 100, height: 50 });
  assert.deepEqual(fitWithinEdge(1_000, 1_000, PHOTO_MAX_EDGE_PX), { width: 1_000, height: 1_000 });
});

test("fitWithinEdge keeps the aspect ratio with a 1px minimum", () => {
  assert.deepEqual(fitWithinEdge(10_000, 50, PHOTO_MAX_EDGE_PX), { width: 1_568, height: 8 });
  assert.deepEqual(fitWithinEdge(10_000, 1, PHOTO_MAX_EDGE_PX), { width: 1_568, height: 1 });
  assert.deepEqual(fitWithinEdge(4_000, 1_000, 1_000), { width: 1_000, height: 250 });
  assert.deepEqual(fitWithinEdge(5_000, 5_000, 1_000), { width: 1_000, height: 1_000 });
  // a zero edge next to an over-long edge is clamped too, floored at 1px
  assert.deepEqual(fitWithinEdge(0, 5_000, PHOTO_MAX_EDGE_PX), { width: 1, height: 1_568 });
});
