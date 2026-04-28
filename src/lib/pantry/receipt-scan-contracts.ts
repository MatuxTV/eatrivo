import { z } from "zod";

export const receiptScanReviewItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  quantity: z.number().finite().positive().nullable(),
  unit: z.string().trim().max(40).nullable(),
  category: z.string().trim().max(80).nullable(),
  expiryDate: z.string().trim().max(40).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  source: z.enum(["detected", "manual"]),
  needsReview: z.boolean(),
});

export const receiptScanReviewPayloadSchema = z.object({
  items: z.array(receiptScanReviewItemSchema).min(1).max(40),
  vendor: z.string().trim().max(120).nullable().optional(),
  currency: z.string().trim().max(12).nullable().optional(),
  partial: z.boolean().default(false),
});

export const receiptScanStartResponseSchema = z.object({
  items: z.array(receiptScanReviewItemSchema),
  vendor: z.string().trim().max(120).nullable(),
  currency: z.string().trim().max(12).nullable(),
  partial: z.boolean(),
  retryCount: z.number().int().min(0),
  warnings: z.array(z.string().min(1)).default([]),
});

export type ReceiptScanReviewItem = z.infer<typeof receiptScanReviewItemSchema>;
export type ReceiptScanReviewPayload = z.infer<typeof receiptScanReviewPayloadSchema>;
export type ReceiptScanStartResponse = z.infer<typeof receiptScanStartResponseSchema>;