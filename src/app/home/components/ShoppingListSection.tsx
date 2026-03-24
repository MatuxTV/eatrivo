"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Pencil,
  Milk,
  Beef,
  Apple,
  Carrot,
  Wheat,
  Egg,
  Droplets,
  CupSoda,
  Nut,
  Package,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import InlineEditPanel from "./InlineEditPanel";
import InlineEditToggleButton from "./InlineEditToggleButton";
import QuantityUnitEditor from "./QuantityUnitEditor";
import type { useShoppingList } from "@/hooks/useShoppingList";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SHOPPING_CATEGORY_ICONS: Record<string, React.ElementType> = {
  dairy: Milk,
  meat_fish: Beef,
  fruit: Apple,
  vegetables: Carrot,
  grains: Wheat,
  eggs: Egg,
  condiments: Droplets,
  beverages: CupSoda,
  nuts_seeds: Nut,
  other: Package,
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type ShoppingListHook = ReturnType<typeof useShoppingList>;

interface ShoppingListSectionProps {
  shopping: ShoppingListHook;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShoppingListSection({ shopping }: ShoppingListSectionProps) {
  const t = useTranslations("home");
  const pantryT = useTranslations("pantry");

  const {
    shoppingListItems,
    currentShoppingList,
    isCompletingShoppingList,
    checkedItemIds,
    isEditingTitle,
    editTitleValue,
    setEditTitleValue,
    isRemovingItemId,
    editingQuantityItemId,
    quantityDraftValue,
    setQuantityDraftValue,
    quantityDraftUnit,
    setQuantityDraftUnit,
    isUpdatingQuantityItemId,
    titleInputRef,
    totalChecked,
    allItemsChecked,
    shoppingListItemsByCategory,
    shoppingListCategories,
    toggleCheckItem,
    closeQuantityEditor,
    openQuantityEditor,
    handleSaveQuantity,
    handleRemoveItem,
    handleStartEditTitle,
    cancelEditTitle,
    handleSaveTitle,
    handleCompleteShoppingList,
    getShoppingCategoryLabel,
    localizeAmount,
  } = shopping;

  return (
    <motion.div
      key="home-shopping-list"
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.985 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 rounded-2xl border border-eatrivo-purple/10 bg-white p-4 shadow-sm sm:p-6 md:p-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.22 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
      >
        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                ref={titleInputRef}
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={() => { void handleSaveTitle(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveTitle();
                  if (e.key === "Escape") cancelEditTitle();
                }}
                className="w-full rounded-lg border border-eatrivo-purple/30 bg-eatrivo-purple/5 px-3 py-1.5 text-xl font-semibold text-gray-900 outline-none focus:border-eatrivo-purple focus:ring-2 focus:ring-eatrivo-purple/20 transition-all"
                maxLength={200}
              />
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <h2
                className="text-xl font-semibold text-gray-900 cursor-pointer"
                onClick={currentShoppingList?.id ? handleStartEditTitle : undefined}
                role={currentShoppingList?.id ? "button" : undefined}
                tabIndex={currentShoppingList?.id ? 0 : undefined}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && currentShoppingList?.id) {
                    e.preventDefault();
                    handleStartEditTitle();
                  }
                }}
              >
                {currentShoppingList?.title || t("greeting.actions.shoppingList")}
              </h2>
              {currentShoppingList?.id ? (
                <button
                  type="button"
                  onClick={handleStartEditTitle}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  aria-label={t("basic.shoppingList.editTitleLabel")}
                >
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              ) : null}
            </div>
          )}
          <p className="mt-2 text-sm text-gray-500">
            {t("basic.shoppingList.description")}
          </p>
        </div>
        <div className="inline-flex w-fit shrink-0 rounded-full bg-eatrivo-purple/10 px-3 py-1 text-xs font-semibold text-eatrivo-purple">
          {shoppingListItems.length} {t("basic.shoppingList.itemsCount")}
        </div>
      </motion.div>

      {/* Progress bar */}
      {shoppingListItems.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.22 }}
          className="mt-5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">
              {t("basic.shoppingList.progressLabel", {
                checked: totalChecked,
                total: shoppingListItems.length,
              })}
            </span>
            {allItemsChecked ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="text-xs font-bold text-eatrivo-green"
              >
                {t("basic.shoppingList.allDone")}
              </motion.span>
            ) : null}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className="h-full rounded-full bg-eatrivo-green"
              initial={{ width: "0%" }}
              animate={{
                width:
                  shoppingListItems.length > 0
                    ? `${(totalChecked / shoppingListItems.length) * 100}%`
                    : "0%",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </motion.div>
      ) : null}

      {/* Done button */}
      {shoppingListItems.length > 0 && currentShoppingList?.id ? (
        <div className="mt-4 flex">
          <Button
            type="button"
            onClick={() => { void handleCompleteShoppingList(); }}
            disabled={isCompletingShoppingList || !allItemsChecked}
            className={`h-11 w-full rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-300 sm:ml-auto sm:h-auto sm:w-auto ${
              allItemsChecked
                ? "bg-eatrivo-green hover:bg-eatrivo-green/90 shadow-[0_4px_20px_rgba(34,197,94,0.3)]"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {isCompletingShoppingList
              ? t("basic.shoppingList.completing")
              : t("basic.shoppingList.doneButton")}
          </Button>
        </div>
      ) : null}

      {/* Items by category */}
      {shoppingListItems.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.24 }}
          className="mt-6 space-y-5 sm:space-y-6"
        >
          {shoppingListCategories.map((category) => {
            const Icon = SHOPPING_CATEGORY_ICONS[category] ?? Package;
            const categoryItems = shoppingListItemsByCategory[category] ?? [];
            const categoryChecked = categoryItems.filter((item) =>
              checkedItemIds.has(item.id ?? ""),
            ).length;
            const sortedCategoryItems = [...categoryItems].sort((a, b) => {
              const aChecked = checkedItemIds.has(a.id ?? "") ? 1 : 0;
              const bChecked = checkedItemIds.has(b.id ?? "") ? 1 : 0;
              return aChecked - bChecked;
            });

            return (
              <div key={category} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5 px-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-eatrivo-purple/10 text-eatrivo-purple">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-black tracking-tight text-[#1a1a2e]">
                    {getShoppingCategoryLabel(category)}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      categoryChecked === categoryItems.length && categoryItems.length > 0
                        ? "bg-eatrivo-green/10 text-eatrivo-green"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {categoryChecked}/{categoryItems.length}
                  </span>
                </div>

                <div className="grid gap-2">
                  <AnimatePresence mode="popLayout">
                    {sortedCategoryItems.map((item) => {
                      const itemKey = item.id ?? item.name;
                      const isChecked = checkedItemIds.has(item.id ?? "");
                      const isEditingQuantity = editingQuantityItemId === item.id;
                      const isUpdatingQuantity = isUpdatingQuantityItemId === item.id;

                      return (
                        <motion.div
                          key={itemKey}
                          layout
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          className={`flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors duration-200 sm:items-center sm:px-4 ${
                            isChecked
                              ? "border-eatrivo-green/20 bg-eatrivo-green/5"
                              : "border-gray-100 bg-gray-50"
                          } ${
                            isEditingQuantity
                              ? "border-eatrivo-purple/20 bg-white ring-2 ring-eatrivo-purple/10"
                              : ""
                          }`}
                        >
                          {/* Check button */}
                          <button
                            type="button"
                            aria-label={isChecked ? "Uncheck item" : "Check item"}
                            onClick={() => toggleCheckItem(item.id ?? "")}
                            className="flex h-11 w-11 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                          >
                            <motion.span
                              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                                isChecked
                                  ? "border-eatrivo-green bg-eatrivo-green"
                                  : "border-gray-300 bg-white"
                              }`}
                              whileTap={{ scale: 0.85 }}
                            >
                              <AnimatePresence mode="wait">
                                {isChecked ? (
                                  <motion.span
                                    key="check"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                  >
                                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                                  </motion.span>
                                ) : null}
                              </AnimatePresence>
                            </motion.span>
                          </button>

                          <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-3">
                            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                              <span
                                className={`min-w-0 break-words pr-1 text-sm font-medium leading-snug transition-all duration-200 sm:truncate sm:pr-0 ${
                                  isChecked ? "text-gray-400 line-through" : "text-gray-800"
                                }`}
                              >
                                {item.name}
                              </span>
                              <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-1.5">
                                {item.quantity && !isEditingQuantity ? (
                                  <span
                                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                                      isChecked
                                        ? "bg-gray-100 text-gray-400"
                                        : "bg-eatrivo-purple/10 text-eatrivo-purple"
                                    }`}
                                  >
                                    {localizeAmount(item)}
                                  </span>
                                ) : null}
                                <InlineEditToggleButton
                                  label={t("basic.shoppingList.editQuantityButton", {
                                    defaultValue: "Upraviť množstvo",
                                  })}
                                  isActive={isEditingQuantity}
                                  onClick={() => {
                                    if (!item.id) return;
                                    if (isEditingQuantity) {
                                      closeQuantityEditor();
                                      return;
                                    }
                                    openQuantityEditor(item.id, item.quantity, item.quantityValue, item.unit);
                                  }}
                                  className={`h-10 w-10 shrink-0 ${
                                    isChecked ? "border-gray-200 text-gray-400" : ""
                                  }`}
                                />
                                <button
                                  type="button"
                                  aria-label={t("basic.shoppingList.removeItemLabel")}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleRemoveItem(item.id ?? "");
                                  }}
                                  disabled={isRemovingItemId === item.id}
                                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:h-7 sm:w-7 ${
                                    isRemovingItemId === item.id
                                      ? "bg-red-100 cursor-not-allowed"
                                      : "hover:bg-red-50 active:bg-red-100 active:scale-90"
                                  }`}
                                >
                                  <X
                                    className={`h-3.5 w-3.5 transition-colors ${
                                      isRemovingItemId === item.id
                                        ? "text-red-300"
                                        : "text-gray-400 hover:text-red-500"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            <InlineEditPanel
                              isOpen={isEditingQuantity}
                              className="pt-1"
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
                                isSaving={isUpdatingQuantity}
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
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.24 }}
          className="mt-6 rounded-2xl border border-dashed border-eatrivo-purple/20 bg-eatrivo-purple/5 px-6 py-10 text-center"
        >
          <p className="text-sm font-semibold text-gray-900">
            {t("basic.shoppingList.emptyTitle")}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {t("basic.shoppingList.emptyDescription")}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
