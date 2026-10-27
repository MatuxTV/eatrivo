"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import InlineEditPanel from "@/components/inline-edit/InlineEditPanel";
import QuantityUnitEditor from "@/components/inline-edit/QuantityUnitEditor";
import { cn } from "@/lib/utils/utils";
import { getCategoryTint, splitCategoryLabel } from "@/app/pantry/components/categoryVisuals";
import type { ShoppingListItem, useShoppingList } from "@/hooks/useShoppingList";

interface ShoppingCategoryCardProps {
  category: string;
  items: ShoppingListItem[];
  shopping: ReturnType<typeof useShoppingList>;
}

export default function ShoppingCategoryCard({ category, items, shopping }: ShoppingCategoryCardProps) {
  const t = useTranslations("home");
  const pantryT = useTranslations("pantry");

  const {
    checkedItemIds,
    isRemovingItemId,
    editingQuantityItemId,
    quantityDraftValue,
    setQuantityDraftValue,
    quantityDraftUnit,
    setQuantityDraftUnit,
    isUpdatingQuantityItemId,
    toggleCheckItem,
    closeQuantityEditor,
    openQuantityEditor,
    handleSaveQuantity,
    handleRemoveItem,
    getShoppingCategoryLabel,
    localizeAmount,
  } = shopping;

  const { emoji, name } = splitCategoryLabel(getShoppingCategoryLabel(category));
  const checkedCount = items.filter((item) => checkedItemIds.has(item.id ?? "")).length;
  const isCategoryDone = checkedCount === items.length && items.length > 0;
  // Checked items sink to the bottom of their category.
  const sortedItems = [...items].sort(
    (a, b) => Number(checkedItemIds.has(a.id ?? "")) - Number(checkedItemIds.has(b.id ?? "")),
  );

  return (
    <section className="overflow-hidden rounded-[20px] border border-[#ECE8F5] bg-white">
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-1.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg",
            getCategoryTint(category),
          )}
          aria-hidden="true"
        >
          {emoji ?? "📦"}
        </div>
        <h3 className="min-w-0 flex-1 truncate text-base font-bold text-gray-900">{name}</h3>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-bold",
            isCategoryDone ? "bg-[#EAF8EF] text-green-700" : "bg-gray-100 text-gray-500",
          )}
        >
          {checkedCount}/{items.length}
        </span>
      </div>

      <ul>
        <AnimatePresence initial={false} mode="popLayout">
          {sortedItems.map((item, index) => {
            const isChecked = checkedItemIds.has(item.id ?? "");
            const isEditingQuantity = editingQuantityItemId === item.id;
            const amount = item.quantity ? localizeAmount(item) : null;

            return (
              <motion.li
                key={item.id ?? item.name}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                // Items without an id are still being saved: shown, not yet editable.
                className={cn(
                  "transition-opacity",
                  index > 0 && "border-t border-gray-100",
                  !item.id && "pointer-events-none opacity-60",
                )}
                aria-busy={!item.id}
              >
                <div className="flex items-center gap-1 py-1 pr-2 pl-1.5">
                  <button
                    type="button"
                    onClick={() => item.id && toggleCheckItem(item.id)}
                    aria-pressed={isChecked}
                    aria-label={t(
                      isChecked ? "basic.shoppingList.uncheckItemLabel" : "basic.shoppingList.checkItemLabel",
                      { name: item.name },
                    )}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/40"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                      <motion.span
                        whileTap={{ scale: 0.85 }}
                        className={cn(
                          "flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 transition-colors duration-200",
                          isChecked ? "border-eatrivo-green bg-eatrivo-green" : "border-gray-300 bg-white",
                        )}
                      >
                        <AnimatePresence>
                          {isChecked ? (
                            <motion.span
                              key="check"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 22 }}
                            >
                              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </motion.span>
                    </span>
                    <span
                      className={cn(
                        "min-w-0 break-words text-[15px] font-semibold leading-snug transition-colors duration-200",
                        isChecked ? "text-gray-400 line-through" : "text-gray-900",
                      )}
                    >
                      {item.name}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!item.id) return;
                      if (isEditingQuantity) {
                        closeQuantityEditor();
                        return;
                      }
                      openQuantityEditor(item.id, item.quantity, item.quantityValue, item.unit);
                    }}
                    aria-label={t("basic.shoppingList.editQuantityButton")}
                    aria-expanded={isEditingQuantity}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eatrivo-purple/40",
                      isChecked
                        ? "bg-gray-100 text-gray-400"
                        : amount
                          ? "bg-[#F3EEFE] text-eatrivo-purple"
                          : "border border-dashed border-gray-200 text-gray-400",
                    )}
                  >
                    {amount ?? "+"}
                  </button>
                  <button
                    type="button"
                    aria-label={t("basic.shoppingList.removeItemLabel")}
                    onClick={() => item.id && handleRemoveItem(item.id)}
                    disabled={isRemovingItemId === item.id}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>

                <InlineEditPanel
                  isOpen={isEditingQuantity}
                  className="px-3.5 pb-3"
                  panelClassName="border-gray-100 bg-none bg-eatrivo-white-secondary shadow-none"
                >
                  <QuantityUnitEditor
                    inputId={`shopping-item-quantity-${item.id}`}
                    quantityLabel={pantryT("field_quantity")}
                    unitLabel={pantryT("field_unit")}
                    quantityPlaceholder={pantryT("field_quantity_placeholder")}
                    unitPlaceholder={pantryT("field_unit")}
                    cancelLabel={t("common.cancel", { defaultValue: "Zrušiť" })}
                    saveLabel={t("common.save", { defaultValue: "Uložiť" })}
                    quantityValue={quantityDraftValue}
                    unitValue={quantityDraftUnit}
                    isSaving={isUpdatingQuantityItemId === item.id}
                    onQuantityChange={setQuantityDraftValue}
                    onUnitChange={setQuantityDraftUnit}
                    onCancel={closeQuantityEditor}
                    onSave={() => {
                      if (!item.id) return;
                      void handleSaveQuantity(item.id);
                    }}
                    onQuantityKeyDown={async (event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        closeQuantityEditor();
                        return;
                      }
                      if (event.key !== "Enter" || !item.id) return;
                      event.preventDefault();
                      await handleSaveQuantity(item.id);
                    }}
                  />
                </InlineEditPanel>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
