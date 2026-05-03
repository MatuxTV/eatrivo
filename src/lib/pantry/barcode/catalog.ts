import { eq } from "drizzle-orm";

import { db } from "@/index";
import { pantryBarcodeCatalog } from "@/db/schema";
import type { ReceiptScanReviewItem } from "@/lib/pantry/receipt-scan-contracts";

export type PantryBarcodeCatalogSource = "user" | "open_food_facts";

export interface PantryBarcodeCatalogEntryInput {
  barcode: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  brand: string | null;
  source: PantryBarcodeCatalogSource;
  userId?: string | null;
}

export interface PantryBarcodeCatalogEntry {
  barcode: string;
  item: ReceiptScanReviewItem;
  vendor: string | null;
  source: PantryBarcodeCatalogSource;
  warnings: string[];
  partial: boolean;
}

function parseNumericValue(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function findPantryBarcodeCatalogEntry(
  barcode: string,
): Promise<PantryBarcodeCatalogEntry | null> {
  const [record] = await db
    .select()
    .from(pantryBarcodeCatalog)
    .where(eq(pantryBarcodeCatalog.barcode, barcode))
    .limit(1);

  if (!record) {
    return null;
  }

  return {
    barcode: record.barcode,
    item: {
      id: crypto.randomUUID(),
      name: record.name,
      barcode: record.barcode,
      quantity: parseNumericValue(record.quantity),
      unit: record.unit,
      category: record.category,
      expiryDate: null,
      confidence: 0.99,
      source: "detected",
      needsReview: false,
    },
    vendor: record.brand,
    source: record.source,
    warnings: [],
    partial: false,
  };
}

export async function upsertPantryBarcodeCatalogEntry(
  input: PantryBarcodeCatalogEntryInput,
): Promise<void> {
  await db
    .insert(pantryBarcodeCatalog)
    .values({
      barcode: input.barcode,
      name: input.name,
      quantity: input.quantity === null ? null : input.quantity.toString(),
      unit: input.unit,
      category: input.category,
      brand: input.brand,
      source: input.source,
      createdByUserId: input.userId ?? null,
      updatedByUserId: input.userId ?? null,
    })
    .onConflictDoUpdate({
      target: pantryBarcodeCatalog.barcode,
      set: {
        name: input.name,
        quantity: input.quantity === null ? null : input.quantity.toString(),
        unit: input.unit,
        category: input.category,
        brand: input.brand,
        source: input.source,
        updatedByUserId: input.userId ?? null,
        updatedAt: new Date(),
      },
    });
}