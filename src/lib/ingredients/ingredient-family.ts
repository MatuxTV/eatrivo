const FAMILY_TOKEN_MAP = new Map<string, string>([
  ["chicken", "chicken"],
  ["kuracie", "chicken"],
  ["beef", "beef"],
  ["hovadzie", "beef"],
  ["pork", "pork"],
  ["bravcove", "pork"],
  ["fish", "fish"],
  ["ryba", "fish"],
  ["basil", "basil"],
  ["bazalka", "basil"],
  ["pepper", "pepper"],
  ["korenie", "pepper"],
  ["tomato", "tomato"],
  ["paradajka", "tomato"],
  ["cheese", "cheese"],
  ["syr", "cheese"],
  ["oil", "oil"],
  ["olej", "oil"],
  ["milk", "milk"],
  ["mlieko", "milk"],
  ["yogurt", "yogurt"],
  ["yoghurt", "yogurt"],
  ["jogurt", "yogurt"],
  ["cream", "cream"],
  ["smotana", "cream"],
  ["rice", "rice"],
  ["ryza", "rice"],
  ["cestovina", "pasta"],
  ["cestoviny", "pasta"],
  ["pasta", "pasta"],
  ["noodle", "noodle"],
  ["noodles", "noodle"],
  ["rezance", "noodle"],
  ["bean", "bean"],
  ["beans", "bean"],
  ["fazula", "bean"],
  ["fazulka", "bean"],
  ["vinegar", "vinegar"],
  ["ocot", "vinegar"],
  ["sauce", "sauce"],
  ["omacka", "sauce"],
  ["omáčka", "sauce"],
  ["bread", "bread"],
  ["chlieb", "bread"],
  ["butter", "butter"],
  ["maslo", "butter"],
  ["salmon", "salmon"],
  ["losos", "salmon"],
  ["asparagus", "asparagus"],
  ["spargla", "asparagus"],
]);

const CANONICAL_FAMILY_TOKENS = new Set(FAMILY_TOKEN_MAP.values());

interface IngredientFamilyProfile {
  normalized: string;
  orderedCanonical: string;
  sortedCanonical: string;
  sortedSpecific: string;
  orderedFamily: string[];
  familyTokens: Set<string>;
  specificTokens: Set<string>;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenizeIngredientValue(value: string): string[] {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function buildIngredientFamilyProfile(value: string): IngredientFamilyProfile {
  const tokens = tokenizeIngredientValue(value);
  const canonicalTokens = tokens.map((token) => FAMILY_TOKEN_MAP.get(token) ?? token);
  const orderedFamily = canonicalTokens.filter((token) => CANONICAL_FAMILY_TOKENS.has(token));
  const familyTokens = uniqueSorted(
    canonicalTokens.filter((token) => CANONICAL_FAMILY_TOKENS.has(token)),
  );
  const specificTokens = uniqueSorted(
    canonicalTokens.filter((token) => !familyTokens.includes(token)),
  );

  return {
    normalized: tokens.join(" "),
    orderedCanonical: canonicalTokens.join("-"),
    sortedCanonical: uniqueSorted(canonicalTokens).join("-"),
    sortedSpecific: specificTokens.join("-"),
    orderedFamily,
    familyTokens: new Set(familyTokens),
    specificTokens: new Set(specificTokens),
  };
}

function hasSharedToken(left: Set<string>, right: Set<string>): boolean {
  for (const token of left) {
    if (right.has(token)) {
      return true;
    }
  }

  return false;
}

export function buildIngredientAliasForms(value: string): string[] {
  const profile = buildIngredientFamilyProfile(value);
  const forms = new Set<string>();

  if (profile.normalized) {
    forms.add(profile.normalized);
  }

  if (profile.orderedCanonical) {
    forms.add(profile.orderedCanonical.replace(/-/g, " "));
  }

  if (profile.sortedCanonical) {
    forms.add(profile.sortedCanonical.replace(/-/g, " "));
  }

  if (profile.sortedSpecific) {
    forms.add(profile.sortedSpecific.replace(/-/g, " "));
  }

  return [...forms].filter(Boolean);
}

export function getIngredientFamilyKeyCandidates(
  value: string,
  validKeys?: Set<string>,
): string[] {
  const profile = buildIngredientFamilyProfile(value);
  const candidates = [...new Set(profile.orderedFamily)].filter(Boolean);

  if (!validKeys) {
    return candidates;
  }

  return candidates.filter((candidate) => validKeys.has(candidate));
}

export function deriveIngredientFamilyKey(
  value: string,
  validKeys?: Set<string>,
): string | null {
  const candidates = getIngredientFamilyKeyCandidates(value, validKeys);
  if (candidates.length === 1) {
    return candidates[0];
  }

  return null;
}

export function pantryKeySatisfiesRecipeKey(
  pantryKey: string,
  recipeKey: string,
): boolean {
  const pantry = buildIngredientFamilyProfile(pantryKey);
  const recipe = buildIngredientFamilyProfile(recipeKey);

  if (!pantry.normalized || !recipe.normalized) {
    return false;
  }

  if (
    pantry.normalized === recipe.normalized ||
    pantry.orderedCanonical === recipe.orderedCanonical ||
    pantry.sortedCanonical === recipe.sortedCanonical
  ) {
    return true;
  }

  if (
    pantry.sortedSpecific &&
    pantry.sortedSpecific === recipe.sortedSpecific &&
    (hasSharedToken(pantry.familyTokens, recipe.familyTokens) ||
      pantry.familyTokens.size === 0 ||
      recipe.familyTokens.size === 0)
  ) {
    return true;
  }

  if (
    recipe.specificTokens.size === 0 &&
    recipe.familyTokens.size > 0 &&
    hasSharedToken(recipe.familyTokens, pantry.familyTokens)
  ) {
    return true;
  }

  if (
    pantry.specificTokens.size === 0 &&
    pantry.familyTokens.size > 0 &&
    recipe.familyTokens.size > 0 &&
    hasSharedToken(pantry.familyTokens, recipe.familyTokens)
  ) {
    return true;
  }

  return false;
}

export function isLessSpecificIngredientMatch(
  pantryKey: string,
  recipeKey: string,
): boolean {
  const pantry = buildIngredientFamilyProfile(pantryKey);
  const recipe = buildIngredientFamilyProfile(recipeKey);

  if (!pantry.normalized || !recipe.normalized) {
    return false;
  }

  return pantry.specificTokens.size === 0 && recipe.specificTokens.size > 0;
}