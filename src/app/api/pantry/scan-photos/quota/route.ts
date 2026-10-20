import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPhotoScanContext } from "@/lib/pantry/photo-scan/access";
import { dailyPhotoLimit, remainingPhotoQuota } from "@/lib/pantry/photo-scan/quota";
import { getPhotoQuotaUsed } from "@/lib/pantry/photo-scan/quota-store";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { handleApiError } from "@/lib/safeError";

export async function GET(req: NextRequest) {
  const access = await getPhotoScanContext();
  if (!access.ok) {
    return access.response;
  }
  const { context } = access;

  const rateLimitResult = await checkRateLimit(getRateLimitIdentifier(req, context.userId), "pantry");
  if (!rateLimitResult.success) {
    return rateLimitResult.response ?? NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const limit = dailyPhotoLimit(context.isPaid);
    const used = await getPhotoQuotaUsed(context.userProfileId);
    return NextResponse.json({ limit, used, remaining: remainingPhotoQuota(limit, used), isPaid: context.isPaid });
  } catch (error) {
    return handleApiError(error, "GET /api/pantry/scan-photos/quota", { status: 500, code: "PANTRY_PHOTO_QUOTA_FAILED" });
  }
}