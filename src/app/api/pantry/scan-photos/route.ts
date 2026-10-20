import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/index";
import { pantryItems } from "@/db/schema";
import { AiConfigError } from "@/lib/ai/model-config";
import { apiLogger } from "@/lib/logger";
import { getPhotoScanContext } from "@/lib/pantry/photo-scan/access";
import {
  PHOTO_RECOGNITION_CONCURRENCY,
  PHOTO_RECOGNITION_MAX_RETRIES,
  type AllowedPhotoMimeType,
} from "@/lib/pantry/photo-scan/constants";
import { hasValidImageMagicBytes } from "@/lib/pantry/photo-scan/magic-bytes";
import { markExistingItems } from "@/lib/pantry/photo-scan/mark-existing";
import { mergePhotoItems } from "@/lib/pantry/photo-scan/merge";
import { dailyPhotoLimit } from "@/lib/pantry/photo-scan/quota";
import { refundPhotoQuota, reservePhotoQuota } from "@/lib/pantry/photo-scan/quota-store";
import { recognizePhotos, type PhotoToRecognize } from "@/lib/pantry/photo-scan/recognize-batch";
import { createPhotoRecognizer } from "@/lib/pantry/photo-scan/recognize-one";
import { validatePhotoBatch } from "@/lib/pantry/photo-scan/validate-batch";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { handleApiError } from "@/lib/safeError";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorJson(code: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: code, code, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  const access = await getPhotoScanContext();
  if (!access.ok) {
    return access.response;
  }
  const { context } = access;

  const rateLimitResult = await checkRateLimit(getRateLimitIdentifier(req, context.userId), "expensive");
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let reserved = 0;
  let refunded = 0;

  try {
    const formData = await req.formData().catch(() => null);
    const files = formData ? formData.getAll("files").filter((entry): entry is File => entry instanceof File) : [];

    const problem = validatePhotoBatch(files.map((file) => ({ size: file.size, type: file.type })));
    if (problem) {
      return errorJson(problem.code, 400, problem.index !== undefined ? { index: problem.index } : {});
    }

    const photos: PhotoToRecognize[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type as AllowedPhotoMimeType;
      if (!hasValidImageMagicBytes(new Uint8Array(buffer), mimeType)) {
        return errorJson("INVALID_IMAGE", 400, { index });
      }
      photos.push({ index, mimeType, base64: buffer.toString("base64") });
    }

    const limit = dailyPhotoLimit(context.isPaid);
    const reservation = await reservePhotoQuota({
      userProfileId: context.userProfileId,
      count: photos.length,
      limit,
    });
    if (!reservation.ok) {
      return errorJson("QUOTA_EXCEEDED", 429, {
        quota: { limit, used: reservation.used, remaining: reservation.remaining, isPaid: context.isPaid },
      });
    }
    reserved = photos.length;

    const recognizeOne = createPhotoRecognizer(context.locale);
    const { results, outcomes } = await recognizePhotos({
      photos,
      recognizeOne,
      concurrency: PHOTO_RECOGNITION_CONCURRENCY,
      maxRetries: PHOTO_RECOGNITION_MAX_RETRIES,
      onPhotoError: (photo, error, attempt) => {
        apiLogger.error("POST /api/pantry/scan-photos photo failed", error, {
          metadata: { userId: context.userId, photoIndex: photo.index, attempt },
        });
      },
    });

    const failedCount = outcomes.filter((outcome) => outcome.status === "failed").length;
    if (failedCount > 0) {
      await refundPhotoQuota({ userProfileId: context.userProfileId, count: failedCount });
      refunded += failedCount;
    }
    if (failedCount === photos.length) {
      return errorJson("ALL_PHOTOS_FAILED", 502);
    }

    const existingRows = await db
      .select({ name: pantryItems.name, ingredientName: pantryItems.ingredientName })
      .from(pantryItems)
      .where(eq(pantryItems.userProfileId, context.userProfileId));

    const items = markExistingItems(mergePhotoItems(results), existingRows);
    const used = reservation.used - failedCount;

    return NextResponse.json({
      items,
      perPhoto: outcomes,
      quota: { limit, used, remaining: Math.max(0, limit - used), isPaid: context.isPaid },
    });
  } catch (error) {
    if (reserved - refunded > 0) {
      await refundPhotoQuota({ userProfileId: context.userProfileId, count: reserved - refunded }).catch(() => undefined);
    }
    if (error instanceof AiConfigError) {
      apiLogger.error("POST /api/pantry/scan-photos AI config error", error, { metadata: { userId: context.userId } });
      return errorJson("AI_UNAVAILABLE", 503);
    }
    apiLogger.error("POST /api/pantry/scan-photos error", error, { metadata: { userId: context.userId } });
    return handleApiError(error, "POST /api/pantry/scan-photos", { status: 500, code: "PANTRY_PHOTO_SCAN_FAILED" });
  }
}