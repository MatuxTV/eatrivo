import { createIngredientKey, parseRecipeIngredient } from "@/lib/ingredients/ingredients";
import { guessFoodCategory, normalizeUnit } from "@/lib/ingredients/units";

export const RECIPE_ALLOWED_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "dl",
  "ks",
  "bal",
  "plechovka",
  "fľaša",
  "zväzok",
  "hlávka",
] as const;

export type RecipeAllowedUnit = (typeof RECIPE_ALLOWED_UNITS)[number];

export type RecipeUnitValidationErrorType =
  | "unit_format_error"
  | "unit_semantic_error";

export type RecipeIngredientForm =
  | "liquid"
  | "paste"
  | "powder"
  | "grain"
  | "piece-based"
  | "sauce"
  | "spread"
  | "protein"
  | "produce"
  | "other";

export interface RecipeUnitExpectation {
  id: string;
  form: RecipeIngredientForm;
  preferredUnit: RecipeAllowedUnit;
  allowedUnits: RecipeAllowedUnit[];
  ingredientKeys?: string[];
  ingredientNameIncludes?: string[];
  categories?: string[];
}

export interface ParsedRecipeAmount {
  rawAmount: string | null;
  quantityValue: number | null;
  rawUnit: string | null;
  normalizedUnit: string | null;
  hasUnit: boolean;
  isFractional: boolean;
  parseable: boolean;
}

export interface RecipeUnitValidationIssue {
  ingredientName: string;
  ingredientKey: string | null;
  category: string;
  form: RecipeIngredientForm;
  amount: string | null;
  quantityValue: number | null;
  rawUnit: string | null;
  normalizedUnit: string | null;
  expectedUnit: RecipeAllowedUnit | null;
  allowedUnits: RecipeAllowedUnit[];
  errorType: RecipeUnitValidationErrorType;
  message: string;
  suggestedAmount: string | null;
}

export interface RecipeUnitSemanticIssue {
  recipeKind: "pantry" | "almost_cookable";
  ingredientName: string;
  currentAmount: string;
  suggestedAmount: string;
  suggestedUnit: RecipeAllowedUnit;
  reason: string;
}

export interface RecipeUnitSemanticAudit {
  passed: boolean;
  issues: RecipeUnitSemanticIssue[];
}

function normalizeComparableText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const AMOUNT_PATTERN =
  /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s+(.+))?$/i;

const UNIT_EXPECTATIONS: RecipeUnitExpectation[] = [
  {
    id: "olive-oil",
    form: "liquid",
    preferredUnit: "ml",
    allowedUnits: ["ml", "l", "dl"],
    ingredientKeys: ["olive-oil", "oil", "rapeseed-oil", "sunflower-oil"],
    ingredientNameIncludes: ["olive oil", "oil", "olej"],
  },
  {
    id: "vinegar-and-liquid-condiments",
    form: "liquid",
    preferredUnit: "ml",
    allowedUnits: ["ml", "l", "dl"],
    ingredientNameIncludes: ["vinegar", "ocot", "soy sauce", "tamari", "fish sauce"],
  },
  {
    id: "processed-tomatoes",
    form: "sauce",
    preferredUnit: "g",
    allowedUnits: ["g", "kg", "ml", "plechovka"],
    ingredientNameIncludes: [
      "peeled tomato",
      "canned tomato",
      "pelati",
      "lupana paradajka",
      "krajane paradajky",
      "chopped tomato",
    ],
  },
  {
    id: "tomato-paste",
    form: "paste",
    preferredUnit: "g",
    allowedUnits: ["g", "kg", "ml"],
    ingredientKeys: ["tomato-paste", "paradajkovy-pretlak"],
    ingredientNameIncludes: ["tomato paste", "pretlak", "passata", "puree"],
  },
  {
    id: "sauces-and-spreads",
    form: "sauce",
    preferredUnit: "ml",
    allowedUnits: ["ml", "l", "dl", "g"],
    ingredientNameIncludes: [
      "ketchup",
      "mustard",
      "horcica",
      "mayonnaise",
      "pesto",
      "sauce",
      "omacka",
    ],
  },
  {
    id: "milk-and-cream",
    form: "liquid",
    preferredUnit: "ml",
    allowedUnits: ["ml", "l", "dl"],
    ingredientNameIncludes: ["milk", "mlieko", "cream", "smotana", "broth", "stock", "vyvar"],
  },
  {
    id: "flour-sugar-spices",
    form: "powder",
    preferredUnit: "g",
    allowedUnits: ["g", "kg"],
    ingredientNameIncludes: [
      "flour",
      "muka",
      "sugar",
      "cukor",
      "salt",
      "sol",
      "soľ",
      "pepper",
      "korenie",
      "paprika",
      "cinnamon",
      "skrob",
      "starch",
      "herb",
      "bylinky",
      "bylina",
      "bazalka",
      "oregano",
      "tymian",
    ],
  },
  {
    id: "dry-grains",
    form: "grain",
    preferredUnit: "g",
    allowedUnits: ["g", "kg"],
    ingredientNameIncludes: [
      "rice",
      "ryza",
      "pasta",
      "cestoviny",
      "oats",
      "ovsen",
      "lentil",
      "sosovica",
      "quinoa",
      "bulgur",
      "couscous",
      "bean",
      "fazole",
    ],
  },
  {
    id: "eggs-and-piece-produce",
    form: "piece-based",
    preferredUnit: "ks",
    allowedUnits: ["ks"],
    ingredientNameIncludes: [
      "egg",
      "vajce",
      "onion",
      "cibula",
      "garlic",
      "cesnak",
      "tomato",
      "paradaj",
      "cucumber",
      "uhorka",
      "avocado",
      "lemon",
      "citron",
      "lime",
      "apple",
      "jablko",
    ],
  },
  {
    id: "meat-and-fish",
    form: "protein",
    preferredUnit: "g",
    allowedUnits: ["g", "kg", "ks"],
    categories: ["meat_fish"],
  },
];

const CATEGORY_FALLBACKS: Record<string, RecipeUnitExpectation> = {
  dairy: {
    id: "dairy-fallback",
    form: "liquid",
    preferredUnit: "ml",
    allowedUnits: ["ml", "l", "dl", "g", "kg"],
  },
  condiments: {
    id: "condiments-fallback",
    form: "sauce",
    preferredUnit: "ml",
    allowedUnits: ["ml", "l", "dl", "g"],
  },
  grains: {
    id: "grains-fallback",
    form: "grain",
    preferredUnit: "g",
    allowedUnits: ["g", "kg"],
  },
  eggs: {
    id: "eggs-fallback",
    form: "piece-based",
    preferredUnit: "ks",
    allowedUnits: ["ks"],
  },
  vegetables: {
    id: "vegetables-fallback",
    form: "produce",
    preferredUnit: "ks",
    allowedUnits: ["ks", "g", "kg"],
  },
  fruit: {
    id: "fruit-fallback",
    form: "produce",
    preferredUnit: "ks",
    allowedUnits: ["ks", "g", "kg"],
  },
  beverages: {
    id: "beverages-fallback",
    form: "liquid",
    preferredUnit: "ml",
    allowedUnits: ["ml", "l", "dl"],
  },
  nuts_seeds: {
    id: "nuts-fallback",
    form: "grain",
    preferredUnit: "g",
    allowedUnits: ["g", "kg"],
  },
  meat_fish: {
    id: "meat-fallback",
    form: "protein",
    preferredUnit: "g",
    allowedUnits: ["g", "kg", "ks"],
  },
  other: {
    id: "other-fallback",
    form: "other",
    preferredUnit: "g",
    allowedUnits: [...RECIPE_ALLOWED_UNITS],
  },
};

function parseNumberValue(rawValue: string): number | null {
  const normalized = rawValue.trim().replace(",", ".");

  if (/^\d+\s+\d+\/\d+$/.test(normalized)) {
    const [wholePart, fractionPart] = normalized.split(/\s+/);
    const [numerator, denominator] = fractionPart.split("/").map(Number);
    if (!denominator) {
      return null;
    }
    return Number(wholePart) + numerator / denominator;
  }

  if (/^\d+\/\d+$/.test(normalized)) {
    const [numerator, denominator] = normalized.split("/").map(Number);
    if (!denominator) {
      return null;
    }
    return numerator / denominator;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return Number(value.toFixed(2)).toString().replace(".", ",");
}

export function parseRecipeAmount(amount: string | null): ParsedRecipeAmount {
  if (!amount || amount.trim().length === 0) {
    return {
      rawAmount: amount,
      quantityValue: null,
      rawUnit: null,
      normalizedUnit: null,
      hasUnit: false,
      isFractional: false,
      parseable: false,
    };
  }

  const trimmedAmount = amount.trim();
  const match = trimmedAmount.match(AMOUNT_PATTERN);

  if (!match) {
    return {
      rawAmount: amount,
      quantityValue: null,
      rawUnit: null,
      normalizedUnit: null,
      hasUnit: false,
      isFractional: false,
      parseable: false,
    };
  }

  const quantityValue = parseNumberValue(match[1]);
  const rawUnit = match[2]?.trim() ?? null;
  const normalizedUnit = rawUnit ? normalizeUnit(rawUnit) : null;

  return {
    rawAmount: amount,
    quantityValue,
    rawUnit,
    normalizedUnit,
    hasUnit: Boolean(rawUnit && rawUnit.length > 0),
    isFractional:
      match[1].includes("/") ||
      (quantityValue !== null && !Number.isInteger(quantityValue)),
    parseable: quantityValue !== null,
  };
}

export function resolveRecipeUnitExpectation(input: {
  ingredientName: string;
  ingredientKey?: string | null;
  category?: string | null;
}): RecipeUnitExpectation {
  const ingredientName = normalizeComparableText(input.ingredientName);
  const ingredientKey = input.ingredientKey ?? createIngredientKey(input.ingredientName);
  const category = input.category ?? guessFoodCategory(input.ingredientName);

  for (const expectation of UNIT_EXPECTATIONS) {
    if (ingredientKey && expectation.ingredientKeys?.includes(ingredientKey)) {
      return expectation;
    }

    if (
      expectation.ingredientNameIncludes?.some((value) =>
        ingredientName.includes(normalizeComparableText(value)),
      )
    ) {
      return expectation;
    }

    if (category && expectation.categories?.includes(category)) {
      return expectation;
    }
  }

  return CATEGORY_FALLBACKS[category] ?? CATEGORY_FALLBACKS.other;
}

export function validateRecipeIngredientAmountFormat(input: {
  ingredientName: string;
  amount: string | null;
  category?: string | null;
  ingredientKey?: string | null;
}): RecipeUnitValidationIssue[] {
  const amountDetails = parseRecipeAmount(input.amount);
  const normalizedIngredient = parseRecipeIngredient(input.ingredientName);
  const ingredientKey =
    input.ingredientKey ?? normalizedIngredient.ingredientKey ?? createIngredientKey(input.ingredientName);
  const category = input.category ?? guessFoodCategory(input.ingredientName);
  const expectation = resolveRecipeUnitExpectation({
    ingredientName: input.ingredientName,
    ingredientKey,
    category,
  });
  const issues: RecipeUnitValidationIssue[] = [];

  const isUsuallySeasonedToTaste =
    expectation.id === "flour-sugar-spices" ||
    expectation.id === "olive-oil" ||
    expectation.id === "sauces-and-spreads" ||
    expectation.id === "vinegar-and-liquid-condiments";

  const isAmountOmitted =
    !input.amount ||
    input.amount.trim().length === 0 ||
    input.amount.toLowerCase().includes("chuti");

  if (isAmountOmitted && isUsuallySeasonedToTaste) {
    return issues;
  }

  if (!amountDetails.parseable || amountDetails.quantityValue === null) {
    issues.push({
      ingredientName: input.ingredientName,
      ingredientKey,
      category,
      form: expectation.form,
      amount: input.amount,
      quantityValue: amountDetails.quantityValue,
      rawUnit: amountDetails.rawUnit,
      normalizedUnit: amountDetails.normalizedUnit,
      expectedUnit: expectation.preferredUnit,
      allowedUnits: expectation.allowedUnits,
      errorType: "unit_format_error",
      message: `Ingredient "${input.ingredientName}" must include a parseable amount with unit`,
      suggestedAmount: expectation.preferredUnit ? `1 ${expectation.preferredUnit}` : null,
    });
    return issues;
  }

  if (!amountDetails.hasUnit || !amountDetails.normalizedUnit) {
    issues.push({
      ingredientName: input.ingredientName,
      ingredientKey,
      category,
      form: expectation.form,
      amount: input.amount,
      quantityValue: amountDetails.quantityValue,
      rawUnit: amountDetails.rawUnit,
      normalizedUnit: amountDetails.normalizedUnit,
      expectedUnit: expectation.preferredUnit,
      allowedUnits: expectation.allowedUnits,
      errorType: "unit_format_error",
      message: `Ingredient "${input.ingredientName}" must include an explicit unit`,
      suggestedAmount:
        amountDetails.quantityValue !== null
          ? `${formatQuantity(amountDetails.quantityValue)} ${expectation.preferredUnit}`
          : null,
    });
    return issues;
  }

  if (!RECIPE_ALLOWED_UNITS.includes(amountDetails.normalizedUnit as RecipeAllowedUnit)) {
    issues.push({
      ingredientName: input.ingredientName,
      ingredientKey,
      category,
      form: expectation.form,
      amount: input.amount,
      quantityValue: amountDetails.quantityValue,
      rawUnit: amountDetails.rawUnit,
      normalizedUnit: amountDetails.normalizedUnit,
      expectedUnit: expectation.preferredUnit,
      allowedUnits: expectation.allowedUnits,
      errorType: "unit_format_error",
      message: `Ingredient "${input.ingredientName}" uses unsupported unit "${amountDetails.normalizedUnit}"`,
      suggestedAmount: `${formatQuantity(amountDetails.quantityValue)} ${expectation.preferredUnit}`,
    });
    return issues;
  }

  if (!expectation.allowedUnits.includes(amountDetails.normalizedUnit as RecipeAllowedUnit)) {
    return [];
  }

  return issues;
}

export function validateRecipeIngredientUnitSemantics(input: {
  ingredientName: string;
  amount: string | null;
  category?: string | null;
  ingredientKey?: string | null;
}): RecipeUnitValidationIssue[] {
  const amountDetails = parseRecipeAmount(input.amount);
  const normalizedIngredient = parseRecipeIngredient(input.ingredientName);
  const ingredientKey =
    input.ingredientKey ?? normalizedIngredient.ingredientKey ?? createIngredientKey(input.ingredientName);
  const category = input.category ?? guessFoodCategory(input.ingredientName);
  const expectation = resolveRecipeUnitExpectation({
    ingredientName: input.ingredientName,
    ingredientKey,
    category,
  });
  const issues: RecipeUnitValidationIssue[] = [];

  if (
    !amountDetails.parseable ||
    amountDetails.quantityValue === null ||
    !amountDetails.hasUnit ||
    !amountDetails.normalizedUnit ||
    !RECIPE_ALLOWED_UNITS.includes(amountDetails.normalizedUnit as RecipeAllowedUnit)
  ) {
    return [];
  }

  if (!expectation.allowedUnits.includes(amountDetails.normalizedUnit as RecipeAllowedUnit)) {
    issues.push({
      ingredientName: input.ingredientName,
      ingredientKey,
      category,
      form: expectation.form,
      amount: input.amount,
      quantityValue: amountDetails.quantityValue,
      rawUnit: amountDetails.rawUnit,
      normalizedUnit: amountDetails.normalizedUnit,
      expectedUnit: expectation.preferredUnit,
      allowedUnits: expectation.allowedUnits,
      errorType: "unit_semantic_error",
      message: `Ingredient "${input.ingredientName}" should use ${expectation.allowedUnits.join("/")} instead of ${amountDetails.normalizedUnit}`,
      suggestedAmount: `${formatQuantity(amountDetails.quantityValue)} ${expectation.preferredUnit}`,
    });
  }

  return issues;
}

export function validateRecipeIngredientUnit(input: {
  ingredientName: string;
  amount: string | null;
  category?: string | null;
  ingredientKey?: string | null;
}): RecipeUnitValidationIssue[] {
  return [
    ...validateRecipeIngredientAmountFormat(input),
    ...validateRecipeIngredientUnitSemantics(input),
  ];
}

export function describeRecipeIngredientUnitRule(input: {
  ingredientName: string;
  category?: string | null;
  ingredientKey?: string | null;
}) {
  const expectation = resolveRecipeUnitExpectation(input);

  return {
    form: expectation.form,
    preferredUnit: expectation.preferredUnit,
    allowedUnits: expectation.allowedUnits,
  };
}