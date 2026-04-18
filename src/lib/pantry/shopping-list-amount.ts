import { formatAmountLabel } from "@/lib/pantry/format";
import { normalizeUnit } from "@/lib/units";

const AMOUNT_LABEL_WITH_REQUIRED_UNIT_REGEX =
  /^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*([a-zA-Záčďéíľňóšťúýžäôü]+)$/;

type ShoppingListAmountErrorCode =
  | "amount_requires_unit"
  | "unit_requires_amount"
  | "invalid_quantity"
  | "invalid_amount_label";

export type ShoppingListAmountResult =
  | {
      ok: true;
      quantity: number | null;
      unit: string | null;
      amountLabel: string | null;
    }
  | {
      ok: false;
      code: ShoppingListAmountErrorCode;
      message: string;
    };

function normalizeQuantityValue(
  quantity: string | number | null | undefined,
): number | null {
  if (quantity === null || quantity === undefined || quantity === "") {
    return null;
  }

  if (typeof quantity === "number") {
    return Number.isFinite(quantity) ? quantity : null;
  }

  const normalized = quantity.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  if (normalized.includes("/")) {
    const [numerator, denominator] = normalized.split("/").map(Number);
    if (!denominator || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
      return null;
    }

    return numerator / denominator;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUnitValue(unit: string | null | undefined): string | null {
  const trimmed = unit?.trim();
  if (!trimmed) {
    return null;
  }

  return normalizeUnit(trimmed);
}

export function normalizeShoppingListAmount(
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
): ShoppingListAmountResult {
  const normalizedQuantity = normalizeQuantityValue(quantity);
  const normalizedUnit = normalizeUnitValue(unit);

  if (normalizedQuantity === null && normalizedUnit === null) {
    return {
      ok: true,
      quantity: null,
      unit: null,
      amountLabel: null,
    };
  }

  if (normalizedQuantity !== null && normalizedUnit === null) {
    return {
      ok: false,
      code: "amount_requires_unit",
      message: "Quantity requires an explicit unit",
    };
  }

  if (normalizedQuantity === null && normalizedUnit !== null) {
    return {
      ok: false,
      code: "unit_requires_amount",
      message: "Unit requires an explicit quantity",
    };
  }

  if (normalizedQuantity === null || normalizedUnit === null) {
    return {
      ok: false,
      code: "invalid_quantity",
      message: "Invalid quantity",
    };
  }

  return {
    ok: true,
    quantity: normalizedQuantity,
    unit: normalizedUnit,
    amountLabel: formatAmountLabel(normalizedQuantity, normalizedUnit),
  };
}

export function parseShoppingListAmountLabel(
  amountLabel: string | null | undefined,
): ShoppingListAmountResult {
  const trimmedAmountLabel = amountLabel?.trim();

  if (!trimmedAmountLabel) {
    return {
      ok: true,
      quantity: null,
      unit: null,
      amountLabel: null,
    };
  }

  const match = trimmedAmountLabel.match(AMOUNT_LABEL_WITH_REQUIRED_UNIT_REGEX);
  if (!match) {
    return {
      ok: false,
      code: "invalid_amount_label",
      message: "Amount label must include both quantity and unit",
    };
  }

  return normalizeShoppingListAmount(match[1], match[2]);
}