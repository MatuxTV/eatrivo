"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NewPantryItem } from "@/hooks/usePantry";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { PANTRY_UNIT_OPTIONS } from "@/lib/units";

interface AddPantryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: NewPantryItem[]) => Promise<boolean>;
}

interface BatchDraftItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  expiryDate: string;
}

function createBatchDraftItem(): BatchDraftItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: "",
    unit: "ks",
    category: "other",
    expiryDate: "",
  };
}

export default function AddPantryItemModal({
  isOpen,
  onClose,
  onAddItems,
}: AddPantryItemModalProps) {
  const t = useTranslations("pantry");
  const shouldReduceMotion = useReducedMotion();
  const triggerHaptic = useHapticFeedback();
  const [batchItems, setBatchItems] = useState<BatchDraftItem[]>([
    createBatchDraftItem(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const categories = useMemo(
    () => [
      { value: "dairy", label: t("categories.dairy") },
      { value: "meat_fish", label: t("categories.meat_fish") },
      { value: "fruit", label: t("categories.fruit") },
      { value: "vegetables", label: t("categories.vegetables") },
      { value: "grains", label: t("categories.grains") },
      { value: "eggs", label: t("categories.eggs") },
      { value: "condiments", label: t("categories.condiments") },
      { value: "beverages", label: t("categories.beverages") },
      { value: "nuts_seeds", label: t("categories.nuts_seeds") },
      { value: "other", label: t("categories.other") },
    ],
    [t],
  );

  const reset = () => {
    setBatchItems([createBatchDraftItem()]);
  };

  const updateBatchItem = (
    id: string,
    field: keyof Omit<BatchDraftItem, "id">,
    value: string,
  ) => {
    setBatchItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addBatchRow = () => {
    setBatchItems((currentItems) => [...currentItems, createBatchDraftItem()]);
  };

  const removeBatchRow = (id: string) => {
    setBatchItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter((item) => item.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const itemsToAdd = batchItems
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity ? parseFloat(item.quantity) : null,
        unit: item.unit || null,
        category: item.category,
        expiryDate: item.expiryDate ? `${item.expiryDate}T12:00:00` : null,
      }));

    if (itemsToAdd.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onAddItems(itemsToAdd);
      if (!success) {
        return;
      }

      triggerHaptic("success");
      reset();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filledItemCount = batchItems.filter(
    (item) => item.name.trim().length > 0,
  ).length;

  const submitLabel =
    filledItemCount > 2 ? t("submit_batch") : t("submit_single");

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
            transition={
              shouldReduceMotion
                ? undefined
                : { type: "spring", stiffness: 400, damping: 30 }
            }
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {t("modal_title")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-eatrivo-purple/15 bg-eatrivo-purple/5 px-4 py-3 text-sm text-gray-600">
                <p className="font-medium text-gray-800">{t("batch_title")}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {t("batch_description")}
                </p>
              </div>

              <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                {batchItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-eatrivo-purple text-xs text-white">
                          {index + 1}
                        </div>
                        {t("batch_item_label", { index: index + 1 })}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBatchRow(item.id)}
                        disabled={batchItems.length === 1}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-gray-700">
                          {t("field_name")} *
                        </Label>
                        <Input
                          value={item.name}
                          onChange={(e) =>
                            updateBatchItem(item.id, "name", e.target.value)
                          }
                          placeholder={t("field_name_placeholder")}
                          autoFocus={index === 0}
                          className="w-full bg-white"
                        />
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Label className="mb-1.5 block text-sm font-medium text-gray-700">
                            {t("field_quantity")}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) =>
                              updateBatchItem(item.id, "quantity", e.target.value)
                            }
                            placeholder={t("field_quantity_placeholder")}
                            className="w-full bg-white"
                          />
                        </div>
                        <div className="w-28">
                          <Label className="mb-1.5 block text-sm font-medium text-gray-700">
                            {t("field_unit")}
                          </Label>
                          <Select
                            value={item.unit}
                            onValueChange={(value) =>
                              updateBatchItem(item.id, "unit", value)
                            }
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PANTRY_UNIT_OPTIONS.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-gray-700">
                          {t("field_category")}
                        </Label>
                        <Select
                          value={item.category}
                          onValueChange={(value) =>
                            updateBatchItem(item.id, "category", value)
                          }
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-gray-700">
                          {t("field_expiry")}{" "}
                          <span className="text-gray-400 font-normal">
                            ({t("field_optional")})
                          </span>
                        </Label>
                        <Input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) =>
                            updateBatchItem(item.id, "expiryDate", e.target.value)
                          }
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addBatchRow}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-eatrivo-purple/30 bg-eatrivo-purple/5 px-4 py-3 text-sm font-medium text-eatrivo-purple transition-colors hover:bg-eatrivo-purple/10"
              >
                <Plus className="h-4 w-4" />
                {t("batch_add_row")}
              </button>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  {t("quick_add_cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || filledItemCount === 0}
                  className="flex-1 bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      {submitLabel}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
