import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isAuthError, requireAdminAuth } from "@/lib/auth/adminAuth";
import { backfillRecipeImages } from "@/lib/recipe-images/backfill";

export const maxDuration = 300;

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(3),
  source: z.enum(["catalog", "ai_custom", "all"]).default("catalog"),
  dryRun: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

// POST /api/admin/recipe-images/backfill?limit=3&source=catalog&dryRun=true
// Generates missing recipe cover photos on the server (where R2 credentials live).
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(["admin"]);
  if (isAuthError(authResult)) {
    return authResult;
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }

  const report = await backfillRecipeImages({ ...parsed.data, concurrency: 2 });
  return NextResponse.json({ success: true, ...report });
}
