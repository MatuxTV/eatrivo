import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_REQUEST,
  MAX_TOTAL_PHOTO_BYTES,
} from "./constants";

export type PhotoBatchErrorCode =
  | "NO_PHOTOS"
  | "TOO_MANY_PHOTOS"
  | "UNSUPPORTED_TYPE"
  | "PHOTO_TOO_LARGE"
  | "BATCH_TOO_LARGE"
  | "EMPTY_PHOTO";

export interface PhotoFileMeta {
  size: number;
  type: string;
}

/** Returns the first problem found or null when the batch is acceptable. */
export function validatePhotoBatch(
  files: PhotoFileMeta[],
): { code: PhotoBatchErrorCode; index?: number } | null {
  if (files.length === 0) return { code: "NO_PHOTOS" };
  if (files.length > MAX_PHOTOS_PER_REQUEST) return { code: "TOO_MANY_PHOTOS" };

  let total = 0;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!(ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
      return { code: "UNSUPPORTED_TYPE", index };
    }
    if (file.size <= 0) return { code: "EMPTY_PHOTO", index };
    if (file.size > MAX_PHOTO_BYTES) return { code: "PHOTO_TOO_LARGE", index };
    total += file.size;
  }

  if (total > MAX_TOTAL_PHOTO_BYTES) return { code: "BATCH_TOO_LARGE" };
  return null;
}

/**
 * Splits photo sizes into consecutive batches that each stay under the byte budget
 * and the per-request photo cap. Returns arrays of indexes.
 */
export function planPhotoBatches(
  sizes: number[],
  maxTotalBytes: number = MAX_TOTAL_PHOTO_BYTES,
  maxPerBatch: number = MAX_PHOTOS_PER_REQUEST,
): number[][] {
  const batches: number[][] = [];
  let current: number[] = [];
  let currentBytes = 0;

  sizes.forEach((size, index) => {
    const wouldOverflow =
      current.length > 0 && (currentBytes + size > maxTotalBytes || current.length >= maxPerBatch);
    if (wouldOverflow) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(index);
    currentBytes += size;
  });

  if (current.length > 0) batches.push(current);
  return batches;
}

/** Scales (width, height) down so the long edge is at most maxEdge; never upscales. */
export function fitWithinEdge(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge || longEdge <= 0) return { width, height };
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
