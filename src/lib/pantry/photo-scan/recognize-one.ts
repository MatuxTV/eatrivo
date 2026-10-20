import "server-only";

import { HumanMessage } from "@langchain/core/messages";

import { getChatModel } from "@/lib/ai/models";
import { buildImageContentBlock } from "@/lib/ai/image-content";
import { invokeStructured } from "@/lib/ai/structured-output";

import { buildPhotoRecognitionPrompt } from "./prompt";
import type { PhotoToRecognize } from "./recognize-batch";
import { photoRecognitionOutputSchema, type PhotoRecognitionOutput } from "./schema";

/** Builds the per-photo recognizer used by `recognizePhotos` (one structured model call per photo). */
export function createPhotoRecognizer(locale: string) {
  const { model } = getChatModel("photoRecognition");
  const prompt = buildPhotoRecognitionPrompt(locale);

  return async function recognizeOne(photo: PhotoToRecognize): Promise<PhotoRecognitionOutput> {
    const result = await invokeStructured({
      model,
      schema: photoRecognitionOutputSchema,
      name: "list_pantry_items",
      messages: [
        new HumanMessage({
          content: [
            buildImageContentBlock(photo.base64, photo.mimeType),
            { type: "text", text: prompt },
          ],
        }),
      ],
    });
    if (!result.parsed) {
      throw new Error("Photo recognition returned an invalid result.");
    }
    return result.parsed;
  };
}