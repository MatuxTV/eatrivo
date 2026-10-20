export const MAX_PHOTOS_PER_REQUEST = 15;
/** per photo after client-side resize */
export const MAX_PHOTO_BYTES = 1_500_000;
/** whole multipart body (Vercel rejects ~4.5 MB) */
export const MAX_TOTAL_PHOTO_BYTES = 4_000_000;
export const PHOTO_RECOGNITION_CONCURRENCY = 4;
export const PHOTO_RECOGNITION_MAX_RETRIES = 1;
export const MIN_ITEM_CONFIDENCE = 0.4;
export const MAX_ITEM_NAME_LENGTH = 80;
export const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedPhotoMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

export const PHOTO_DAILY_QUOTA = { free: 5, paid: 60 } as const;

export const PHOTO_ITEM_CATEGORIES = [
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
] as const;
export type PhotoItemCategory = (typeof PHOTO_ITEM_CATEGORIES)[number];

/** client-side resize target */
export const PHOTO_MAX_EDGE_PX = 1568;
export const PHOTO_JPEG_QUALITY = 0.82;
