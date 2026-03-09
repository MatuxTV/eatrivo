/**
 * Utility functions for parsing and normalizing ingredient quantities and units.
 * Used by the Pantry import feature to structure raw markdown shopping list text.
 */

const UNIT_ALIASES: Record<string, string> = {
  // Weight
  gram: "g",
  grams: "g",
  gramov: "g",
  gramme: "g",
  kilogram: "kg",
  kilograms: "kg",
  kg: "kg",
  lbs: "lbs",
  lb: "lbs",
  pound: "lbs",
  pounds: "lbs",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  // Volume
  milliliter: "ml",
  millilitre: "ml",
  ml: "ml",
  liter: "l",
  litre: "l",
  l: "l",
  dl: "dl",
  deciliter: "dl",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  lyzica: "tbsp",
  lyzice: "tbsp",
  lyzic: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  lyzicka: "tsp",
  lyzicky: "tsp",
  lyziciek: "tsp",
  // Count
  piece: "ks",
  pieces: "ks",
  ks: "ks",
  kus: "ks",
  kusy: "ks",
  pcs: "ks",
  pack: "bal",
  package: "bal",
  balenie: "bal",
  bal: "bal",
  can: "plechovka",
  tin: "plechovka",
  bottle: "fľaša",
  bunch: "zväzok",
  zviazok: "zväzok",
  head: "hlávka",
};

export type CanonicalUnitDimension = "mass" | "volume" | "count";

export interface CanonicalQuantity {
  value: number;
  unit: "g" | "ml" | "ks";
  dimension: CanonicalUnitDimension;
  sourceUnit: string;
}

const CANONICAL_UNIT_CONVERSIONS: Record<
  string,
  { dimension: CanonicalUnitDimension; targetUnit: "g" | "ml" | "ks"; multiplier: number }
> = {
  g: { dimension: "mass", targetUnit: "g", multiplier: 1 },
  kg: { dimension: "mass", targetUnit: "g", multiplier: 1000 },
  ml: { dimension: "volume", targetUnit: "ml", multiplier: 1 },
  dl: { dimension: "volume", targetUnit: "ml", multiplier: 100 },
  tsp: { dimension: "volume", targetUnit: "ml", multiplier: 5 },
  tbsp: { dimension: "volume", targetUnit: "ml", multiplier: 15 },
  ks: { dimension: "count", targetUnit: "ks", multiplier: 1 },
};

/**
 * Normalize a unit string to a canonical form.
 * e.g. "grams" → "g", "Kilogram" → "kg", "pieces" → "ks"
 */
export function normalizeUnit(rawUnit: string): string {
  const lower = rawUnit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

/**
 * Parse a quantity string like "600 g", "2 ks", "1/2 lbs", "1.5l".
 * Returns null if not parseable.
 */
export function parseQuantity(
  text: string,
): { value: number; unit: string } | null {
  // Match: optional number (int, decimal, fraction) + optional whitespace + optional unit
  const match = text
    .trim()
    .match(/^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*([a-zA-Záčďéíľňóšťúýžäôü]*)?$/);
  if (!match) return null;

  let value: number;
  const rawValue = match[1].replace(",", ".");

  if (rawValue.includes("/")) {
    // fraction
    const [num, den] = rawValue.split("/").map(Number);
    if (!den) return null;
    value = num / den;
  } else {
    value = parseFloat(rawValue);
  }

  if (isNaN(value)) return null;

  const unit = match[2] ? normalizeUnit(match[2]) : "ks";
  return { value, unit };
}

export function toCanonicalQuantity(
  value: number,
  unit: string,
): CanonicalQuantity | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const normalizedUnit = normalizeUnit(unit);
  const conversion = CANONICAL_UNIT_CONVERSIONS[normalizedUnit];

  if (!conversion) {
    return null;
  }

  return {
    value: value * conversion.multiplier,
    unit: conversion.targetUnit,
    dimension: conversion.dimension,
    sourceUnit: normalizedUnit,
  };
}

/**
 * Subtract used quantity from pantry quantity.
 * Returns the remaining quantity (minimum 0).
 * Both must be in the same normalized base unit — caller is responsible for conversion.
 */
export function subtractQuantity(
  pantryAmount: number,
  usedAmount: number,
): number {
  return Math.max(0, pantryAmount - usedAmount);
}

/**
 * Guess a food category from item name.
 * Returns a simple category string for UI grouping.
 */
export function guessFoodCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/mlieko|syr|jogurt|maslo|smotana|tvaroh|milk|cheese|yogurt|butter|cream/.test(lower))
    return "dairy";
  if (/kurac|hovädz|brav|ryb|losos|tuniak|šunka|salam|chicken|beef|pork|fish|salmon|tuna|ham|sausage|turkey|lamb/.test(lower))
    return "meat_fish";
  if (/jablk|banán|pomaranč|jahod|čučoried|hrozn|apple|banana|orange|strawberr|blueberr|grape|lemon|mango|peach|pear/.test(lower))
    return "fruit";
  if (/zemiak|mrkva|paradaj|uhor|cibuľ|cesnak|špenát|kapust|potato|carrot|tomato|cucumber|onion|garlic|spinach|cabbage|broccoli|pepper|zucchini/.test(lower))
    return "vegetables";
  if (/chlieb|rohlík|cestoviny|ryža|ovsená|múka|bread|pasta|rice|oat|flour|noodle|cracker/.test(lower))
    return "grains";
  if (/vajc|egg/.test(lower)) return "eggs";
  if (/olej|ocot|soľ|korenie|horčica|kečup|oil|vinegar|salt|mustard|ketchup|sauce|spice/.test(lower))
    return "condiments";
  if (/káva|čaj|džús|voda|nápoj|coffee|tea|juice|water|drink|soda/.test(lower))
    return "beverages";
  if (/oriešky|mandle|vlašský|nut|almond|walnut|cashew|pistachio|peanut|seed/.test(lower))
    return "nuts_seeds";
  return "other";
}
