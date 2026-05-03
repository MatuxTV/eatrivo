import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiLogger } from "@/lib/logger";
import {
  lookupOpenFoodFactsBarcode,
  resolvePantryBarcodeLocale,
} from "@/lib/pantry/barcode/openFoodFacts";
import {
  findPantryBarcodeCatalogEntry,
  upsertPantryBarcodeCatalogEntry,
} from "@/lib/pantry/barcode/catalog";
import { getAuthenticatedPaidPantryContext } from "@/lib/pantry/scan-auth";
import { receiptScanStartResponseSchema } from "@/lib/pantry/receipt-scan-contracts";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { handleApiError, validationError } from "@/lib/safeError";

const barcodeLookupSchema = z.object({
  barcode: z.string().trim().min(8).max(32),
});

function normalizeBarcode(rawBarcode: string): string {
  return rawBarcode.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedPaidPantryContext();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { context } = authResult;
  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(req, context.userId),
    "pantry",
  );
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const payload = barcodeLookupSchema.safeParse(
      await req.json().catch(() => null),
    );

    if (!payload.success) {
      return validationError("Invalid barcode payload");
    }

    const barcode = normalizeBarcode(payload.data.barcode);
    if (!/^\d{8,14}$/.test(barcode)) {
      return validationError("Invalid barcode format");
    }

    const locale = resolvePantryBarcodeLocale(req.headers.get("accept-language"));
    const localMatch = await findPantryBarcodeCatalogEntry(barcode);
    const lookup = localMatch ?? (await lookupOpenFoodFactsBarcode(barcode, locale));

    if (!localMatch && lookup.source === "open_food_facts") {
      await upsertPantryBarcodeCatalogEntry({
        barcode,
        name: lookup.item.name,
        quantity: lookup.item.quantity,
        unit: lookup.item.unit,
        category: lookup.item.category,
        brand: lookup.vendor,
        source: "open_food_facts",
        userId: context.userId,
      });
    }

    const responsePayload = receiptScanStartResponseSchema.parse({
      items: [lookup.item],
      vendor: lookup.vendor,
      currency: null,
      partial: lookup.partial,
      retryCount: 0,
      warnings: lookup.warnings,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    apiLogger.error("POST /api/pantry/scan-barcode error", error, {
      metadata: { userId: context.userId },
    });
    return handleApiError(error, "POST /api/pantry/scan-barcode", {
      status: 500,
      code: "PANTRY_BARCODE_SCAN_FAILED",
    });
  }
}