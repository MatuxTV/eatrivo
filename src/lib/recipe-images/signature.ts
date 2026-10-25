// Dish identity helpers used to detect when two recipes would produce the same
// image, so we can reuse a generated photo instead of paying for a new one.

const FILLER_WORDS = new Set([
  "with",
  "and",
  "the",
  "a",
  "s",
  "so",
  "na",
  "z",
  "zo",
  "v",
  "vo",
  "recipe",
]);

export function normalizeDishName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 0 && !FILLER_WORDS.has(word))
    .join(" ");
}

export function getDishSignature(input: {
  nameEn: string;
  ingredientKeys: string[];
}): string {
  const normalizedName = normalizeDishName(input.nameEn);

  const ingredientKeys = Array.from(
    new Set(
      input.ingredientKeys
        .map((key) => key.trim().toLowerCase())
        .filter((key) => key.length > 0),
    ),
  )
    .sort()
    .slice(0, 5);

  return `${normalizedName}|${ingredientKeys.join(",")}`;
}
