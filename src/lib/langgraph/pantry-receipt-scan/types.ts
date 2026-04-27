import type { PantryBatchInputItem } from "@/lib/langgraph/pantry-batch/types";
import type { ReceiptScanReviewItem } from "@/lib/pantry/receipt-scan-contracts";

export interface ReceiptScanExtractedItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  confidence: number | null;
}

export interface ReceiptScanAiOutput {
  vendor: string | null;
  currency: string | null;
  ignoredLineCount: number;
  unknownLineCount: number;
  items: ReceiptScanExtractedItem[];
}

export interface ReceiptScanGraphInput {
  userId: string;
  userProfileId: string;
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileName: string;
}

export interface ReceiptScanGraphResult {
  items: ReceiptScanReviewItem[];
  vendor: string | null;
  currency: string | null;
  partial: boolean;
  retryCount: number;
  warnings: string[];
}

export function toPantryBatchInputItems(
  items: ReceiptScanReviewItem[],
): PantryBatchInputItem[] {
  return items.map((item) => ({
    name: item.name,
    trackingMode: null,
    inStock: true,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiryDate: item.expiryDate,
  }));
}