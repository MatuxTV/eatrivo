import {
  MAX_ITEM_NAME_LENGTH,
  MIN_ITEM_CONFIDENCE,
  type PhotoItemCategory,
} from "./constants";

export interface RecognizedPhotoItem {
  name: string;
  category: PhotoItemCategory;
  confidence: number;
}

export interface PhotoRecognitionResult {
  photoIndex: number;
  items: RecognizedPhotoItem[];
}

export interface MergedPhotoItem {
  name: string;
  category: PhotoItemCategory;
  confidence: number;
  seenInPhotos: number[];
  /** below MIN_ITEM_CONFIDENCE: show as "not sure", unchecked by default */
  lowConfidence: boolean;
}

/** Strips control characters, collapses whitespace, caps length. Model output is untrusted. */
export function sanitizeItemName(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ITEM_NAME_LENGTH)
    .trim();
}

export function normalizeItemKey(value: string): string {
  return sanitizeItemName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Merges per-photo results: same normalized name = same item, keeps the highest confidence
 * (and its category), records every photo it was seen in. Items with an empty name are dropped.
 */
export function mergePhotoItems(results: PhotoRecognitionResult[]): MergedPhotoItem[] {
  const merged = new Map<string, MergedPhotoItem>();

  for (const result of results) {
    for (const item of result.items) {
      const name = sanitizeItemName(item.name);
      const key = normalizeItemKey(name);
      if (!key) continue;

      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          name,
          category: item.category,
          confidence: item.confidence,
          seenInPhotos: [result.photoIndex],
          lowConfidence: item.confidence < MIN_ITEM_CONFIDENCE,
        });
        continue;
      }

      if (!existing.seenInPhotos.includes(result.photoIndex)) {
        existing.seenInPhotos.push(result.photoIndex);
      }
      if (item.confidence > existing.confidence) {
        existing.confidence = item.confidence;
        existing.category = item.category;
        existing.name = name;
        existing.lowConfidence = item.confidence < MIN_ITEM_CONFIDENCE;
      }
    }
  }

  return [...merged.values()].sort(
    (a, b) => Number(a.lowConfidence) - Number(b.lowConfidence) || b.confidence - a.confidence,
  );
}
