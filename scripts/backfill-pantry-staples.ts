import "dotenv/config";

import { eq } from "drizzle-orm";

import { pantryItems } from "../src/db/schema";
import { db } from "../src/index";
import { resolvePantryTrackingMode } from "../src/lib/pantry/tracking";

type PantryBackfillRow = {
  id: string;
  name: string;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  trackingMode: "quantity" | "availability";
  quantity: string | null;
  unit: string | null;
};

async function main() {
  const applyChanges = process.argv.includes("--apply");

  const rows = await db
    .select({
      id: pantryItems.id,
      name: pantryItems.name,
      ingredientKey: pantryItems.ingredientKey,
      ingredientSpecificKey: pantryItems.ingredientSpecificKey,
      trackingMode: pantryItems.trackingMode,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
    })
    .from(pantryItems);

  const candidates = rows.filter((row): row is PantryBackfillRow => {
    if (row.trackingMode !== "quantity") {
      return false;
    }

    return (
      resolvePantryTrackingMode({
        name: row.name,
        ingredientKey: row.ingredientKey,
        ingredientSpecificKey: row.ingredientSpecificKey,
        quantity: row.quantity ? Number(row.quantity) : null,
        unit: row.unit,
      }) === "availability"
    );
  });

  console.log(
    `[pantry-staples-backfill] ${applyChanges ? "applying" : "dry-run"} ${candidates.length} pantry item updates`,
  );

  if (candidates.length > 0) {
    console.table(
      candidates.slice(0, 25).map((row) => ({
        id: row.id,
        name: row.name,
        ingredientKey: row.ingredientKey,
        ingredientSpecificKey: row.ingredientSpecificKey,
        from: row.trackingMode,
        to: "availability",
      })),
    );
  }

  if (!applyChanges || candidates.length === 0) {
    if (!applyChanges) {
      console.log(
        '[pantry-staples-backfill] re-run with --apply to persist the tracking_mode updates.',
      );
    }
    return;
  }

  for (const candidate of candidates) {
    await db
      .update(pantryItems)
      .set({ trackingMode: "availability" })
      .where(eq(pantryItems.id, candidate.id));
  }

  console.log(
    `[pantry-staples-backfill] updated ${candidates.length} pantry items to availability tracking.`,
  );
}

main().catch((error) => {
  console.error("[pantry-staples-backfill] failed", error);
  process.exitCode = 1;
});