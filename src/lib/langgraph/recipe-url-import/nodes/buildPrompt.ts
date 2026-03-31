import type { RecipeUrlImportState } from "../state";

export async function buildPrompt(
  state: typeof RecipeUrlImportState.State,
): Promise<Partial<typeof RecipeUrlImportState.State>> {
  if (!state.selectedRecipeUrl) {
    return { error: "Missing selected recipe URL." };
  }

  if (!state.pageText || !state.rulesSummary || !state.rulesDocument || !state.checkedRecipesExample) {
    return { error: "Missing fetched recipe page context." };
  }

  const prompt = [
    "Normalize the selected recipe page into the Eatrivo recipe JSON contract.",
    "Return ONLY raw JSON. No markdown. No code fences. No explanation.",
    "Output shape must be exactly: {\"recipes\": [...], \"rejected\": [...]}.",
    "Process exactly one recipe from the selected URL.",
    "Do not use fallback generation. If normalization is uncertain, return a rejected entry instead.",
    "The canonical instruction file is:",
    "#file:NORMALIZED_RECIPE_JSON_RULES.md",
    "The output format example you must imitate is:",
    "#file:checked_recipes.json",
    "Your response must match the naming, nesting, and field conventions of #file:checked_recipes.json.",
    "Never output legacy or alternative keys such as recipe_id, description, cook_time_min, categories, cuisines, diets, nutrition, display_string, amount_metric, unit_metric, source_url, or images.",
    "Use exactly the canonical keys from the rules and from #file:checked_recipes.json.",
    state.rulesSummary,
    "Contents of #file:NORMALIZED_RECIPE_JSON_RULES.md:",
    state.rulesDocument,
    "Contents of #file:checked_recipes.json:",
    state.checkedRecipesExample,
    `Recipe URL:\n${state.selectedRecipeUrl}`,
    `JSON-LD excerpt:\n${state.jsonLdText ?? "No JSON-LD blocks found."}`,
    `Page text excerpt:\n${state.pageText}`,
  ].join("\n\n");

  return { prompt };
}