import { z } from "zod";

import { MAX_ITEM_NAME_LENGTH, PHOTO_ITEM_CATEGORIES } from "./constants";

/** What the vision model must return for ONE photo. */
export const photoRecognitionOutputSchema = z.object({
  unreadable: z.boolean(),
  items: z.array(
    z.object({
      name: z.string().min(1).max(MAX_ITEM_NAME_LENGTH * 2),
      category: z.enum(PHOTO_ITEM_CATEGORIES),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

export type PhotoRecognitionOutput = z.infer<typeof photoRecognitionOutputSchema>;
