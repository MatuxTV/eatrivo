import type { AllowedPhotoMimeType } from "./constants";

/** Verifies the file signature matches the declared MIME type (declared type alone is spoofable). */
export function hasValidImageMagicBytes(bytes: Uint8Array, mimeType: AllowedPhotoMimeType): boolean {
  if (bytes.length < 12) return false;
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mimeType === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  return (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  );
}
