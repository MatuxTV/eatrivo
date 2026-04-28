export const CANONICAL_RECIPE_CATEGORY_KEYS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
] as const;

export type CanonicalRecipeCategoryKey =
  (typeof CANONICAL_RECIPE_CATEGORY_KEYS)[number];

const CATEGORY_KEY_ALIASES: Record<string, CanonicalRecipeCategoryKey> = {
  breakfast: "breakfast",
  brunch: "breakfast",
  ranajky: "breakfast",
  lunch: "lunch",
  obed: "lunch",
  dinner: "dinner",
  vecera: "dinner",
  "main-course": "dinner",
  "main-dish": "dinner",
  "lunch-and-dinner": "dinner",
  snack: "snack",
  smoothies: "snack",
  "pre-workout-fuel": "snack",
  "post-workout-fuel": "snack",
  desiata: "snack",
  olovrant: "snack",
  svacina: "snack",
  dessert: "dessert",
  dezert: "dessert",
  treats: "dessert",
  "sweet-treats": "dessert",
};

function slugifyCategoryKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeRecipeCategoryKey(
  value: string | null | undefined,
  fallback: CanonicalRecipeCategoryKey = "dinner",
): CanonicalRecipeCategoryKey {
  if (!value) {
    return fallback;
  }

  return CATEGORY_KEY_ALIASES[slugifyCategoryKey(value)] ?? fallback;
}

export function getRecipeCategoryGradient(
  categoryKey: string | null | undefined,
): string {
  switch (normalizeRecipeCategoryKey(categoryKey)) {
    case "breakfast":
      return "from-amber-500 via-orange-500 to-rose-500";
    case "lunch":
      return "from-emerald-500 via-teal-500 to-cyan-500";
    case "dinner":
      return "from-indigo-500 via-violet-500 to-fuchsia-500";
    case "snack":
      return "from-sky-500 via-cyan-500 to-teal-400";
    case "dessert":
      return "from-rose-500 via-fuchsia-500 to-pink-500";
    default:
      return "from-indigo-500 via-violet-500 to-fuchsia-500";
  }
}