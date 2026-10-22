import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { getS3BucketConfig, getS3Client } from "@/lib/storage/s3";

import { RECIPE_IMAGE_SIZES, type RecipeImageSize } from "./config";
import { buildRecipeImageKey } from "./storage-keys";

export interface StoredRecipeImage {
  storageKey: string;
  width: number;
  height: number;
  bytes: number;
}

const CACHE_CONTROL = "public, max-age=31536000, immutable";

async function toWebp(source: Uint8Array, size: number) {
  return sharp(source)
    .resize(size, size, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
}

/** Converts the generated image to the full + thumbnail WebP files and uploads both. */
export async function storeRecipeImage(
  recipeId: string,
  imageId: string,
  source: Uint8Array,
): Promise<StoredRecipeImage> {
  const client = getS3Client();
  const { bucket } = getS3BucketConfig();
  let full: StoredRecipeImage | null = null;

  for (const size of Object.keys(RECIPE_IMAGE_SIZES) as RecipeImageSize[]) {
    const { data, info } = await toWebp(source, RECIPE_IMAGE_SIZES[size]);
    const storageKey = buildRecipeImageKey(recipeId, imageId, size);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: data,
        ContentType: "image/webp",
        CacheControl: CACHE_CONTROL,
      }),
    );

    if (size === "full") {
      full = { storageKey, width: info.width, height: info.height, bytes: info.size };
    }
  }

  return full!;
}
