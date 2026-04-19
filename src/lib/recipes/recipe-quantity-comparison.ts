import { formatLocalizedAmountLabel } from "@/lib/pantry/format";
import {
  fromCanonicalQuantity,
  normalizeUnit,
  subtractQuantity,
  toCanonicalQuantity,
} from "@/lib/ingredients/units";

export type RecipeIngredientPantryComparisonStatus =
  | "enough"
  | "insufficient"
  | "unit-mismatch"
  | "missing-pantry-quantity"
  | "missing-recipe-quantity"
  | "available-staple"
  | "unavailable";

export interface RecipeIngredientPantryComparison {
  status: RecipeIngredientPantryComparisonStatus;
  canCompare: boolean;
  isEnough: boolean | null;
  requiredQuantity: number | null;
  requiredUnit: string | null;
  requiredLabel: string | null;
  availableQuantity: number | null;
  availableUnit: string | null;
  availableLabel: string | null;
  missingQuantity: number | null;
  missingLabel: string | null;
  matchingPantryItems: number;
}

interface PantryQuantityCandidate {
  trackingMode?: "quantity" | "availability" | null;
  inStock?: boolean | null;
  quantity: string | number | null | undefined;
  unit: string | null | undefined;
}

function normalizeNumericQuantity(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatQuantityLabel(
  quantity: number | null,
  unit: string | null,
  locale: string,
): string | null {
  return formatLocalizedAmountLabel(quantity, unit, locale, {
    maximumFractionDigits: 3,
  });
}

export function buildRecipeIngredientPantryComparison(
  requiredQuantity: string | number | null | undefined,
  requiredUnit: string | null | undefined,
  pantryCandidates: PantryQuantityCandidate[],
  locale: string,
): RecipeIngredientPantryComparison {
  const availablePantryCandidates = pantryCandidates.filter(
    (candidate) => candidate.inStock ?? true,
  );
  const normalizedRequiredQuantity = normalizeNumericQuantity(requiredQuantity);
  const normalizedRequiredUnit = requiredUnit?.trim()
    ? normalizeUnit(requiredUnit)
    : null;
  const canonicalRequired =
    normalizedRequiredQuantity !== null && normalizedRequiredUnit
      ? toCanonicalQuantity(normalizedRequiredQuantity, normalizedRequiredUnit)
      : null;

  const comparableCandidates = availablePantryCandidates
    .map((candidate) => ({
      trackingMode: candidate.trackingMode ?? "quantity",
      inStock: candidate.inStock ?? true,
      quantity: normalizeNumericQuantity(candidate.quantity),
      unit: candidate.unit?.trim() ? normalizeUnit(candidate.unit) : null,
      canonical:
        normalizeNumericQuantity(candidate.quantity) !== null &&
        candidate.unit?.trim()
          ? toCanonicalQuantity(
              normalizeNumericQuantity(candidate.quantity) as number,
              candidate.unit,
            )
          : null,
    }))
    .filter((candidate) => candidate.quantity !== null);
  const availableStapleCandidates = availablePantryCandidates.filter(
    (candidate) =>
      (candidate.trackingMode ?? "quantity") === "availability" &&
      (candidate.inStock ?? true),
  );

  const requiredLabel = formatQuantityLabel(
    normalizedRequiredQuantity,
    normalizedRequiredUnit,
    locale,
  );

  if (normalizedRequiredQuantity === null) {
    return {
      status: "missing-recipe-quantity",
      canCompare: false,
      isEnough: null,
      requiredQuantity: null,
      requiredUnit: normalizedRequiredUnit,
      requiredLabel,
      availableQuantity: null,
      availableUnit: null,
      availableLabel: null,
      missingQuantity: null,
      missingLabel: null,
      matchingPantryItems: pantryCandidates.length,
    };
  }

  if (normalizedRequiredUnit && !canonicalRequired) {
    return {
      status: "unit-mismatch",
      canCompare: false,
      isEnough: null,
      requiredQuantity: normalizedRequiredQuantity,
      requiredUnit: normalizedRequiredUnit,
      requiredLabel,
      availableQuantity: null,
      availableUnit: null,
      availableLabel: null,
      missingQuantity: null,
      missingLabel: null,
      matchingPantryItems: availablePantryCandidates.length,
    };
  }

  if (availableStapleCandidates.length > 0) {
    return {
      status: "available-staple",
      canCompare: false,
      isEnough: true,
      requiredQuantity: normalizedRequiredQuantity,
      requiredUnit: normalizedRequiredUnit,
      requiredLabel,
      availableQuantity: null,
      availableUnit: null,
      availableLabel: null,
      missingQuantity: 0,
      missingLabel: null,
      matchingPantryItems: availableStapleCandidates.length,
    };
  }

  const sameUnitCandidates = canonicalRequired
    ? comparableCandidates.filter(
        (candidate) =>
          candidate.canonical?.dimension === canonicalRequired.dimension &&
          candidate.canonical?.unit === canonicalRequired.unit,
      )
    : comparableCandidates.filter(
        (candidate) => candidate.unit === normalizedRequiredUnit,
      );

  if (sameUnitCandidates.length > 0) {
    const availableQuantity = canonicalRequired
      ? sameUnitCandidates.reduce(
          (sum, candidate) => sum + (candidate.canonical?.value ?? 0),
          0,
        )
      : sameUnitCandidates.reduce(
          (sum, candidate) => sum + (candidate.quantity ?? 0),
          0,
        );
    const comparisonTarget = canonicalRequired?.value ?? normalizedRequiredQuantity;
    const comparisonUnit = normalizedRequiredUnit ?? canonicalRequired?.sourceUnit ?? null;
    const isEnough = availableQuantity >= comparisonTarget;
    const missingQuantity = isEnough
      ? 0
      : subtractQuantity(comparisonTarget, availableQuantity);
    const localizedAvailableQuantity =
      canonicalRequired && comparisonUnit
        ? fromCanonicalQuantity(availableQuantity, comparisonUnit) ?? availableQuantity
        : availableQuantity;
    const localizedMissingQuantity =
      canonicalRequired && comparisonUnit
        ? fromCanonicalQuantity(missingQuantity, comparisonUnit) ?? missingQuantity
        : missingQuantity;

    return {
      status: isEnough ? "enough" : "insufficient",
      canCompare: true,
      isEnough,
      requiredQuantity: normalizedRequiredQuantity,
      requiredUnit: normalizedRequiredUnit,
      requiredLabel,
      availableQuantity: localizedAvailableQuantity,
      availableUnit: comparisonUnit,
      availableLabel: formatQuantityLabel(
        localizedAvailableQuantity,
        comparisonUnit,
        locale,
      ),
      missingQuantity: localizedMissingQuantity,
      missingLabel: isEnough
        ? null
        : formatQuantityLabel(localizedMissingQuantity, comparisonUnit, locale),
      matchingPantryItems: sameUnitCandidates.length,
    };
  }

  if (
    comparableCandidates.some(
      (candidate) => candidate.canonical !== null || candidate.unit !== null,
    )
  ) {
    return {
      status: "unit-mismatch",
      canCompare: false,
      isEnough: null,
      requiredQuantity: normalizedRequiredQuantity,
      requiredUnit: normalizedRequiredUnit,
      requiredLabel,
      availableQuantity: null,
      availableUnit: null,
      availableLabel: null,
      missingQuantity: null,
      missingLabel: null,
      matchingPantryItems: comparableCandidates.length,
    };
  }

  if (availablePantryCandidates.length > 0) {
    return {
      status: "missing-pantry-quantity",
      canCompare: false,
      isEnough: null,
      requiredQuantity: normalizedRequiredQuantity,
      requiredUnit: normalizedRequiredUnit,
      requiredLabel,
      availableQuantity: null,
      availableUnit: null,
      availableLabel: null,
      missingQuantity: null,
      missingLabel: null,
      matchingPantryItems: availablePantryCandidates.length,
    };
  }

  if (pantryCandidates.length > 0) {
    return {
      status: "unavailable",
      canCompare: false,
      isEnough: false,
      requiredQuantity: normalizedRequiredQuantity,
      requiredUnit: normalizedRequiredUnit,
      requiredLabel,
      availableQuantity: null,
      availableUnit: null,
      availableLabel: null,
      missingQuantity: normalizedRequiredQuantity,
      missingLabel: requiredLabel,
      matchingPantryItems: 0,
    };
  }

  return {
    status: "unavailable",
    canCompare: false,
    isEnough: false,
    requiredQuantity: normalizedRequiredQuantity,
    requiredUnit: normalizedRequiredUnit,
    requiredLabel,
    availableQuantity: 0,
    availableUnit: normalizedRequiredUnit,
    availableLabel: formatQuantityLabel(0, normalizedRequiredUnit, locale),
    missingQuantity: normalizedRequiredQuantity,
    missingLabel: formatQuantityLabel(
      normalizedRequiredQuantity,
      normalizedRequiredUnit,
      locale,
    ),
    matchingPantryItems: 0,
  };
}