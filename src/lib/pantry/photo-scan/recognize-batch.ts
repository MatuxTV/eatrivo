import type { AllowedPhotoMimeType } from "./constants";
import type { PhotoRecognitionResult } from "./merge";
import type { PhotoRecognitionOutput } from "./schema";

export interface PhotoToRecognize {
  index: number;
  mimeType: AllowedPhotoMimeType;
  base64: string;
}

export type PhotoOutcomeStatus = "ok" | "empty" | "unreadable" | "failed";

export interface PhotoOutcome {
  index: number;
  status: PhotoOutcomeStatus;
  itemCount: number;
}

export interface RecognizePhotosOptions {
  photos: PhotoToRecognize[];
  recognizeOne: (photo: PhotoToRecognize) => Promise<PhotoRecognitionOutput>;
  concurrency: number;
  /** extra attempts after the first failure of a single photo */
  maxRetries: number;
  onPhotoError?: (photo: PhotoToRecognize, error: unknown, attempt: number) => void;
}

async function recognizeWithRetry(
  photo: PhotoToRecognize,
  options: RecognizePhotosOptions,
): Promise<PhotoRecognitionOutput | null> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      return await options.recognizeOne(photo);
    } catch (error) {
      options.onPhotoError?.(photo, error, attempt);
    }
  }
  return null;
}

/**
 * Runs one model call per photo with a concurrency cap and per-photo retries.
 * A failing photo never fails the batch: it is reported as `failed`.
 * Outcomes and results are returned in photo index order.
 */
export async function recognizePhotos(
  options: RecognizePhotosOptions,
): Promise<{ results: PhotoRecognitionResult[]; outcomes: PhotoOutcome[] }> {
  const { photos } = options;
  const outputs = new Array<PhotoRecognitionOutput | null>(photos.length).fill(null);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < photos.length) {
      const position = cursor;
      cursor += 1;
      outputs[position] = await recognizeWithRetry(photos[position], options);
    }
  }

  const workerCount = Math.max(1, Math.min(options.concurrency, photos.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const results: PhotoRecognitionResult[] = [];
  const outcomes: PhotoOutcome[] = [];

  photos.forEach((photo, position) => {
    const output = outputs[position];
    if (!output) {
      outcomes.push({ index: photo.index, status: "failed", itemCount: 0 });
      return;
    }
    if (output.unreadable) {
      outcomes.push({ index: photo.index, status: "unreadable", itemCount: 0 });
      return;
    }
    if (output.items.length === 0) {
      outcomes.push({ index: photo.index, status: "empty", itemCount: 0 });
      return;
    }
    outcomes.push({ index: photo.index, status: "ok", itemCount: output.items.length });
    results.push({ photoIndex: photo.index, items: output.items });
  });

  const byIndex = (a: { index: number }, b: { index: number }) => a.index - b.index;
  outcomes.sort(byIndex);
  results.sort((a, b) => a.photoIndex - b.photoIndex);
  return { results, outcomes };
}
