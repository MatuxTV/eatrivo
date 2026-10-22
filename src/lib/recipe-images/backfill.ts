import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/pool";
import { recipes } from "@/db/schema";

import { getMonthlySpendUsd } from "./budget-store";
import { ensureRecipeImage, type EnsureRecipeImageResult } from "./service";

export type BackfillSource = "catalog" | "ai_custom" | "all";

export interface BackfillOptions {
  limit: number;
  source?: BackfillSource;
  concurrency?: number;
  dryRun?: boolean;
}

export interface BackfillReport {
  results: { recipeId: string; slug: string; result: EnsureRecipeImageResult }[];
  counts: Record<string, number>;
  monthlySpendUsd: number;
}

/** Fills missing cover photos for up to `limit` recipes (oldest first). */
export async function backfillRecipeImages({
  limit,
  source = "catalog",
  concurrency = 2,
  dryRun = false,
}: BackfillOptions): Promise<BackfillReport> {
  const rows = await db
    .select({ id: recipes.id, slug: recipes.slug })
    .from(recipes)
    .where(
      and(
        isNull(recipes.coverImageId),
        source === "all" ? undefined : eq(recipes.source, source),
      ),
    )
    .orderBy(asc(recipes.createdAt))
    .limit(Math.max(0, limit));

  const results: BackfillReport["results"] = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < rows.length) {
      const row = rows[cursor++]!;
      const result = await ensureRecipeImage(row.id, { mode: "live", dryRun });
      results.push({ recipeId: row.id, slug: row.slug, result });

      // Stop early once the budget is spent instead of hammering every row.
      if (result.status === "skipped" && result.reason === "budget") {
        cursor = rows.length;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  const counts: Record<string, number> = {};
  for (const { result } of results) {
    const key = result.status === "skipped" ? `skipped:${result.reason}` : result.status;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return { results, counts, monthlySpendUsd: await getMonthlySpendUsd() };
}
