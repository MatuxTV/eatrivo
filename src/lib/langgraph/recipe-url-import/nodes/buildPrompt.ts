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
    "You may correct messy source wording into the proper Eatrivo canonical concept when the intended meaning is clear from the page.",
    "Prefer corrective normalization over literal copying when the source is semantically clear but structurally weak.",
    "Do not invent missing concepts. If the page does not support one clear canonical interpretation, reject the recipe.",
    "Do not output vague ingredient amounts like 'to taste', 'as needed', 'for seasoning', or missing quantities.",
    "If a recipe ingredient amount cannot be normalized into an explicit numeric quantity plus allowed unit, reject the recipe instead of guessing loosely.",
    "Do not convert source phrases like 'to taste' into accepted recipe quantities unless the page provides enough concrete evidence for a tight, defensible normalization.",
    "Do not accept a recipe if you would need to explain estimated seasoning amounts or guessed ingredient identities in notes.",
    "Every accepted ingredient must include pantry_tracking_hint with one of: quantity, availability, or null.",
    "pantry_tracking_hint=availability is only for pantry staples like salt, pepper, garlic, oil, soy sauce, vinegar, and similar condiments; it never replaces quantity or unit.",
    "If a weak source label clearly refers to a stronger canonical identity, normalize to the stronger canonical identity instead of keeping the weak label.",
    "Example: if page context clearly means ground paprika spice, do not keep the accepted identity as generic paprika just because the raw label is short.",
    "Ingredient identity must stay precise and conservative. Do not fall back to vague accepted identities like cheese, paprika, herb, spice, meat, or oil when the source implies a more specific ingredient or when specificity is unclear.",
    "If the exact pantry identity of an ingredient is ambiguous, reject the recipe instead of inventing a generic placeholder ingredient.",
    "notes must be user-facing recipe notes only. Do not mention normalization decisions, schema compliance, guessed amounts, estimated replacements, or why uncertain source data was accepted.",
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