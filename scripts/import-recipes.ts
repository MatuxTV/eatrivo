import "dotenv/config";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  persistPreparedRecipeImport,
  prepareRecipeImportFromText,
} from "../src/lib/recipes/recipe-importer";

function readJsonFile(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function resolveRecipeFilePath(inputPath: string): string {
  const directPath = resolve(inputPath);
  const recipesDirectoryPath = resolve("receipes", inputPath);
  const resolvedPath = existsSync(directPath)
    ? directPath
    : existsSync(recipesDirectoryPath)
      ? recipesDirectoryPath
      : null;

  if (!resolvedPath) {
    throw new Error(`Recipe file not found: ${inputPath}`);
  }

  if (!resolvedPath.toLowerCase().endsWith(".json")) {
    throw new Error(`Recipe file must be a .json file: ${resolvedPath}`);
  }

  return resolvedPath;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

  if (positionalArgs.length !== 1) {
    throw new Error(
      "Usage: npm run db:import:recipes -- <file.json> [--dry-run]",
    );
  }

  const recipeFilePath = resolveRecipeFilePath(positionalArgs[0]);
  const prepared = prepareRecipeImportFromText(readJsonFile(recipeFilePath));

  if (dryRun) {
    process.stdout.write(
      `Dry run: prepared ${prepared.rows.length} recipes for import from ${recipeFilePath}.\n`,
    );
    process.stdout.write(
      `${JSON.stringify(prepared.preview, null, 2)}\n`,
    );
    return;
  }

  const result = await persistPreparedRecipeImport(prepared.rows);

  process.stdout.write(`Imported ${result.importedCount} recipes from ${recipeFilePath}.\n`);
}

main().catch((error) => {
  console.error("Recipe import failed.", error);
  process.exit(1);
});
