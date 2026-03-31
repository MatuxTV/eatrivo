import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildRecipeUrlImportGraph } from "@/lib/langgraph/recipe-url-import";

const RECIPE_SOURCE_URLS: string[] = [
  "https://www.bbcgoodfood.com/recipes/bean-enchiladas"
];

const AGGREGATE_OUTPUT_PATH = resolve(
  "receipes/generated/import-recipe-url-results.json",
);

interface NormalizedRecipeFile {
  recipes: unknown[];
  rejected: unknown[];
}

interface ProcessedUrlResult {
  url: string;
  outputPath: string | null;
  importCompleted: boolean;
  recipesCount: number;
  rejectedCount: number;
  error: string | null;
}

function parseNormalizedRecipeFile(rawJson: string | null): NormalizedRecipeFile {
  if (!rawJson) {
    return { recipes: [], rejected: [] };
  }

  const parsed = JSON.parse(rawJson) as {
    recipes?: unknown[];
    rejected?: unknown[];
  };

  return {
    recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
    rejected: Array.isArray(parsed.rejected) ? parsed.rejected : [],
  };
}

function persistAggregateResults(input: {
  processed: ProcessedUrlResult[];
  recipes: unknown[];
  rejected: unknown[];
}): void {
  const payload = {
    generatedAt: new Date().toISOString(),
    processedCount: input.processed.length,
    successCount: input.processed.filter((item) => !item.error).length,
    failureCount: input.processed.filter((item) => item.error).length,
    recipes: input.recipes,
    rejected: input.rejected,
    results: input.processed,
  };

  mkdirSync(dirname(AGGREGATE_OUTPUT_PATH), { recursive: true });
  writeFileSync(
    AGGREGATE_OUTPUT_PATH,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

async function main(): Promise<void> {
  if (RECIPE_SOURCE_URLS.length === 0) {
    throw new Error("No recipe URLs configured in RECIPE_SOURCE_URLS.");
  }

  const graph = buildRecipeUrlImportGraph();
  const processed: ProcessedUrlResult[] = [];
  const aggregatedRecipes: unknown[] = [];
  const aggregatedRejected: unknown[] = [];

  process.stdout.write(
    `Starting recipe URL import for ${RECIPE_SOURCE_URLS.length} URL(s).\n`,
  );

  for (const [index, recipeUrl] of RECIPE_SOURCE_URLS.entries()) {
    process.stdout.write(
      `\n[${index + 1}/${RECIPE_SOURCE_URLS.length}] Processing ${recipeUrl}\n`,
    );

    const result = await graph.invoke({
      recipeUrls: [recipeUrl],
    });

    const normalized = parseNormalizedRecipeFile(result.normalizedJson ?? null);
    aggregatedRecipes.push(...normalized.recipes);
    aggregatedRejected.push(...normalized.rejected);

    const processedResult: ProcessedUrlResult = {
      url: recipeUrl,
      outputPath: result.outputPath ?? null,
      importCompleted: Boolean(result.importCompleted),
      recipesCount: normalized.recipes.length,
      rejectedCount: normalized.rejected.length,
      error: result.error ?? null,
    };

    processed.push(processedResult);

    if (processedResult.error) {
      process.stdout.write(`Status: FAILED\n`);
      process.stdout.write(`Error: ${processedResult.error}\n`);
      continue;
    }

    process.stdout.write(`Status: OK\n`);
    process.stdout.write(`Normalized file: ${processedResult.outputPath}\n`);
    process.stdout.write(
      `Recipes: ${processedResult.recipesCount}, Rejected: ${processedResult.rejectedCount}\n`,
    );
  }

  persistAggregateResults({
    processed,
    recipes: aggregatedRecipes,
    rejected: aggregatedRejected,
  });

  process.stdout.write(`\nAggregate results file: ${AGGREGATE_OUTPUT_PATH}\n`);

  const failedCount = processed.filter((item) => item.error).length;
  const importedCount = processed.filter((item) => item.importCompleted).length;

  process.stdout.write(
    `Finished. Imported ${importedCount}/${processed.length} URL(s), failed ${failedCount}.\n`,
  );

  if (failedCount > 0) {
    throw new Error(`${failedCount} URL(s) failed during normalization or import.`);
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(`Recipe URL import failed. ${error.message}`);
  } else {
    console.error("Recipe URL import failed.", error);
  }
  process.exit(1);
});