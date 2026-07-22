"use client";

import { useMemo, type KeyboardEventHandler } from "react";
import { Check, Info, Loader2, X } from "lucide-react";
import { useLocale } from "next-intl";
import * as Tooltip from "@radix-ui/react-tooltip";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localizeUnitLabel } from "@/lib/ingredients/unit-localization";
import { cn } from "@/lib/utils/utils";
import {
  getQuantityQuickAdjustmentRows,
  PANTRY_UNIT_OPTIONS,
} from "@/lib/ingredients/units";

interface QuantityUnitEditorProps {
  quantityLabel: string;
  unitLabel: string;
  categoryLabel?: string;
  trackingModeToggleLabel?: string;
  trackingModeHelpText?: string;
  availabilityLabel?: string;
  availableLabel?: string;
  unavailableLabel?: string;
  quantityPlaceholder: string;
  unitPlaceholder: string;
  cancelLabel: string;
  saveLabel: string;
  quantityValue: string;
  unitValue: string;
  categoryValue?: string;
  trackingModeValue?: "quantity" | "availability";
  inStockValue?: boolean;
  isSaving: boolean;
  inputId?: string;
  categoryOptions?: Array<{ value: string; label: string }>;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onCategoryChange?: (value: string) => void;
  onTrackingModeChange?: (value: "quantity" | "availability") => void;
  onAvailabilityChange?: (value: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
  onQuantityKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

export default function QuantityUnitEditor({
  quantityLabel,
  unitLabel,
  categoryLabel,
  trackingModeToggleLabel,
  trackingModeHelpText,
  availabilityLabel,
  availableLabel,
  unavailableLabel,
  quantityPlaceholder,
  unitPlaceholder,
  cancelLabel,
  saveLabel,
  quantityValue,
  unitValue,
  categoryValue,
  trackingModeValue,
  inStockValue,
  isSaving,
  inputId,
  categoryOptions,
  onQuantityChange,
  onUnitChange,
  onCategoryChange,
  onTrackingModeChange,
  onAvailabilityChange,
  onCancel,
  onSave,
  onQuantityKeyDown,
}: QuantityUnitEditorProps) {
  const locale = useLocale();
  const quantityInputId = inputId ?? "inline-edit-quantity";
  const unitInputId = `${quantityInputId}-unit`;
  const resolvedCategoryOptions = categoryOptions ?? [];
  const resolvedCategoryLabel = categoryLabel ?? "Category";
  const resolvedTrackingModeToggleLabel =
    trackingModeToggleLabel ?? "Availability mode";
  const resolvedTrackingModeHelpText =
    trackingModeHelpText ??
    "Toggle between quantity tracking and simple availability.";
  const resolvedAvailabilityLabel = availabilityLabel ?? "Availability";
  const resolvedAvailableLabel = availableLabel ?? "Available";
  const resolvedUnavailableLabel = unavailableLabel ?? "Unavailable";
  const resolvedCategoryValue = categoryValue ?? "other";
  const resolvedTrackingModeValue = trackingModeValue ?? "quantity";
  const resolvedInStockValue = inStockValue ?? true;
  const handleCategoryChange = onCategoryChange ?? (() => undefined);
  const handleTrackingModeChange = onTrackingModeChange ?? (() => undefined);
  const handleAvailabilityChange = onAvailabilityChange ?? (() => undefined);
  const showCategoryField = resolvedCategoryOptions.length > 0;
  const showTrackingControls =
    trackingModeValue !== undefined || onTrackingModeChange !== undefined;
  const quickAdjustmentRows = getQuantityQuickAdjustmentRows(unitValue);
  const localizedUnit = localizeUnitLabel(unitValue, locale) ?? unitValue;
  const usesDecimalInput = useMemo(() => {
    const normalizedUnit = unitValue.trim().toLowerCase();
    return normalizedUnit === "kg" || normalizedUnit === "l";
  }, [unitValue]);
  const isAvailabilityMode = resolvedTrackingModeValue === "availability";

  function parseDraftQuantity(value: string): number | null {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    const normalizedValue = trimmedValue.replace(",", ".");
    const parsedValue = Number.parseFloat(normalizedValue);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  function formatDraftQuantity(value: number): string {
    const roundedValue = Math.round(value * 100) / 100;

    if (Number.isInteger(roundedValue)) {
      return String(roundedValue);
    }

    return roundedValue
      .toFixed(2)
      .replace(/\.0+$/, "")
      .replace(/(\.\d*?)0+$/, "$1");
  }

  function formatAdjustmentValue(value: number): string {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    }).format(Math.abs(value));
  }

  function getAdjustmentAriaLabel(delta: number): string {
    const isSlovakLocale = locale.startsWith("sk");
    const action = isSlovakLocale
      ? delta > 0
        ? "Zvýšiť"
        : "Znížiť"
      : delta > 0
        ? "Increase"
        : "Decrease";
    const connector = isSlovakLocale ? "o" : "by";

    return `${action} ${connector} ${formatAdjustmentValue(delta)} ${localizedUnit}`.trim();
  }

  function handleQuickAdjust(delta: number) {
    const nextValue = Math.max(0, (parseDraftQuantity(quantityValue) ?? 0) + delta);
    onQuantityChange(formatDraftQuantity(nextValue));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "grid gap-3",
          showCategoryField
            ? "md:grid-cols-[minmax(0,2fr)_minmax(5.5rem,1fr)_minmax(0,1.4fr)]"
            : "md:grid-cols-[minmax(0,2fr)_minmax(5.5rem,1fr)]",
        )}
      >
        <div className={cn("min-w-0", isAvailabilityMode && "opacity-55")}>
          <label
            htmlFor={quantityInputId}
            className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-gray-400"
          >
            {quantityLabel}
          </label>
          <Input
            id={quantityInputId}
            type="number"
            min="0"
            step={usesDecimalInput ? "0.01" : "1"}
            inputMode={usesDecimalInput ? "decimal" : "numeric"}
            value={quantityValue}
            onChange={(event) => onQuantityChange(event.target.value)}
            onKeyDown={onQuantityKeyDown}
            placeholder={quantityPlaceholder}
            className="h-11 rounded-xl border-gray-200 bg-white"
            disabled={isAvailabilityMode}
            autoFocus
          />
        </div>

        <div className={cn("min-w-0", isAvailabilityMode && "opacity-55")}>
          <label
            htmlFor={unitInputId}
            className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-gray-400"
          >
            {unitLabel}
          </label>
          <Select value={unitValue} onValueChange={onUnitChange}>
            <SelectTrigger
              id={unitInputId}
              className="h-11 rounded-xl border-gray-200 bg-white shadow-none"
              disabled={isAvailabilityMode}
            >
              <SelectValue placeholder={unitPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {PANTRY_UNIT_OPTIONS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {localizeUnitLabel(unit, locale) ?? unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showCategoryField ? (
          <div className="min-w-0">
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {resolvedCategoryLabel}
            </label>
            <Select value={resolvedCategoryValue} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white shadow-none">
                <SelectValue placeholder={resolvedCategoryLabel} />
              </SelectTrigger>
              <SelectContent>
                {resolvedCategoryOptions.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {showTrackingControls ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-none">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-gray-700">
                  {resolvedTrackingModeToggleLabel}
                </span>
                <Tooltip.Provider delayDuration={120}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-colors hover:border-eatrivo-purple/20 hover:text-eatrivo-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                        aria-label={resolvedTrackingModeHelpText}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="z-50 max-w-[240px] rounded-lg border border-white/10 bg-eatrivo-black-primary/95 px-3 py-2 text-xs font-medium leading-snug text-white shadow-xl shadow-eatrivo-purple/10 backdrop-blur-md"
                        sideOffset={6}
                        side="top"
                      >
                        {resolvedTrackingModeHelpText}
                        <Tooltip.Arrow className="fill-eatrivo-black-primary/95" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isAvailabilityMode}
                onClick={() =>
                  handleTrackingModeChange(
                    isAvailabilityMode ? "quantity" : "availability",
                  )
                }
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2",
                  isAvailabilityMode
                    ? "border-eatrivo-purple/20 bg-eatrivo-purple"
                    : "border-gray-200 bg-gray-200",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    isAvailabilityMode ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {resolvedAvailabilityLabel}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                disabled={!isAvailabilityMode}
                className={cn(
                  "h-11 rounded-xl border text-sm font-semibold shadow-none",
                  resolvedInStockValue && isAvailabilityMode
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                  !isAvailabilityMode && "cursor-not-allowed opacity-55",
                )}
                onClick={() => handleAvailabilityChange(true)}
                aria-pressed={resolvedInStockValue}
              >
                {resolvedAvailableLabel}
              </Button>
              <Button
                type="button"
                disabled={!isAvailabilityMode}
                className={cn(
                  "h-11 rounded-xl border text-sm font-semibold shadow-none",
                  !resolvedInStockValue && isAvailabilityMode
                    ? "border-gray-300 bg-gray-100 text-gray-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                  !isAvailabilityMode && "cursor-not-allowed opacity-55",
                )}
                onClick={() => handleAvailabilityChange(false)}
                aria-pressed={!resolvedInStockValue}
              >
                {resolvedUnavailableLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        {quickAdjustmentRows.map((row, rowIndex) => (
          <div key={`${unitValue}-${rowIndex}`} className="grid grid-cols-3 gap-2">
            {row.map((delta) => (
              <Button
                key={`${unitValue}-${rowIndex}-${delta}`}
                type="button"
                disabled={isAvailabilityMode}
                className={cn(
                  "h-10 rounded-xl border bg-white text-sm font-semibold shadow-none",
                  isAvailabilityMode
                    ? "cursor-not-allowed opacity-50"
                    : delta > 0
                      ? "text-eatrivo-purple hover:border-eatrivo-purple/20 hover:bg-eatrivo-purple/5"
                      : "text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                )}
                onClick={() => handleQuickAdjust(delta)}
                aria-label={getAdjustmentAriaLabel(delta)}
              >
                {delta > 0 ? "+" : "-"}
                {formatAdjustmentValue(delta)}
              </Button>
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-xl border-2 border-gray-200 bg-white text-gray-700 shadow-none hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
          <span>{cancelLabel}</span>
        </Button>

        <Button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="h-11 rounded-xl bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>{saveLabel}</span>
        </Button>
      </div>
    </div>
  );
}
