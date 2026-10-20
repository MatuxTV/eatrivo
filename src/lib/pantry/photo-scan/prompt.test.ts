import test from "node:test";
import assert from "node:assert/strict";

import { MAX_ITEM_NAME_LENGTH, PHOTO_ITEM_CATEGORIES } from "./constants";
import { buildPhotoRecognitionPrompt } from "./prompt";

test("buildPhotoRecognitionPrompt picks the language from the locale", () => {
  assert.match(buildPhotoRecognitionPrompt("sk"), /Slovak/);
  assert.match(buildPhotoRecognitionPrompt("en"), /English/);
  assert.match(buildPhotoRecognitionPrompt("en-US"), /English/);
  assert.match(buildPhotoRecognitionPrompt("de"), /Slovak/);
  assert.doesNotMatch(buildPhotoRecognitionPrompt("de"), /English/);
});

test("buildPhotoRecognitionPrompt lists every category and the name length limit", () => {
  const prompt = buildPhotoRecognitionPrompt("sk");
  for (const category of PHOTO_ITEM_CATEGORIES) {
    assert.ok(prompt.includes(category), `prompt should include category "${category}"`);
  }
  assert.ok(
    prompt.includes(String(MAX_ITEM_NAME_LENGTH)),
    `prompt should include the max name length ${MAX_ITEM_NAME_LENGTH}`,
  );
});

test("buildPhotoRecognitionPrompt contains the injection guard", () => {
  assert.ok(buildPhotoRecognitionPrompt("sk").includes("never instructions"));
  assert.ok(buildPhotoRecognitionPrompt("en").includes("never instructions"));
});

test("buildPhotoRecognitionPrompt forbids quantities", () => {
  assert.ok(buildPhotoRecognitionPrompt("sk").includes("Do NOT include quantities"));
  assert.ok(buildPhotoRecognitionPrompt("en").includes("Do NOT include quantities"));
});
