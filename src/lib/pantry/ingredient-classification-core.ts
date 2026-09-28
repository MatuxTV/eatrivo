import type { IngredientGraph } from "@/lib/ingredients/ingredient-matching";

export interface ClassificationResult {
  isFoodIngredient: boolean;
  canonicalKey: string | null;
  familyKey: string | null;
  englishName: string | null;
  localizedName: string | null;
  confidence: number | null;
  reason: string | null;
}

export type IngredientReviewState = "trusted" | "unverified" | "flagged";

export type ClassificationAction =
  | {
      type: "merge";
      reason: "global" | "private-duplicate";
      target: { id: string; key: string; familyKey: string };
    }
  | { type: "rekey"; key: string; familyKey: string }
  | { type: "none" };

export interface ClassificationPlan {
  action: ClassificationAction;
  parentId: string | null;
  reviewState: IngredientReviewState;
  learnedNames: string[];
}

export const TRUSTED_CONFIDENCE_THRESHOLD = 0.6;

function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last > first) {
    return JSON.parse(cleaned.slice(first, last + 1));
  }
  return JSON.parse(cleaned);
}

export function parseClassification(raw: string): ClassificationResult | null {
  try {
    const parsed = extractJson(raw) as Record<string, unknown>;
    return {
      isFoodIngredient: Boolean(parsed.isFoodIngredient),
      canonicalKey:
        typeof parsed.canonicalKey === "string" ? parsed.canonicalKey : null,
      familyKey: typeof parsed.familyKey === "string" ? parsed.familyKey : null,
      englishName:
        typeof parsed.englishName === "string" ? parsed.englishName : null,
      localizedName:
        typeof parsed.localizedName === "string" ? parsed.localizedName : null,
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : null,
      reason: typeof parsed.reason === "string" ? parsed.reason : null,
    };
  } catch {
    return null;
  }
}

// Only lowercase English kebab-case slugs are accepted as catalog keys; any
// other AI output (spaces, diacritics, punctuation) is discarded.
export function toCatalogSlug(value: string | null | undefined): string | null {
  const slug = value?.trim().toLowerCase() ?? "";
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

export function buildClassificationPrompt(input: {
  rawName: string;
  locale: string;
  knownKeys: string[];
}): string {
  return [
    "You classify a user-entered pantry item and map it to the canonical ingredient catalog.",
    `Primary locale: ${input.locale}`,
    `Raw user input: "${input.rawName}"`,
    "Return ONLY a JSON object with this exact shape:",
    '{"isFoodIngredient": boolean, "canonicalKey": string | null, "familyKey": string | null, "englishName": string | null, "localizedName": string | null, "confidence": number | null, "reason": string | null}',
    "Rules:",
    "- isFoodIngredient is false for non-food, gibberish, brands without food meaning, or clearly invalid text.",
    "- canonicalKey is a lowercase English kebab-case slug of the exact ingredient, e.g. bread, almond-butter, green-asparagus.",
    "- familyKey is a broader known catalog family key when it clearly applies, otherwise null.",
    "- englishName is the locale-neutral English name, e.g. Bread.",
    "- localizedName is the name in the primary locale, preserving the user's wording where valid.",
    "- confidence is between 0 and 1.",
    "- If the item is not a food ingredient, set canonicalKey and familyKey to null.",
    "Known catalog keys (prefer familyKey from this list when relevant):",
    input.knownKeys.join(", ") || "(none)",
  ].join("\n");
}

export function resolveReviewState(
  result: ClassificationResult,
): IngredientReviewState {
  if (!result.isFoodIngredient) {
    return "flagged";
  }

  return (result.confidence ?? 0) >= TRUSTED_CONFIDENCE_THRESHOLD
    ? "trusted"
    : "unverified";
}

// Returns the key whose same-user private duplicate must be looked up before
// planning, or null when no lookup is needed (non-food, invalid key, or the
// key already exists globally).
export function getPrivateDuplicateLookupKey(
  result: ClassificationResult,
  graph: IngredientGraph,
): string | null {
  const canonicalKey = toCatalogSlug(result.canonicalKey);
  if (!result.isFoodIngredient || !canonicalKey) {
    return null;
  }

  return graph.idByKey.has(canonicalKey) ? null : canonicalKey;
}

// Decides what to do with a freshly classified private ingredient:
// 1) the AI key is a known global ingredient → merge into it;
// 2) the user already owns a private ingredient with that key → merge into it;
// 3) otherwise → rename the private ingredient to the English key.
export function planClassification(input: {
  ingredientId: string;
  rawName: string;
  result: ClassificationResult;
  graph: IngredientGraph;
  privateDuplicate: { id: string; key: string } | null;
}): ClassificationPlan {
  const { result, graph } = input;
  const canonicalKey = toCatalogSlug(result.canonicalKey);
  const familyKey = toCatalogSlug(result.familyKey);
  const parentId =
    familyKey && graph.idByKey.has(familyKey)
      ? graph.idByKey.get(familyKey) ?? null
      : null;
  const resolvedFamilyKey = familyKey && parentId ? familyKey : null;
  const learnedNames = [input.rawName, result.localizedName]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name));
  const reviewState = resolveReviewState(result);

  const plan = (action: ClassificationAction): ClassificationPlan => ({
    action,
    parentId,
    reviewState,
    learnedNames,
  });

  if (!result.isFoodIngredient || !canonicalKey) {
    return plan({ type: "none" });
  }

  const globalId = graph.idByKey.get(canonicalKey);
  if (globalId && globalId !== input.ingredientId) {
    const globalParentId = graph.parentById.get(globalId) ?? null;
    return plan({
      type: "merge",
      reason: "global",
      target: {
        id: globalId,
        key: canonicalKey,
        familyKey:
          (globalParentId ? graph.keyById.get(globalParentId) : null) ??
          canonicalKey,
      },
    });
  }

  const duplicate = input.privateDuplicate;
  if (duplicate && duplicate.id !== input.ingredientId) {
    return plan({
      type: "merge",
      reason: "private-duplicate",
      target: {
        id: duplicate.id,
        key: duplicate.key,
        familyKey: resolvedFamilyKey ?? duplicate.key,
      },
    });
  }

  if (duplicate) {
    // Already carries this key.
    return plan({ type: "none" });
  }

  return plan({
    type: "rekey",
    key: canonicalKey,
    familyKey: resolvedFamilyKey ?? canonicalKey,
  });
}
