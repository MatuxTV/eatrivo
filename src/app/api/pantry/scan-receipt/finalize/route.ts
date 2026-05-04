import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiLogger } from "@/lib/logger";
import { reportIngredientResolutionFeedback } from "@/lib/feedback/ingredient-resolution-feedback";
import {
  acquirePantryDraftLock,
  appendPantryDrafts,
  getPantryDraftTtlSeconds,
  releasePantryDraftLock,
} from "@/lib/pantry/draft-cache";
import { upsertPantryBarcodeCatalogEntry } from "@/lib/pantry/barcode/catalog";
import { PantryIngredientResolutionError } from "@/lib/pantry/ingredient-resolution";
import { getAuthenticatedPaidPantryContext } from "@/lib/pantry/scan-auth";
import { receiptScanReviewPayloadSchema } from "@/lib/pantry/receipt-scan-contracts";
import {
  normalizePreparedDraftInput,
  preparePantryDrafts,
} from "@/lib/pantry/prepare-drafts";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { handleApiError, validationError } from "@/lib/safeError";
import { toPantryBatchInputItems } from "@/lib/langgraph/pantry-receipt-scan/types";

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
    const payload = receiptScanReviewPayloadSchema.safeParse(
      await req.json().catch(() => null),
    );

    if (!payload.success) {
      return validationError("Invalid receipt review payload");
    }

    const items = normalizePreparedDraftInput(
      toPantryBatchInputItems(payload.data.items),
    );
    if (items.length === 0) {
      return validationError("At least one valid pantry item is required");
    }

    const barcodeCatalogInputs = payload.data.items
      .filter((item) => item.barcode && item.name.trim().length > 0)
      .map((item) => ({
        barcode: item.barcode!.trim(),
        name: item.name.trim(),
        quantity: item.quantity,
        unit: item.quantity ? item.unit ?? null : null,
        category: item.category ?? null,
        brand: payload.data.vendor ?? null,
        source: "user" as const,
        userId: context.userId,
      }));

    for (const barcodeInput of barcodeCatalogInputs) {
      await upsertPantryBarcodeCatalogEntry(barcodeInput);
    }

    const prepared = await preparePantryDrafts({
      userId: context.userId,
      items,
    });

    const lockAcquired = await acquirePantryDraftLock(prepared.userProfileId);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Another pantry draft action is already in progress." },
        { status: 409 },
      );
    }

    try {
      const drafts = await appendPantryDrafts(prepared.userProfileId, prepared.drafts);
      return NextResponse.json(
        {
          drafts,
          addedDrafts: prepared.drafts,
          ttlSeconds: getPantryDraftTtlSeconds(),
        },
        { status: 201 },
      );
    } finally {
      await releasePantryDraftLock(prepared.userProfileId);
    }
  } catch (error) {
    if (error instanceof PantryIngredientResolutionError) {
      const feedbackRecorded = await reportIngredientResolutionFeedback({
        source: "pantry-receipt-finalize",
        rawName: error.rawName,
        locale: "sk",
        userId: context.userId,
        userProfileId: context.userProfileId,
      });

      return NextResponse.json(
        {
          error: "We could not recognize one of the items as a food ingredient.",
          code: "INGREDIENT_RESOLUTION_FAILED",
          feedbackRecorded,
        },
        { status: 422 },
      );
    }

    apiLogger.error("POST /api/pantry/scan-receipt/finalize error", error, {
      metadata: { userId: context.userId },
    });
    return handleApiError(error, "POST /api/pantry/scan-receipt/finalize", {
      status: 500,
      code: "PANTRY_RECEIPT_FINALIZE_FAILED",
    });
  }
}