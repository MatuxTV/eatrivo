import test from "node:test";
import assert from "node:assert/strict";

import { hasValidImageMagicBytes } from "./magic-bytes";

/** Builds a 16-byte buffer and writes the given byte positions. */
function bytesAt(entries: Record<number, number>, length = 16): Uint8Array {
  const bytes = new Uint8Array(length);
  for (const [position, value] of Object.entries(entries)) {
    bytes[Number(position)] = value;
  }
  return bytes;
}

const JPEG = { 0: 0xff, 1: 0xd8 };
const PNG = { 0: 0x89, 1: 0x50, 2: 0x4e, 3: 0x47 };
const RIFF = { 0: 0x52, 1: 0x49, 2: 0x46, 3: 0x46 };
const WEBP = { 8: 0x57, 9: 0x45, 10: 0x42, 11: 0x50 };

test("hasValidImageMagicBytes accepts a JPEG signature and rejects a wrong header", () => {
  assert.equal(hasValidImageMagicBytes(bytesAt(JPEG), "image/jpeg"), true);
  assert.equal(hasValidImageMagicBytes(bytesAt(PNG), "image/jpeg"), false);
  assert.equal(hasValidImageMagicBytes(bytesAt({}), "image/jpeg"), false);
});

test("hasValidImageMagicBytes accepts a PNG signature only for image/png", () => {
  assert.equal(hasValidImageMagicBytes(bytesAt(PNG), "image/png"), true);
  assert.equal(hasValidImageMagicBytes(bytesAt(PNG), "image/jpeg"), false);
});

test("hasValidImageMagicBytes accepts WEBP only when RIFF and WEBP are both present", () => {
  assert.equal(hasValidImageMagicBytes(bytesAt({ ...RIFF, ...WEBP }), "image/webp"), true);
  assert.equal(hasValidImageMagicBytes(bytesAt(RIFF), "image/webp"), false);
});

test("hasValidImageMagicBytes rejects buffers shorter than 12 bytes", () => {
  assert.equal(hasValidImageMagicBytes(bytesAt(JPEG, 11), "image/jpeg"), false);
  assert.equal(hasValidImageMagicBytes(bytesAt({ ...RIFF, ...WEBP }, 11), "image/webp"), false);
  assert.equal(hasValidImageMagicBytes(new Uint8Array(0), "image/jpeg"), false);
});
