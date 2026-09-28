import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { db } from "../src/index";
import { ingredients, pantryItems, recipeIngredients } from "../src/db/schema";
import {
  isLessSpecificIngredientMatch,
  pantryKeySatisfiesRecipeKey,
} from "../src/lib/ingredients/ingredient-family";
import { matchPantryIngredient } from "../src/lib/ingredients/ingredient-matching";

const OUTPUT_PATH = resolve("diagrams/pantry/matching-parity.json");

interface PairDecision {
  matched: boolean;
  matchType: "exact" | "fallback" | null;
}

function oldPairMatch(
  pantrySpecificKey: string | null,
  pantryFamilyKey: string | null,
  recipeSpecificKey: string | null,
  recipeFamilyKey: string | null,
): PairDecision {
  const preferredRecipeKey = recipeSpecificKey ?? recipeFamilyKey;
  if (!preferredRecipeKey) {
    return { matched: false, matchType: null };
  }

  if (
    pantrySpecificKey &&
    pantryKeySatisfiesRecipeKey(pantrySpecificKey, preferredRecipeKey)
  ) {
    return {
      matched: true,
      matchType: isLessSpecificIngredientMatch(
        pantrySpecificKey,
        preferredRecipeKey,
      )
        ? "fallback"
        : "exact",
    };
  }

  if (
    pantryFamilyKey &&
    pantryKeySatisfiesRecipeKey(pantryFamilyKey, preferredRecipeKey)
  ) {
    return { matched: true, matchType: "fallback" };
  }

  return { matched: false, matchType: null };
}

// Uses the production matcher so the report reflects what the app does.
function newPairMatch(
  pantryIngredientId: string | null,
  recipeIngredientId: string | null,
  parentById: Map<string, string | null>,
): PairDecision {
  if (!pantryIngredientId || !recipeIngredientId) {
    return { matched: false, matchType: null };
  }

  return matchPantryIngredient(
    { ingredientId: pantryIngredientId, ingredientKey: null, ingredientSpecificKey: null },
    { ingredientId: recipeIngredientId, ingredientKey: null, ingredientSpecificKey: null },
    { parentById, keyById: new Map(), idByKey: new Map() },
  );
}

async function main() {
  const ingredientRows = await db
    .select({ id: ingredients.id, parentId: ingredients.parentId })
    .from(ingredients);
  const parentById = new Map(
    ingredientRows.map((row) => [row.id, row.parentId ?? null]),
  );

  const pantryRows = await db
    .select({
      id: pantryItems.id,
      name: pantryItems.name,
      ingredientKey: pantryItems.ingredientKey,
      ingredientSpecificKey: pantryItems.ingredientSpecificKey,
      ingredientId: pantryItems.ingredientId,
    })
    .from(pantryItems);

  const recipeRows = await db
    .select({
      id: recipeIngredients.id,
      recipeId: recipeIngredients.recipeId,
      ingredientKey: recipeIngredients.ingredientKey,
      ingredientSpecificKey: recipeIngredients.ingredientSpecificKey,
      ingredientId: recipeIngredients.ingredientId,
    })
    .from(recipeIngredients);

  const diffs: {
    pantryName: string;
    pantryKeys: string;
    pantryIngredientId: string | null;
    recipeIngredientId: string | null;
    recipeKeys: string;
    old: PairDecision;
    new: PairDecision;
  }[] = [];

  let compared = 0;
  let oldMatched = 0;
  let newMatched = 0;

  for (const pantry of pantryRows) {
    for (const recipe of recipeRows) {
      compared += 1;

      const oldDecision = oldPairMatch(
        pantry.ingredientSpecificKey,
        pantry.ingredientKey,
        recipe.ingredientSpecificKey,
        recipe.ingredientKey,
      );
      const newDecision = newPairMatch(
        pantry.ingredientId,
        recipe.ingredientId,
        parentById,
      );

      if (oldDecision.matched) {
        oldMatched += 1;
      }
      if (newDecision.matched) {
        newMatched += 1;
      }

      if (
        oldDecision.matched !== newDecision.matched ||
        oldDecision.matchType !== newDecision.matchType
      ) {
        diffs.push({
          pantryName: pantry.name,
          pantryKeys: `${pantry.ingredientSpecificKey ?? "—"} / ${pantry.ingredientKey ?? "—"}`,
          pantryIngredientId: pantry.ingredientId,
          recipeIngredientId: recipe.ingredientId,
          recipeKeys: `${recipe.ingredientSpecificKey ?? "—"} / ${recipe.ingredientKey ?? "—"}`,
          old: oldDecision,
          new: newDecision,
        });
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      pantryRows: pantryRows.length,
      recipeRows: recipeRows.length,
      pairsCompared: compared,
      oldMatchedPairs: oldMatched,
      newMatchedPairs: newMatched,
      diffPairs: diffs.length,
    },
    diffs,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nFull report written to ${OUTPUT_PATH}`);

  if (diffs.length > 0) {
    console.log("\nSample diffs (first 20):");
    for (const diff of diffs.slice(0, 20)) {
      console.log(
        `  pantry "${diff.pantryName}" [${diff.pantryKeys}] vs recipe [${diff.recipeKeys}] old=${JSON.stringify(diff.old)} new=${JSON.stringify(diff.new)}`,
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
