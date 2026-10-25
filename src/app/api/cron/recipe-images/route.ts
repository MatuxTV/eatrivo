import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiLogger } from "@/lib/logger";
import { backfillRecipeImages } from "@/lib/recipe-images/backfill";

export const maxDuration = 300;

const RECIPES_PER_RUN = 20;

// GET /api/cron/recipe-images
// Safety net: fills cover photos that were skipped (budget, failures) or never requested.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await backfillRecipeImages({ limit: RECIPES_PER_RUN, source: "all" });
    apiLogger.info(
      `[cron.recipe-images] ${JSON.stringify(report.counts)} spend=$${report.monthlySpendUsd.toFixed(2)}`,
    );
    return NextResponse.json({ success: true, counts: report.counts, monthlySpendUsd: report.monthlySpendUsd });
  } catch (error) {
    apiLogger.error("[cron.recipe-images] failed", error);
    return NextResponse.json({ error: "Recipe image backfill failed" }, { status: 500 });
  }
}
