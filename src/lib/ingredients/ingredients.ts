import { normalizeUnit } from "@/lib/ingredients/units";

const UNICODE_FRACTIONS: Record<string, string> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅐": "1/7",
  "⅑": "1/9",
  "⅒": "1/10",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const KNOWN_UNITS = [
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "ml",
  "milliliter",
  "milliliters",
  "l",
  "liter",
  "liters",
  "dl",
  "cup",
  "cups",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "clove",
  "cloves",
  "can",
  "cans",
  "tin",
  "tins",
  "package",
  "packages",
  "pack",
  "packs",
  "slice",
  "slices",
  "piece",
  "pieces",
  "fillet",
  "fillets",
  "stalk",
  "stalks",
  "sprig",
  "sprigs",
  "handful",
  "handfuls",
  "pinch",
  "pinches",
  "serving",
  "servings",
  "muffin",
  "muffins",
  "burrito",
  "burritos",
  "bar",
  "bars",
  "smoothie",
  "smoothies",
  "wrap",
  "wraps",
  "leaf",
  "leaves",
  "head",
  "heads",
  "bottle",
  "bottles",
  "jar",
  "jars",
  "ball",
  "balls",
  "bite",
  "bites",
];

const TRAILING_NOTE_PATTERN = new RegExp(
  String.raw`,\s*(?:diced|minced|chopped|sliced|thinly sliced|halved|quartered|cubed|peeled|crushed|grated|shredded|drained|rinsed|cooked|cooked, shredded|crumbled|seeded|de-seeded|pitted|shelled|softened|melted|plain|non-fat|nonfat|low-fat|low fat|fresh|frozen|dry|dried|roasted|unsweetened|sweetened|juiced|juice only|zested and juiced|zest only|to taste|to serve|for garnish|optional).*$`,
  "i",
);

const LEADING_DESCRIPTOR_PATTERN = new RegExp(
  String.raw`^(?:fresh|frozen|dried|dry|plain|non-fat|nonfat|low-fat|low fat|natural|ripe|lean|large|medium|small|extra virgin|extra-virgin|ground|cooked|canned|unsweetened|sweetened)\s+`,
  "i",
);

export interface IngredientIdentity {
  ingredientName: string | null;
  ingredientKey: string | null;
}

export interface ParsedRecipeIngredient extends IngredientIdentity {
  displayName: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
}

function normalizeText(value: string): string {
  let normalized = value.normalize("NFKC");

  // NFKC can preserve the Unicode fraction slash in mixed fraction strings.
  normalized = normalized.replaceAll("⁄", "/");

  for (const [unicodeFraction, asciiFraction] of Object.entries(
    UNICODE_FRACTIONS,
  )) {
    normalized = normalized.replaceAll(unicodeFraction, ` ${asciiFraction} `);
  }

  return normalized.replace(/\s+/g, " ").trim();
}

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");

  if (/^\d+\s+\d+\/\d+$/.test(normalized)) {
    const [whole, fraction] = normalized.split(/\s+/, 2);
    const fractionValue = parseNumber(fraction);
    if (fractionValue === null) return null;
    return Number(whole) + fractionValue;
  }

  if (/^\d+\/\d+$/.test(normalized)) {
    const [numerator, denominator] = normalized.split("/").map(Number);
    if (!denominator) return null;
    return numerator / denominator;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function singularizeToken(token: string): string {
  const irregular: Record<string, string> = {
    tomatoes: "tomato",
    potatoes: "potato",
    leaves: "leaf",
    loaves: "loaf",
    knives: "knife",
    berries: "berry",
    cherries: "cherry",
    muffins: "muffin",
    eggs: "egg",
    cloves: "clove",
    peppers: "pepper",
    onions: "onion",
    carrots: "carrot",
  };

  if (irregular[token]) return irregular[token];
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("oes") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("ses") || token.endsWith("xes") || token.endsWith("zes")) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function stripLeadingQuantity(text: string): {
  quantity: number | null;
  rest: string;
} {
  const match = text.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*(?:-|to)\s*\d+(?:[.,]\d+)?)?\s+(.*)$/i,
  );

  if (!match) {
    return { quantity: null, rest: text };
  }

  return {
    quantity: parseNumber(match[1]),
    rest: match[2].trim(),
  };
}

function stripLeadingUnit(text: string): {
  unit: string | null;
  rest: string;
} {
  const lower = text.toLowerCase();

  for (const unitCandidate of [...KNOWN_UNITS].sort(
    (left, right) => right.length - left.length,
  )) {
    if (!lower.startsWith(unitCandidate)) continue;

    const nextChar = lower.charAt(unitCandidate.length);
    if (nextChar && /[a-z]/.test(nextChar)) continue;

    const rest = text.slice(unitCandidate.length).trim();
    return {
      unit: normalizeUnit(unitCandidate),
      rest,
    };
  }

  return { unit: null, rest: text };
}

export function normalizeIngredientName(rawValue: string): string | null {
  const normalizedText = normalizeText(rawValue);
  if (!normalizedText) return null;

  const quantityResult = stripLeadingQuantity(normalizedText);
  const unitResult = stripLeadingUnit(quantityResult.rest);

  let candidate = unitResult.rest
    .replace(/\([^)]*\)/g, " ")
    .replace(TRAILING_NOTE_PATTERN, "")
    .replace(/\b(?:to taste|to serve|for garnish|for serving|optional)\b.*$/i, "")
    .split(/\s+or\s+/i)[0]
    .trim();

  while (LEADING_DESCRIPTOR_PATTERN.test(candidate)) {
    candidate = candidate.replace(LEADING_DESCRIPTOR_PATTERN, "").trim();
  }

  candidate = candidate
    .replace(/^of\s+/i, "")
    .replace(/^the\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return candidate.length > 0 ? candidate : null;
}

export function createIngredientKey(rawValue: string): string | null {
  const ingredientName = normalizeIngredientName(rawValue);
  if (!ingredientName) return null;

  const normalized = ingredientName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .map((token) => singularizeToken(token))
    .join(" ");

  const key = slugify(normalized);
  return key || null;
}

export function buildIngredientIdentity(rawValue: string): IngredientIdentity {
  const ingredientName = normalizeIngredientName(rawValue);

  return {
    ingredientName,
    ingredientKey: ingredientName ? createIngredientKey(ingredientName) : null,
  };
}

export function parseRecipeIngredient(rawValue: string): ParsedRecipeIngredient {
  const displayName = normalizeText(rawValue);
  const optional = /\b(optional|to taste|to serve|for garnish|for serving)\b/i.test(
    displayName,
  );

  const quantityResult = stripLeadingQuantity(displayName);
  const unitResult = stripLeadingUnit(quantityResult.rest);
  const identity = buildIngredientIdentity(displayName);

  return {
    displayName,
    ingredientName: identity.ingredientName,
    ingredientKey: identity.ingredientKey,
    quantity: quantityResult.quantity,
    unit: unitResult.unit,
    optional,
  };
}