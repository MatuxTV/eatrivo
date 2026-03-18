"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Minus,
  Pencil,
  Pin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PantryItem } from "@/hooks/usePantry";
import { PANTRY_UNIT_OPTIONS } from "@/lib/units";
import { cn } from "@/lib/utils";

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
  decreaseLabel: string;
  increaseLabel: string;
  deleteLabel: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onDelete: () => void;
  onSaveEdit: (updates: {
    quantity: number | null;
    unit: string | null;
  }) => Promise<boolean>;
  onToggleRecurring: () => void;
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

function getLocaleTag(locale: string): string {
  return locale === "sk" ? "sk-SK" : "en-US";
}

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
  const parsed = parseStoredNumber(quantity);

  if (parsed === null) {
    return unit ?? "—";
  }

  return `${parsed.toLocaleString(getLocaleTag(locale), {
    maximumFractionDigits: parsed % 1 === 0 ? 0 : 2,
  })}${unit ? ` ${unit}` : ""}`;
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
  decreaseLabel,
  increaseLabel,
  deleteLabel,
  onIncrease,
  onDecrease,
  onDelete,
  onSaveEdit,
  onToggleRecurring,
}: PantryItemRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const quantityValue = parseStoredNumber(item.quantity) ?? 0;
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
                {quantityCaption}
              </p>
              <p className="text-lg font-bold text-eatrivo-purple">
                {isPendingQuantity ? (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : (
                  formatQuantity(item.quantity, item.unit, locale)
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
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

              <button
                type="button"
                onClick={() => setIsEditing((current) => !current)}
                disabled={isSavingEdit}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2",
                  isEditing
                    ? "border-eatrivo-purple bg-eatrivo-purple text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-eatrivo-blue/10 hover:text-eatrivo-blue",
                )}
                aria-label={editLabel}
                aria-pressed={isEditing}
                title={editLabel}
              >
                <Pencil className="h-4 w-4" />
              </button>

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

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
            animate={
              shouldReduceMotion
                ? undefined
                : { opacity: isEditing ? 1 : 0, height: isEditing ? "auto" : 0 }
            }
            className={cn(
              "overflow-hidden",
              isEditing ? "pt-1" : "pointer-events-none",
            )}
          >
            <div className="rounded-2xl border border-gray-100 bg-eatrivo-white-secondary p-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-end">
                <div className="flex-1">
                  <p className="mb-2 text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                    {quantityLabel}
                  </p>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={draftQuantity}
                    onChange={(event) => setDraftQuantity(event.target.value)}
                    placeholder={quantityPlaceholder}
                    className="h-10 rounded-xl border-gray-200 bg-white"
                  />
                </div>

                <div className="flex-1">
                  <p className="mb-2 text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                    {unitLabel}
                  </p>
                  <Select value={draftUnit} onValueChange={setDraftUnit}>
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white shadow-none">
                      <SelectValue placeholder={unitPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {PANTRY_UNIT_OPTIONS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftQuantity(item.quantity ?? "");
                      setDraftUnit(item.unit ?? "ks");
                      setIsEditing(false);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    aria-label={cancelLabel}
                    title={cancelLabel}
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={async () => {
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
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-eatrivo-purple text-white transition-colors hover:bg-eatrivo-purple/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                    aria-label={saveLabel}
                    title={saveLabel}
                  >
                    {isSavingEdit ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.article>
  );
}
