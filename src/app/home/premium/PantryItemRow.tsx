"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Minus,
  PackagePlus,
  Pin,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import type { PantryItem } from "@/hooks/usePantry";
import { cn } from "@/lib/utils";
import InlineEditPanel from "@/app/home/components/InlineEditPanel";
import InlineEditToggleButton from "@/app/home/components/InlineEditToggleButton";
import QuantityUnitEditor from "@/app/home/components/QuantityUnitEditor";
import { formatLocalizedAmountLabel } from "@/lib/pantry/format";

interface PantryItemRowProps {
  item: PantryItem;
  locale: string;
  categoryLabel: string;
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
  availableLabel: string;
  unavailableLabel: string;
  toggleAvailabilityLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  deleteLabel: string;
  addPackageLabel: string;
  addPackageCtaLabel: string;
  addPackagePendingLabel: string;
  addPackageReadyLabel: string;
  showAddPackageAction: boolean;
  isPendingAddPackage: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onDelete: () => void;
  onSaveEdit: (updates: {
    quantity: number | null;
    unit: string | null;
  }) => Promise<boolean>;
  onToggleAvailability: () => void;
  onToggleRecurring: () => void;
  onAddPackage: () => void;
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

function parseStoredNumber(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatQuantity(
  quantity: string | null,
  unit: string | null,
  locale: string,
): string {
  return formatLocalizedAmountLabel(quantity, unit, locale) ?? "—";
}

export default function PantryItemRow({
  item,
  locale,
  categoryLabel,
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
  availableLabel,
  unavailableLabel,
  toggleAvailabilityLabel,
  decreaseLabel,
  increaseLabel,
  deleteLabel,
  addPackageLabel,
  addPackageCtaLabel,
  addPackagePendingLabel,
  addPackageReadyLabel,
  showAddPackageAction,
  isPendingAddPackage,
  onIncrease,
  onDecrease,
  onDelete,
  onSaveEdit,
  onToggleAvailability,
  onToggleRecurring,
  onAddPackage,
}: PantryItemRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const quantityValue = parseStoredNumber(item.quantity) ?? 0;
  const isAvailabilityMode = item.trackingMode === "availability";
  const [isEditing, setIsEditing] = useState(false);
  const [draftQuantity, setDraftQuantity] = useState(item.quantity ?? "");
  const [draftUnit, setDraftUnit] = useState(item.unit ?? "ks");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setDraftQuantity(item.quantity ?? "");
    setDraftUnit(item.unit ?? "ks");
  }, [item.quantity, item.unit]);

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
                {isAvailabilityMode ? availabilityCaption : quantityCaption}
              </p>
              <p className="text-lg font-bold text-eatrivo-purple">
                {isAvailabilityMode ? (
                  item.inStock ? availableLabel : unavailableLabel
                ) : isPendingQuantity ? (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : (
                  formatQuantity(item.quantity, item.unit, locale)
                )}
              </p>
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

              {isAvailabilityMode ? (
                <button
                  type="button"
                  onClick={onToggleAvailability}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2",
                    item.inStock
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                  )}
                  aria-label={toggleAvailabilityLabel}
                >
                  {item.inStock ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span>{item.inStock ? availableLabel : unavailableLabel}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 rounded-full border border-gray-100 bg-eatrivo-white-secondary p-1">
                  <button
                    type="button"
                    onClick={onDecrease}
                    disabled={isPendingQuantity || quantityValue <= 0}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    aria-label={decreaseLabel}
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onIncrease}
                    disabled={isPendingQuantity}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-eatrivo-purple text-white transition-colors hover:bg-eatrivo-purple/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    aria-label={increaseLabel}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}

              {!isAvailabilityMode ? (
                <InlineEditToggleButton
                  label={editLabel}
                  isActive={isEditing}
                  onClick={() => setIsEditing((current) => !current)}
                  disabled={isSavingEdit}
                />
              ) : null}

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

          {!isAvailabilityMode ? (
            <InlineEditPanel
              isOpen={isEditing}
              className="pt-1"
              panelClassName="border-gray-100 bg-none bg-eatrivo-white-secondary shadow-none"
            >
              <QuantityUnitEditor
                quantityLabel={quantityLabel}
                unitLabel={unitLabel}
                quantityPlaceholder={quantityPlaceholder}
                unitPlaceholder={unitPlaceholder}
                cancelLabel={cancelLabel}
                saveLabel={saveLabel}
                quantityValue={draftQuantity}
                unitValue={draftUnit}
                isSaving={isSavingEdit}
                onQuantityChange={setDraftQuantity}
                onUnitChange={setDraftUnit}
                onCancel={() => {
                  setDraftQuantity(item.quantity ?? "");
                  setDraftUnit(item.unit ?? "ks");
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
                        parsedQuantity !== null && Number.isFinite(parsedQuantity)
                          ? parsedQuantity
                          : null,
                      unit: draftUnit || null,
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
