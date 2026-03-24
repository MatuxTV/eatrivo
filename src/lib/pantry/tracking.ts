export type PantryTrackingMode = "quantity" | "availability";

interface PantryTrackingInferenceInput {
  name?: string | null;
  ingredientKey?: string | null;
  ingredientSpecificKey?: string | null;
  trackingMode?: PantryTrackingMode | null;
  aiRecommendedTrackingMode?: PantryTrackingMode | null;
  quantity?: number | null;
  unit?: string | null;
}

const STAPLE_KEYS = new Set([
  "garlic",
  "salt",
  "black-pepper",
  "pepper",
  "olive-oil",
  "oil",
  "soy-sauce",
  "vinegar",
]);

const STAPLE_PATTERNS = [
  /(^|\b)garlic(\b|$)/i,
  /(^|\b)cesnak(\b|$)/i,
  /(^|\b)salt(\b|$)/i,
  /(^|\b)sol(\b|$)/i,
  /(^|\b)pepper(\b|$)/i,
  /(^|\b)korenie(\b|$)/i,
  /(^|\b)olive oil(\b|$)/i,
  /(^|\b)olivovy olej(\b|$)/i,
  /(^|\b)olivový olej(\b|$)/i,
  /(^|\b)soy sauce(\b|$)/i,
  /(^|\b)sojova omacka(\b|$)/i,
  /(^|\b)sójová omáčka(\b|$)/i,
  /(^|\b)vinegar(\b|$)/i,
  /(^|\b)ocot(\b|$)/i,
];

function normalizeLookup(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function hasExplicitQuantitySignal(
  input: PantryTrackingInferenceInput,
): boolean {
  return typeof input.quantity === "number" && Number.isFinite(input.quantity);
}

export function isDefaultAvailabilityStaple(
  input: Omit<PantryTrackingInferenceInput, "trackingMode">,
): boolean {
  const keys = [input.ingredientSpecificKey, input.ingredientKey]
    .map((value) => normalizeLookup(value))
    .filter(Boolean);

  if (keys.some((value) => STAPLE_KEYS.has(value))) {
    return true;
  }

  const normalizedName = normalizeLookup(input.name);
  if (!normalizedName) {
    return false;
  }

  return STAPLE_PATTERNS.some((pattern) => pattern.test(normalizedName));
}

export function isStampedAvailabilityCandidate(
  input: Omit<PantryTrackingInferenceInput, "trackingMode">,
): boolean {
  if (isDefaultAvailabilityStaple(input)) {
    return true;
  }

  return input.aiRecommendedTrackingMode === "availability";
}

export function shouldPreservePantryQuantity(
  input: PantryTrackingInferenceInput,
): boolean {
  if (!hasExplicitQuantitySignal(input)) {
    return false;
  }

  if (input.trackingMode === "quantity") {
    return true;
  }

  return isStampedAvailabilityCandidate(input);
}

export function supportsPantryQuantityMutations(
  input: PantryTrackingInferenceInput,
): boolean {
  if (input.trackingMode === "quantity") {
    return true;
  }

  return shouldPreservePantryQuantity(input);
}

export function resolvePantryTrackingMode(
  input: PantryTrackingInferenceInput,
): PantryTrackingMode {
  if (input.trackingMode) {
    return input.trackingMode;
  }

  if (input.aiRecommendedTrackingMode === "availability") {
    return "availability";
  }

  if (input.aiRecommendedTrackingMode === "quantity") {
    return "quantity";
  }

  if (isDefaultAvailabilityStaple(input)) {
    return "availability";
  }

  if (hasExplicitQuantitySignal(input)) {
    return "quantity";
  }

  return "quantity";
}