"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  PackagePlus,
  Pencil,
  Pin,
  Trash2,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import QuantityUnitEditor from "@/components/inline-edit/QuantityUnitEditor";
import type { PantryItem } from "@/hooks/usePantry";
import { guessFoodCategory } from "@/lib/ingredients/units";
import { PANTRY_QUANTITY_TRACKING } from "@/lib/config/features";
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
  return (
    formatLocalizedAmountLabel(quantity, unit, locale, {
      maximumFractionDigits: 2,
    }) ?? "—"
  );
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

  const roundedValue = Math.round(parsedValue * 100) / 100;
  if (Number.isInteger(roundedValue)) {
    return String(roundedValue);
  }

  return roundedValue
    .toFixed(2)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

export default function PantryItemRow({
  item,
  locale,
  categoryValue,
  categoryFieldLabel,
  categoryOptions,
  expiryLabel,
  expiringLabel,
  isExpiring,
  isLowStock,
  isRecurring,
  isPendingDelete,
  isPendingRecurring,
  lowStockLabel,
  recurringLabel,
  editLabel,
  saveLabel,
  cancelLabel,
  quantityLabel,
  unitLabel,
  quantityPlaceholder,
  unitPlaceholder,
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

  // [PANTRY_QUANTITY_TRACKING] flag off: the sub-line shows only "out of stock" and the expiry, never an amount
  const stockText =
    item.trackingMode === "availability"
      ? item.inStock
        ? availableLabel
        : unavailableLabel
      : formatQuantity(item.quantity, item.unit, locale);
  const expiryText = expiryLabel ? `${expiringLabel} ${expiryLabel}` : null;
  const subline = (
    PANTRY_QUANTITY_TRACKING
      ? [stockText, isLowStock ? lowStockLabel : null, expiryText]
      : [item.inStock ? null : unavailableLabel, expiryText]
  )
    .filter(Boolean)
    .join(" · ");

  return (
    <motion.article
      layout={!shouldReduceMotion}
      {...(shouldReduceMotion ? {} : fadeIn)}
      className="flex items-center gap-2 py-1.5 pl-[58px]"
    >
      <div className="min-w-0 flex-1">
        <h4
          className={cn(
            "truncate text-[15px] font-semibold leading-5 tracking-[-0.01em]",
            item.inStock ? "text-gray-900" : "text-gray-400",
          )}
        >
          {item.name}
        </h4>
        {subline ? (
          <p
            className={cn(
              "truncate text-[13px] font-medium leading-[18px]",
              isExpiring ? "text-eatrivo-red" : "text-gray-500",
            )}
          >
            {subline}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {/* [PANTRY_QUANTITY_TRACKING] flag off: no pack/restock action */}
        {PANTRY_QUANTITY_TRACKING && showAddPackageAction ? (
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

        {/* [PANTRY_QUANTITY_TRACKING] flag off: no recurring-restock pin */}
        {PANTRY_QUANTITY_TRACKING ? (
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
        ) : null}

        <button
          type="button"
          onClick={() => setIsEditing((current) => !current)}
          disabled={isSavingEdit}
          aria-label={editLabel}
          title={editLabel}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E9D9FF] bg-white text-eatrivo-purple transition-[transform,background-color] duration-150 hover:bg-eatrivo-purple/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
        >
          <Pencil className="h-[18px] w-[18px]" />
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={isPendingDelete}
          aria-label={deleteLabel}
          title={deleteLabel}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 transition-[transform,background-color] duration-150 hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
        >
          {isPendingDelete ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <Trash2 className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>

      <Dialog
        open={isEditing}
        onOpenChange={(open) => {
          if (!open) {
            setDraftQuantity(formatDraftQuantityForEditor(item.quantity, item.unit));
            setDraftUnit(item.unit ?? "ks");
            setDraftCategory(item.category ?? categoryValue ?? guessFoodCategory(item.name));
            setDraftTrackingMode(item.trackingMode);
            setDraftInStock(item.inStock);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="font-brand top-auto bottom-0 left-0 max-h-[90dvh] max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-[28px] border-0 bg-white p-5 pb-7 data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95"
        >
          <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
          <DialogTitle className="sr-only">{item.name}</DialogTitle>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate text-[22px] font-bold leading-7 tracking-[-0.025em] text-gray-900">
              {item.name}
            </h3>
            <DialogClose asChild>
              <button
                type="button"
                aria-label={cancelLabel}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-[transform,background-color] duration-150 hover:bg-gray-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
          {/* [PANTRY_QUANTITY_TRACKING] flag off: presence-only editor */}
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
            presenceOnly={!PANTRY_QUANTITY_TRACKING}
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
        </DialogContent>
      </Dialog>
    </motion.article>
  );
}
