"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Plus } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { NewPantryItem } from "@/hooks/usePantry";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import PantryEditableItemCard, {
  type EditablePantryFormItem,
} from "./PantryEditableItemCard";

interface AddPantryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: NewPantryItem[]) => Promise<boolean>;
}

type BatchDraftItem = EditablePantryFormItem;

function createBatchDraftItem(): BatchDraftItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: "",
    unit: "ks",
    category: "other",
    expiryDate: "",
    trackingMode: "quantity",
    inStock: true,
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

  function reset() {
    setBatchItems([createBatchDraftItem()]);
  }

  function updateBatchItem(
    id: string,
    field: keyof Omit<BatchDraftItem, "id">,
    value: BatchDraftItem[keyof Omit<BatchDraftItem, "id">],
  ) {
    setBatchItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addBatchRow() {
    setBatchItems((currentItems) => [...currentItems, createBatchDraftItem()]);
  }

  function removeBatchRow(id: string) {
    setBatchItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter((item) => item.id !== id);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const itemsToAdd = batchItems
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        name: item.name.trim(),
        trackingMode: item.trackingMode,
        ...(item.trackingMode === "availability"
          ? { inStock: item.inStock }
          : {}),
        quantity:
          item.trackingMode === "quantity" && item.quantity
            ? parseFloat(item.quantity)
            : null,
        unit:
          item.trackingMode === "quantity" && item.quantity
            ? item.unit || null
            : null,
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
  }

  const filledItemCount = batchItems.filter(
    (item) => item.name.trim().length > 0,
  ).length;
  const submitLabel =
    filledItemCount > 2 ? t("submit_batch") : t("submit_single");

  return (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <>
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={
              shouldReduceMotion
                ? undefined
                : { opacity: 0, scale: 0.98, y: 32 }
            }
            animate={
              shouldReduceMotion
                ? undefined
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              shouldReduceMotion
                ? undefined
                : { opacity: 0, scale: 0.98, y: 32 }
            }
            transition={
              shouldReduceMotion
                ? undefined
                : { type: "spring", stiffness: 400, damping: 30 }
            }
            className="fixed inset-x-0 bottom-0 z-[80] flex max-h-[min(82dvh,760px)] w-full flex-col rounded-t-[1.75rem] bg-white shadow-[0_-16px_50px_rgba(17,24,39,0.18)] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[90vh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem]"
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-200" />
            </div>

            <div className="flex items-center justify-between px-5 pb-4 pt-4 sm:px-6 sm:pt-6">
              <div className="pr-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {t("modal_title")}
                </h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-eatrivo-purple/70 sm:hidden">
                  {t("batch_title")}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
                <div className="mt-4 space-y-3 pr-1">
                  {batchItems.map((item, index) => (
                    <PantryEditableItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      autoFocus={index === 0}
                      canRemove={batchItems.length > 1}
                      categories={categories}
                      labels={{
                        itemLabel: t("batch_item_label", { index: index + 1 }),
                        fieldName: t("field_name"),
                        fieldNamePlaceholder: t("field_name_placeholder"),
                        fieldQuantity: t("field_quantity"),
                        fieldQuantityPlaceholder: t("field_quantity_placeholder"),
                        fieldUnit: t("field_unit"),
                        fieldCategory: t("field_category"),
                        fieldExpiry: t("field_expiry"),
                        fieldOptional: t("field_optional"),
                        trackingModeToggleLabel: t("tracking_mode_toggle_label"),
                        trackingModeHelpText: t("tracking_mode_toggle_help"),
                        fieldAvailability: t("field_availability"),
                        availableLabel: t("availability_in_stock"),
                        unavailableLabel: t("availability_out_of_stock"),
                      }}
                      onChange={updateBatchItem}
                      onRemove={removeBatchRow}
                      showTrackingControls
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addBatchRow}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-eatrivo-purple/30 bg-eatrivo-purple/5 px-4 py-3 text-sm font-medium text-eatrivo-purple transition-colors hover:bg-eatrivo-purple/10"
                >
                  <Plus className="h-4 w-4" />
                  {t("batch_add_row")}
                </button>
              </div>

              <div className="border-t border-gray-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={onClose}
                    className="flex-1 border-2 border-eatrivo-black-primary/10 bg-eatrivo-white-primary text-eatrivo-black-primary"
                  >
                    {t("quick_add_cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || filledItemCount === 0}
                    className="flex-1 bg-eatrivo-purple text-white hover:bg-eatrivo-purple/90"
                  >
                    {isSubmitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <Plus className="mr-1 h-4 w-4" />
                        {submitLabel}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
