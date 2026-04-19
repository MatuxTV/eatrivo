"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  PackagePlus,
  Pin,
  Trash2,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import InlineEditPanel from "@/components/inline-edit/InlineEditPanel";
import InlineEditToggleButton from "@/components/inline-edit/InlineEditToggleButton";
import QuantityUnitEditor from "@/components/inline-edit/QuantityUnitEditor";
import type { PantryItem } from "@/hooks/usePantry";
import { guessFoodCategory } from "@/lib/ingredients/units";
import { cn } from "@/lib/utils/utils";
import { formatLocalizedAmountLabel } from "@/lib/pantry/format";

interface PantryItemRowProps {
  item: PantryItem;
  locale: string;
  categoryLabel: string;
  categoryValue: string;
  categoryFieldLabel: string;
  categoryOptions: Array<{ value: string; label: string }>;
  expiryLabel: string | null;
  isExpiring: boolean;
  isLowStock: boolean;
  isRecurring: boolean;
  isPendingQuantity: boolean;
  isPendingDelete: boolean;
  isPendingRecurring: boolean;
  sourceLabel: string;
  lowStockLabel: string;
  expiringLabel: string;
  recurringLabel: string;
  editLabel: string;
  saveLabel: string;
  cancelLabel: string;
  quantityLabel: string;
  unitLabel: string;
  quantityPlaceholder: string;
  unitPlaceholder: string;
  quantityCaption: string;
  availabilityCaption: string;
  trackingModeToggleLabel: string;
  trackingModeHelpText: string;
  availableLabel: string;
  unavailableLabel: string;
  toggleAvailabilityLabel: string;
  deleteLabel: string;
  addPackageLabel: string;
  addPackageCtaLabel: string;
  addPackagePendingLabel: string;
  addPackageReadyLabel: string;
  showAddPackageAction: boolean;
  isPendingAddPackage: boolean;
  onDelete: () => void;
  onSaveEdit: (updates: {
    quantity: number | null;
    unit: string | null;
    category: string | null;
    trackingMode: "quantity" | "availability";
    inStock?: boolean;
  }) => Promise<boolean>;
  onToggleRecurring: () => void;
  onAddPackage: () => void;
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

function formatQuantity(
  quantity: string | null,
  unit: string | null,
  locale: string,
): string {
  return formatLocalizedAmountLabel(quantity, unit, locale) ?? "—";
}

function formatDraftQuantityForEditor(
  quantity: string | null,
  unit: string | null,
): string {
  if (!quantity) {
    return "";
  }

  const parsedValue = Number.parseFloat(quantity);
  if (!Number.isFinite(parsedValue)) {
    return quantity;
  }

  const normalizedUnit = (unit ?? "").toLowerCase();
  if (normalizedUnit === "kg" || normalizedUnit === "l") {
    return quantity;
  }

  const roundedValue = Math.round(parsedValue * 1000) / 1000;
  if (Number.isInteger(roundedValue)) {
    return String(roundedValue);
  }

  return roundedValue
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

export default function PantryItemRow({
  item,
  locale,
  categoryLabel,
  categoryValue,
  categoryFieldLabel,
  categoryOptions,
  expiryLabel,
  isExpiring,
  isLowStock,
  isRecurring,
  isPendingQuantity,
  isPendingDelete,
  isPendingRecurring,
  sourceLabel,
  lowStockLabel,
  expiringLabel,
  recurringLabel,
  editLabel,
  saveLabel,
  cancelLabel,
  quantityLabel,
  unitLabel,
  quantityPlaceholder,
  unitPlaceholder,
  quantityCaption,
  availabilityCaption,
  trackingModeToggleLabel,
  trackingModeHelpText,
  availableLabel,
  unavailableLabel,
  toggleAvailabilityLabel,
  deleteLabel,
  addPackageLabel,
  addPackageCtaLabel,
  addPackagePendingLabel,
  addPackageReadyLabel,
  showAddPackageAction,
  isPendingAddPackage,
  onDelete,
  onSaveEdit,
  onToggleRecurring,
  onAddPackage,
}: PantryItemRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isEditing, setIsEditing] = useState(false);
  const [draftQuantity, setDraftQuantity] = useState(
    formatDraftQuantityForEditor(item.quantity, item.unit),
  );
  const [draftUnit, setDraftUnit] = useState(item.unit ?? "ks");
  const [draftCategory, setDraftCategory] = useState(
    item.category ?? categoryValue ?? guessFoodCategory(item.name),
  );
  const [draftTrackingMode, setDraftTrackingMode] = useState<"quantity" | "availability">(
    item.trackingMode,
  );
  const [draftInStock, setDraftInStock] = useState(item.inStock);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setDraftQuantity(formatDraftQuantityForEditor(item.quantity, item.unit));
    setDraftUnit(item.unit ?? "ks");
    setDraftCategory(item.category ?? categoryValue ?? guessFoodCategory(item.name));
    setDraftTrackingMode(item.trackingMode);
    setDraftInStock(item.inStock);
  }, [categoryValue, item.category, item.inStock, item.name, item.quantity, item.trackingMode, item.unit]);

  return (
    <motion.article
      layout={!shouldReduceMotion}
      {...(shouldReduceMotion ? {} : fadeIn)}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      className={cn(
        "bg-white rounded-2xl border shadow-sm p-4 md:p-5 transition-colors hover:border-gray-200",
        isExpiring
          ? "border-eatrivo-red/20"
          : isLowStock
            ? "border-eatrivo-orange/20"
            : "border-gray-100",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {item.name}
            </h3>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-gray-200 bg-eatrivo-white-secondary text-gray-600"
              >
                {categoryLabel}
              </Badge>

              <Badge
                variant="outline"
                className="rounded-full border-gray-200 bg-eatrivo-white-secondary text-gray-600"
              >
                {sourceLabel}
              </Badge>

              {isLowStock ? (
                <Badge className="rounded-full border-transparent bg-eatrivo-orange/10 text-eatrivo-orange">
                  {lowStockLabel}
                </Badge>
              ) : null}

              {isExpiring ? (
                <Badge className="rounded-full border-transparent bg-eatrivo-red/10 text-eatrivo-red">
                  {expiringLabel}
                </Badge>
              ) : null}
            </div>

            {expiryLabel ? <p className="text-xs text-gray-500">{expiryLabel}</p> : null}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                {item.trackingMode === "availability" ? availabilityCaption : quantityCaption}
              </p>
              {item.trackingMode === "availability" ? (
                <Badge
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-semibold",
                    item.inStock
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-50 text-gray-600",
                  )}
                >
                  {item.inStock ? availableLabel : unavailableLabel}
                </Badge>
              ) : (
                <p className="text-lg font-bold text-eatrivo-purple">
                  {isPendingQuantity ? (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : (
                  formatQuantity(item.quantity, item.unit, locale)
                )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {showAddPackageAction ? (
                <button
                  type="button"
                  onClick={onAddPackage}
                  disabled={isPendingAddPackage}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-eatrivo-blue/20 bg-eatrivo-blue/10 px-4 text-sm font-semibold text-eatrivo-blue transition-colors hover:bg-eatrivo-blue/15 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                  aria-label={addPackageLabel}
                  title={addPackageLabel}
                >
                  {isPendingAddPackage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PackagePlus className="h-4 w-4" />
                  )}
                  <span>
                    {isPendingAddPackage
                      ? addPackagePendingLabel
                      : item.isOnActiveShoppingList
                        ? addPackageReadyLabel
                        : addPackageCtaLabel}
                  </span>
                </button>
              ) : null}

              <InlineEditToggleButton
                label={editLabel}
                isActive={isEditing}
                onClick={() => setIsEditing((current) => !current)}
                disabled={isSavingEdit}
              />

              <button
                type="button"
                onClick={onToggleRecurring}
                disabled={isPendingRecurring}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2",
                  isRecurring
                    ? "border-eatrivo-purple bg-eatrivo-purple text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-eatrivo-purple/10 hover:text-eatrivo-purple",
                )}
                aria-label={recurringLabel}
                aria-pressed={isRecurring}
                title={recurringLabel}
              >
                {isPendingRecurring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={onDelete}
                disabled={isPendingDelete}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-colors hover:border-eatrivo-red/20 hover:bg-eatrivo-red/10 hover:text-eatrivo-red disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                aria-label={deleteLabel}
              >
                {isPendingDelete ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {isEditing ? (
            <InlineEditPanel
              isOpen={isEditing}
              className="pt-1"
              panelClassName="border-gray-100 bg-none bg-eatrivo-white-secondary shadow-none"
            >
              <QuantityUnitEditor
                quantityLabel={quantityLabel}
                unitLabel={unitLabel}
                categoryLabel={categoryFieldLabel}
                trackingModeToggleLabel={trackingModeToggleLabel}
                trackingModeHelpText={trackingModeHelpText}
                availabilityLabel={toggleAvailabilityLabel}
                availableLabel={availableLabel}
                unavailableLabel={unavailableLabel}
                quantityPlaceholder={quantityPlaceholder}
                unitPlaceholder={unitPlaceholder}
                cancelLabel={cancelLabel}
                saveLabel={saveLabel}
                quantityValue={draftQuantity}
                unitValue={draftUnit}
                categoryValue={draftCategory}
                trackingModeValue={draftTrackingMode}
                inStockValue={draftInStock}
                isSaving={isSavingEdit}
                categoryOptions={categoryOptions}
                onQuantityChange={setDraftQuantity}
                onUnitChange={(nextUnit) => {
                  setDraftUnit(nextUnit);
                  setDraftQuantity((current) =>
                    formatDraftQuantityForEditor(current, nextUnit),
                  );
                }}
                onCategoryChange={setDraftCategory}
                onTrackingModeChange={setDraftTrackingMode}
                onAvailabilityChange={setDraftInStock}
                onCancel={() => {
                  setDraftQuantity(formatDraftQuantityForEditor(item.quantity, item.unit));
                  setDraftUnit(item.unit ?? "ks");
                  setDraftCategory(item.category ?? categoryValue ?? guessFoodCategory(item.name));
                  setDraftTrackingMode(item.trackingMode);
                  setDraftInStock(item.inStock);
                  setIsEditing(false);
                }}
                onSave={async () => {
                  setIsSavingEdit(true);
                  try {
                    const parsedQuantity = draftQuantity.trim()
                      ? Number.parseFloat(draftQuantity)
                      : null;
                    const success = await onSaveEdit({
                      quantity:
                        draftTrackingMode === "quantity" &&
                        parsedQuantity !== null &&
                        Number.isFinite(parsedQuantity)
                          ? parsedQuantity
                          : null,
                      unit: draftTrackingMode === "quantity" ? draftUnit || null : null,
                      category: draftCategory || null,
                      trackingMode: draftTrackingMode,
                      ...(draftTrackingMode === "availability"
                        ? { inStock: draftInStock }
                        : {}),
                    });

                    if (success) {
                      setIsEditing(false);
                    }
                  } finally {
                    setIsSavingEdit(false);
                  }
                }}
              />
            </InlineEditPanel>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
