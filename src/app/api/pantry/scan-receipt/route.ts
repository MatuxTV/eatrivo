import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildPantryReceiptScanGraph } from "@/lib/langgraph/pantry-receipt-scan";
import { RECEIPT_SCAN_RECURSION_LIMIT } from "@/lib/langgraph/pantry-receipt-scan/constants";
import { apiLogger } from "@/lib/logger";
import { getAuthenticatedPaidPantryContext } from "@/lib/pantry/scan-auth";
import { receiptScanStartResponseSchema } from "@/lib/pantry/receipt-scan-contracts";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { handleApiError, validationError } from "@/lib/safeError";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function isAllowedMimeType(value: string): value is (typeof ALLOWED_MIME_TYPES)[number] {
  return ALLOWED_MIME_TYPES.includes(value as (typeof ALLOWED_MIME_TYPES)[number]);
}

function hasValidMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8;
  }

  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }

  if (mimeType === "image/webp") {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  return false;
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedPaidPantryContext();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { context } = authResult;
  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(req, context.userId),
    "expensive",
  );
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return validationError("Receipt image is required");
    }

    if (!isAllowedMimeType(file.type)) {
      return validationError("Unsupported image type");
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return validationError("Image exceeds upload limits");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 12 || !hasValidMagicBytes(bytes, file.type)) {
      return validationError("Uploaded file is not a valid supported image");
    }

    const graph = buildPantryReceiptScanGraph();
    const result = await graph.invoke(
      {
        userId: context.userId,
        userProfileId: context.userProfileId,
        imageBase64: buffer.toString("base64"),
        mimeType: file.type,
        fileName: file.name || "receipt-upload",
      },
      { recursionLimit: RECEIPT_SCAN_RECURSION_LIMIT },
    );

    if (result.fatalError) {
      return NextResponse.json(
        {
          error: result.fatalError,
          code: result.fatalErrorCode ?? "RECEIPT_SCAN_FAILED",
        },
        { status: 422 },
      );
    }

    const responsePayload = receiptScanStartResponseSchema.parse({
      items: result.reviewItems,
      vendor: result.parsedReceipt?.vendor ?? null,
      currency: result.parsedReceipt?.currency ?? null,
      partial: result.partial,
      retryCount: result.retryCount,
      warnings: result.completenessWarnings,
      lookupOutcome: null,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    apiLogger.error("POST /api/pantry/scan-receipt error", error, {
      metadata: { userId: context.userId },
    });
    return handleApiError(error, "POST /api/pantry/scan-receipt", {
      status: 500,
      code: "PANTRY_RECEIPT_SCAN_FAILED",
    });
  }
}