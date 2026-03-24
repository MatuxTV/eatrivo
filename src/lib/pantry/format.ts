import { formatNumber } from "@/lib/formatters";
import { localizeUnitLabel } from "@/lib/unit-localization";
import { normalizeUnit } from "@/lib/units";

interface FormatLocalizedAmountLabelOptions {
  maximumFractionDigits?: number;
}

export function formatAmountLabel(
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (quantity === null || quantity === undefined || quantity === "") {
    return null;
  }

  const normalizedQuantity =
    typeof quantity === "number" ? String(quantity) : quantity;

  return unit ? `${normalizedQuantity} ${unit}`.trim() : normalizedQuantity;
}

function normalizeQuantity(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAmountUnit(unit: string | null | undefined): string | null {
  const trimmedUnit = unit?.trim();

  if (!trimmedUnit) {
    return null;
  }

  return normalizeUnit(trimmedUnit);
}

function parseAmountLabelParts(amountLabel: string): {
  quantity: number | null;
  unit: string | null;
} | null {
  const trimmedAmountLabel = amountLabel.trim();
  if (!trimmedAmountLabel) {
    return null;
  }

  const match = trimmedAmountLabel.match(
    /^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*([a-zA-Záčďéíľňóšťúýžäôü]+)?$/,
  );

  if (!match) {
    return null;
  }

  const rawQuantity = match[1].replace(",", ".");
  const quantity = rawQuantity.includes("/")
    ? (() => {
        const [numerator, denominator] = rawQuantity.split("/").map(Number);
        return denominator ? numerator / denominator : null;
      })()
    : Number.parseFloat(rawQuantity);

  if (quantity === null || !Number.isFinite(quantity)) {
    return null;
  }

  return {
    quantity,
    unit: match[2]?.trim() || null,
  };
}

export function formatLocalizedAmountLabel(
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
  locale: string,
  options?: FormatLocalizedAmountLabelOptions,
): string | null {
  const normalizedQuantity = normalizeQuantity(quantity);
  const normalizedUnit = normalizeAmountUnit(unit);
  const localizedUnit = localizeUnitLabel(normalizedUnit, locale);

  if (normalizedQuantity === null && !localizedUnit) {
    return null;
  }

  if (normalizedQuantity === null) {
    return localizedUnit;
  }

  const formattedQuantity = formatNumber(normalizedQuantity, locale, {
    maximumFractionDigits:
      options?.maximumFractionDigits ??
      (normalizedQuantity % 1 === 0 ? 0 : 2),
  });

  return localizedUnit ? `${formattedQuantity} ${localizedUnit}` : formattedQuantity;
}

export function localizeStoredAmountLabel(
  amountLabel: string | null | undefined,
  locale: string,
): string | null {
  const trimmedAmountLabel = amountLabel?.trim();
  if (!trimmedAmountLabel) {
    return null;
  }

  const parsedAmount = parseAmountLabelParts(trimmedAmountLabel);
  if (!parsedAmount) {
    return localizeUnitLabel(trimmedAmountLabel, locale) ?? trimmedAmountLabel;
  }

  return formatLocalizedAmountLabel(parsedAmount.quantity, parsedAmount.unit, locale);
}

export function localizeAmountForDisplay(
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
  amountLabel: string | null | undefined,
  locale: string,
  options?: FormatLocalizedAmountLabelOptions,
): string | null {
  const localizedFromFields = formatLocalizedAmountLabel(
    quantity,
    unit,
    locale,
    options,
  );

  if (localizedFromFields) {
    return localizedFromFields;
  }

  return localizeStoredAmountLabel(amountLabel, locale);
}