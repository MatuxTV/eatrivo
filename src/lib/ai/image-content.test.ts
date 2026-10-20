import { test } from "node:test";
import assert from "node:assert/strict";

import { buildImageContentBlock } from "./image-content";

test("buildImageContentBlock returns a portable data URL image block", () => {
  assert.deepEqual(buildImageContentBlock("AAA", "image/jpeg"), {
    type: "image_url",
    image_url: { url: "data:image/jpeg;base64,AAA" },
  });
});
