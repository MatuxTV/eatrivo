import "dotenv/config";

import { count, eq, or, sql } from "drizzle-orm";

import { db } from "../src/index";
import {
  pantryItems,
  pantryRestockItems,
  recipeIngredients,
  shoppingListItems,
} from "../src/db/schema";

interface KeyMapping {
  from: string;
  toSpecific: string;
  toFamily: string;
}

const MAPPINGS: KeyMapping[] = [
  { from: "sol", toSpecific: "salt", toFamily: "salt" },
  { from: "olivovy-olej", toSpecific: "olive-oil", toFamily: "olive-oil" },
  { from: "50g-maslo", toSpecific: "butter", toFamily: "butter" },
  {
    from: "20g-mandlove-maslo",
    toSpecific: "almond-butter",
    toFamily: "butter",
  },
  {
    from: "300g-zelena-spargla",
    toSpecific: "green-asparagus",
    toFamily: "asparagus",
  },
  {
    from: "450g-loso-filet",
    toSpecific: "salmon-fillet",
    toFamily: "salmon",
  },
];

const TABLES = {
  recipe_ingredients: recipeIngredients,
  pantry_items: pantryItems,
  shopping_list_items: shoppingListItems,
  pantry_restock_items: pantryRestockItems,
} as const;

type TableName = keyof typeof TABLES;

const USER_TABLES: TableName[] = [
  "pantry_items",
  "shopping_list_items",
  "pantry_restock_items",
];

async function countMatches(table: TableName, from: string): Promise<number> {
  const columns = TABLES[table];
  const [row] = await db
    .select({ value: count() })
    .from(columns)
    .where(
      or(
        eq(columns.ingredientSpecificKey, from),
        eq(columns.ingredientKey, from),
      ),
    );

  return Number(row?.value ?? 0);
}

async function applyMapping(table: TableName, mapping: KeyMapping): Promise<void> {
  await db.execute(sql`
    UPDATE ${sql.identifier(table)}
    SET ingredient_specific_key = CASE
          WHEN ingredient_specific_key = ${mapping.from} THEN ${mapping.toSpecific}
          WHEN ingredient_specific_key IS NULL AND ingredient_key = ${mapping.from} THEN ${mapping.toSpecific}
          ELSE ingredient_specific_key
        END,
        ingredient_key = CASE
          WHEN ingredient_key = ${mapping.from} THEN ${mapping.toFamily}
          WHEN ingredient_key IS NULL AND ingredient_specific_key = ${mapping.from} THEN ${mapping.toFamily}
          ELSE ingredient_key
        END,
        updated_at = now()
    WHERE ingredient_specific_key = ${mapping.from} OR ingredient_key = ${mapping.from}
  `);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force");

  const plan: {
    mapping: KeyMapping;
    counts: Record<TableName, number>;
    userImpact: number;
  }[] = [];

  let totalUserImpact = 0;

  for (const mapping of MAPPINGS) {
    const counts = {} as Record<TableName, number>;
    for (const table of Object.keys(TABLES) as TableName[]) {
      counts[table] = await countMatches(table, mapping.from);
    }

    const userImpact = USER_TABLES.reduce(
      (sum, table) => sum + counts[table],
      0,
    );
    totalUserImpact += userImpact;

    plan.push({ mapping, counts, userImpact });
  }

  console.log(`${apply ? "APPLY" : "DRY-RUN"} cleanup plan:\n`);
  for (const entry of plan) {
    const { mapping, counts } = entry;
    console.log(
      `${mapping.from} -> specific=${mapping.toSpecific} family=${mapping.toFamily}`,
    );
    for (const table of Object.keys(TABLES) as TableName[]) {
      if (counts[table] > 0) {
        console.log(`    ${table}: ${counts[table]}`);
      }
    }
  }

  console.log(`\nUser-data impact (pantry/shopping/restock): ${totalUserImpact}`);

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to execute.");
    return;
  }

  if (totalUserImpact > 0 && !force) {
    console.error(
      "\nUser data would be modified. Re-run with --apply --force to continue.",
    );
    process.exit(1);
  }

  for (const mapping of MAPPINGS) {
    for (const table of Object.keys(TABLES) as TableName[]) {
      await applyMapping(table, mapping);
    }
  }

  console.log("\nCleanup applied.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
