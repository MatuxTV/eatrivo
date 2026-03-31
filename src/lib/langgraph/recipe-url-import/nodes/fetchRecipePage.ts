import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { RecipeUrlImportState } from "../state";

const RULES_FILE_PATH = resolve("receipes/NORMALIZED_RECIPE_JSON_RULES.md");
const CHECKED_RECIPES_FILE_PATH = resolve("receipes/checked_recipes.json");
const MAX_TEXT_CHARS = 18_000;
const MAX_JSON_LD_BLOCKS = 4;
const MAX_JSON_LD_CHARS = 24_000;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ ]{2,}/g, " ")
      .trim(),
  );
}

function extractJsonLd(html: string): string[] {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  return [...matches]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean)
    .slice(0, MAX_JSON_LD_BLOCKS);
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}\n...[truncated]`;
}

function buildRulesSummary(rulesMarkdown: string): string {
  return [
    "Use #file:NORMALIZED_RECIPE_JSON_RULES.md as the canonical contract reference.",
    "Return only valid JSON with top-level keys recipes and rejected.",
    "Normalize exactly one recipe for the selected URL.",
    "Use multilingual structured ingredients, canonical metric units, realistic servings, and strict nutrition consistency.",
    "ingredient_key must be exact or a valid broader parent; ingredient_specific_key must be identical or a valid descendant.",
    "If confidence is insufficient, put the recipe into rejected instead of inventing data.",
    `Reference excerpt length: ${rulesMarkdown.length} characters read locally for alignment.`,
  ].join(" ");
}

export async function fetchRecipePage(
  state: typeof RecipeUrlImportState.State,
): Promise<Partial<typeof RecipeUrlImportState.State>> {
  if (!state.selectedRecipeUrl) {
    return { error: "Missing selected recipe URL." };
  }

  let response: Response;

  try {
    response = await fetch(state.selectedRecipeUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; EatrivoRecipeImporter/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to fetch recipe page.",
    };
  }

  if (!response.ok) {
    return {
      error: `Failed to fetch recipe page: ${response.status} ${response.statusText}`,
    };
  }

  const html = await response.text();
  const pageText = truncate(stripHtmlToText(html), MAX_TEXT_CHARS);
  const jsonLdText = truncate(extractJsonLd(html).join("\n\n"), MAX_JSON_LD_CHARS);
  const rulesDocument = readFileSync(RULES_FILE_PATH, "utf8");
  const checkedRecipesExample = readFileSync(CHECKED_RECIPES_FILE_PATH, "utf8");
  const rulesSummary = buildRulesSummary(rulesDocument);

  return {
    rulesDocument,
    pageText,
    jsonLdText: jsonLdText || "No JSON-LD blocks found.",
    checkedRecipesExample,
    rulesSummary,
  };
}