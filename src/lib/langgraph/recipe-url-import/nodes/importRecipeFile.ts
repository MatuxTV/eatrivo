import { execFileSync } from "node:child_process";

import type { RecipeUrlImportState } from "../state";

export async function importRecipeFile(
  state: typeof RecipeUrlImportState.State,
): Promise<Partial<typeof RecipeUrlImportState.State>> {
  if (!state.outputPath) {
    return { error: "Missing normalized recipe output path." };
  }

  try {
    execFileSync("npm", ["run", "db:import:recipes", "--", state.outputPath], {
      stdio: "inherit",
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Recipe import command failed: ${error.message}`
          : "Recipe import command failed.",
    };
  }

  return { importCompleted: true };
}